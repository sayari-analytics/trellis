import type { EdgeRef, NodeRef } from '@sayari/trellis'
import { activeEdges, edgeSource, edgeTarget, type SugiyamaState } from './state'

export type LayeredNode = {
  ref: number
  originalRef?: NodeRef
  sourceEdgeRef?: EdgeRef
  dummy: boolean
  bundleId?: string
  rank: number
  order: number
  breadth: number
  x: number
  y: number
}

export type ProperEdge = {
  id: string
  originalEdgeRef: EdgeRef
  source: number
  target: number
  weight: number
  chainIndex: number
  confluentBundleId?: string
}

export type Bundle = {
  id: string
  edgeRefs: EdgeRef[]
  ranks: [number, number]
}

export type ConfluentBundlingOptions = {
  enabled?: boolean
  minBicliqueEdges?: number
  maxBundlesPerLayerPair?: number
}

export type ConfluentBundle = {
  id: string
  edgeRefs: EdgeRef[]
  properEdgeIndexes: number[]
  sourceRefs: number[]
  targetRefs: number[]
  ranks: [number, number]
  center?: { x: number; y: number }
}

export type LayeredGraph = {
  nodes: LayeredNode[]
  edges: ProperEdge[]
  layers: LayeredNode[][]
  nodeByRef: (LayeredNode | undefined)[]
  bundles: Bundle[]
  confluentBundles: ConfluentBundle[]
  confluentRouteBundles: (ConfluentBundle | undefined)[][]
}

// Phase 3 support: split long edges into dummy chains so ordering can minimize crossings per adjacent layer.
export const buildLayeredGraph = (
  state: SugiyamaState,
  bundling = true,
  confluentBundling: ConfluentBundlingOptions | false = false
): LayeredGraph => {
  const layers: LayeredNode[][] = []
  const nodes: LayeredNode[] = []
  const nodeByRef: (LayeredNode | undefined)[] = []

  for (const ref of state.graphState.nodes()) {
    const node: LayeredNode = {
      ref,
      originalRef: ref,
      dummy: false,
      rank: state.rank[ref] ?? 0,
      order: 0,
      breadth: state.breadth[ref],
      x: state.graphState.nodeX(ref),
      y: state.graphState.nodeY(ref)
    }
    nodes.push(node)
    nodeByRef[node.ref] = node
    if (layers[node.rank] === undefined) layers[node.rank] = []
    layers[node.rank].push(node)
  }

  const properEdges: ProperEdge[] = []
  const active = [...activeEdges(state)]
  const longEdges: EdgeRef[] = []
  for (const edgeRef of active) {
    const source = edgeSource(state, edgeRef)
    const target = edgeTarget(state, edgeRef)
    if ((state.rank[target] ?? 0) - (state.rank[source] ?? 0) > 1) longEdges.push(edgeRef)
  }
  const bundles = buildBundles(state, longEdges, bundling)
  const bundleByEdge: (string | undefined)[] = []
  for (const bundle of bundles) for (const edgeRef of bundle.edgeRefs) bundleByEdge[edgeRef] = bundle.id

  for (const edgeRef of active) {
    const source = edgeSource(state, edgeRef)
    const target = edgeTarget(state, edgeRef)
    const sourceRank = state.rank[source] ?? 0
    const targetRank = state.rank[target] ?? 0
    const chain: number[] = [source]
    for (let rank = sourceRank + 1; rank < targetRank; rank++) {
      const dummyRef = nodeByRef.length
      const dummy: LayeredNode = {
        ref: dummyRef,
        sourceEdgeRef: edgeRef,
        dummy: true,
        bundleId: bundleByEdge[edgeRef],
        rank,
        order: 0,
        breadth: 1,
        x: 0,
        y: 0
      }
      nodes.push(dummy)
      nodeByRef[dummyRef] = dummy
      if (layers[rank] === undefined) layers[rank] = []
      layers[rank].push(dummy)
      chain.push(dummyRef)
    }
    chain.push(target)
    state.routeNodeRefs[edgeRef] = chain

    for (let index = 0; index < chain.length - 1; index++) {
      properEdges.push({
        id: `${String(state.graphState.edgeId(edgeRef))}:${index}`,
        originalEdgeRef: edgeRef,
        source: chain[index],
        target: chain[index + 1],
        weight: state.weight[edgeRef],
        chainIndex: index
      })
    }
  }

  const { bundles: confluentBundles, routeBundles: confluentRouteBundles } = buildConfluentBundles(
    properEdges,
    nodeByRef,
    confluentBundling
  )

  for (const layer of layers) {
    layer.sort((a, b) => {
      const aKey = a.dummy ? String(a.sourceEdgeRef) : String(a.ref)
      const bKey = b.dummy ? String(b.sourceEdgeRef) : String(b.ref)
      return aKey.localeCompare(bKey)
    })
    for (let order = 0; order < layer.length; order++) layer[order].order = order
  }

  return { nodes, edges: properEdges, layers, nodeByRef, bundles, confluentBundles, confluentRouteBundles }
}

const buildBundles = (state: SugiyamaState, longEdges: EdgeRef[], enabled: boolean): Bundle[] => {
  if (!enabled) return []

  const exact = new Map<string, { edgeRefs: EdgeRef[]; ranks: [number, number] }>()
  const outgoing = new Map<string, { edgeRefs: EdgeRef[]; ranks: [number, number] }>()
  const incoming = new Map<string, { edgeRefs: EdgeRef[]; ranks: [number, number] }>()
  const append = (
    groups: Map<string, { edgeRefs: EdgeRef[]; ranks: [number, number] }>,
    key: string,
    edgeRef: EdgeRef,
    ranks: [number, number]
  ) => {
    const existing = groups.get(key)
    if (existing === undefined) groups.set(key, { edgeRefs: [edgeRef], ranks })
    else existing.edgeRefs.push(edgeRef)
  }

  for (const edgeRef of longEdges) {
    const source = edgeSource(state, edgeRef)
    const target = edgeTarget(state, edgeRef)
    const sourceRank = state.rank[source] ?? 0
    const targetRank = state.rank[target] ?? 0
    const ranks: [number, number] = [sourceRank, targetRank]
    append(exact, `${sourceRank}:${targetRank}:exact:${String(source)}:${String(target)}`, edgeRef, ranks)
    append(outgoing, `${sourceRank}:${targetRank}:out:${String(source)}`, edgeRef, ranks)
    append(incoming, `${sourceRank}:${targetRank}:in:${String(target)}`, edgeRef, ranks)
  }

  const selected = new Set<EdgeRef>()
  const bundles: Bundle[] = []
  const select = (groups: Map<string, { edgeRefs: EdgeRef[]; ranks: [number, number] }>) => {
    for (const [key, group] of groups) {
      const edgeRefs: EdgeRef[] = []
      for (const ref of group.edgeRefs) {
        if (!selected.has(ref)) edgeRefs.push(ref)
      }
      if (edgeRefs.length < 2) continue
      for (const ref of edgeRefs) selected.add(ref)
      bundles.push({ id: `bundle:${key}`, edgeRefs, ranks: group.ranks })
    }
  }

  select(exact)
  select(outgoing)
  select(incoming)
  return bundles
}

type ConfluentCandidate = {
  id: string
  edgeIndexes: number[]
  sourceRefs: number[]
  targetRefs: number[]
  ranks: [number, number]
  score: number
}

const appendCandidate = (
  candidates: ConfluentCandidate[],
  id: string,
  edgeIndexes: number[],
  sourceRefs: number[],
  targetRefs: number[],
  ranks: [number, number]
) => {
  if (edgeIndexes.length < 2) return
  candidates.push({
    id,
    edgeIndexes,
    sourceRefs,
    targetRefs,
    ranks,
    score: sourceRefs.length * targetRefs.length - (sourceRefs.length + targetRefs.length)
  })
}

const buildConfluentBundles = (
  edges: ProperEdge[],
  nodeByRef: (LayeredNode | undefined)[],
  options: ConfluentBundlingOptions | false
): { bundles: ConfluentBundle[]; routeBundles: (ConfluentBundle | undefined)[][] } => {
  if (options === false || options.enabled === false) return { bundles: [], routeBundles: [] }

  const minBicliqueEdges = options.minBicliqueEdges ?? 8
  const maxBundlesPerLayerPair = options.maxBundlesPerLayerPair ?? 16
  const candidates: ConfluentCandidate[] = []
  const layerPairGroups = new Map<string, number[]>()

  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index]
    const source = nodeByRef[edge.source]
    const target = nodeByRef[edge.target]
    if (source === undefined || target === undefined) continue
    const pairKey = `${source.rank}:${target.rank}`
    const byPair = layerPairGroups.get(pairKey)
    if (byPair === undefined) layerPairGroups.set(pairKey, [index])
    else byPair.push(index)
  }

  for (const [pairKey, edgeIndexes] of layerPairGroups) {
    const sourcesByTargets = new Map<string, { sourceRefs: number[]; edgeIndexes: number[]; targetRefs: number[] }>()
    const targetsBySource: number[][] = []
    for (const edgeIndex of edgeIndexes) {
      const edge = edges[edgeIndex]
      const targets = targetsBySource[edge.source]
      if (targets === undefined) targetsBySource[edge.source] = [edge.target]
      else targets.push(edge.target)
    }
    for (const sourceRefString of Object.keys(targetsBySource)) {
      const sourceRef = Number(sourceRefString)
      const targetRefs = targetsBySource[sourceRef]
      if (targetRefs.length < 2) continue
      targetRefs.sort((a, b) => a - b)
      const key = targetRefs.join(',')
      const group = sourcesByTargets.get(key)
      if (group === undefined) sourcesByTargets.set(key, { sourceRefs: [sourceRef], edgeIndexes: [], targetRefs })
      else group.sourceRefs.push(sourceRef)
    }
    for (const group of sourcesByTargets.values()) {
      if (group.sourceRefs.length < 2 || group.sourceRefs.length * group.targetRefs.length < minBicliqueEdges) continue
      for (const edgeIndex of edgeIndexes) {
        const edge = edges[edgeIndex]
        if (!group.sourceRefs.includes(edge.source) || !group.targetRefs.includes(edge.target)) continue
        group.edgeIndexes.push(edgeIndex)
      }
      const first = edges[group.edgeIndexes[0]]
      const source = nodeByRef[first.source]!
      const target = nodeByRef[first.target]!
      appendCandidate(
        candidates,
        `confluent:${pairKey}:biclique:${candidates.length}`,
        group.edgeIndexes,
        group.sourceRefs,
        group.targetRefs,
        [source.rank, target.rank]
      )
    }
  }

  candidates.sort((a, b) => b.score - a.score || b.edgeIndexes.length - a.edgeIndexes.length || a.id.localeCompare(b.id))
  const selectedEdges: boolean[] = []
  const selectedByLayerPair = new Map<string, number>()
  const bundles: ConfluentBundle[] = []
  const routeBundles: (ConfluentBundle | undefined)[][] = []

  for (const candidate of candidates) {
    const pairKey = `${candidate.ranks[0]}:${candidate.ranks[1]}`
    if ((selectedByLayerPair.get(pairKey) ?? 0) >= maxBundlesPerLayerPair) continue
    let overlaps = false
    for (const edgeIndex of candidate.edgeIndexes) {
      if (selectedEdges[edgeIndex]) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue

    const edgeRefs: EdgeRef[] = []
    const seenEdgeRefs = new Set<EdgeRef>()
    for (const edgeIndex of candidate.edgeIndexes) {
      selectedEdges[edgeIndex] = true
      const edge = edges[edgeIndex]
      edge.confluentBundleId = candidate.id
      if (!seenEdgeRefs.has(edge.originalEdgeRef)) {
        seenEdgeRefs.add(edge.originalEdgeRef)
        edgeRefs.push(edge.originalEdgeRef)
      }
    }

    const bundle: ConfluentBundle = {
      id: candidate.id,
      edgeRefs,
      properEdgeIndexes: candidate.edgeIndexes,
      sourceRefs: candidate.sourceRefs,
      targetRefs: candidate.targetRefs,
      ranks: candidate.ranks
    }
    for (const edgeIndex of candidate.edgeIndexes) {
      const edge = edges[edgeIndex]
      if (routeBundles[edge.originalEdgeRef] === undefined) routeBundles[edge.originalEdgeRef] = []
      routeBundles[edge.originalEdgeRef][edge.chainIndex] = bundle
    }
    bundles.push(bundle)
    selectedByLayerPair.set(pairKey, (selectedByLayerPair.get(pairKey) ?? 0) + 1)
  }

  return { bundles, routeBundles }
}

export const validateProperLayeredGraph = (layered: LayeredGraph) => {
  for (const edge of layered.edges) {
    const source = layered.nodeByRef[edge.source]
    const target = layered.nodeByRef[edge.target]
    if (source === undefined || target === undefined) throw new Error(`sugiyama: proper edge "${edge.id}" has a missing endpoint`)
    if (target.rank - source.rank !== 1) throw new Error(`sugiyama: proper edge "${edge.id}" does not connect adjacent layers`)
  }
}
