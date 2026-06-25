import type { Id, Node, Edge } from '@sayari/trellis'

/**
 * Graph -> layered-DAG adapters for the sankey layout. Unlike the hierarchy layout (which treats the
 * graph as undirected and builds a rooted spanning tree), the sankey layout is directed: flow runs from
 * `edge.source` -> `edge.target`. These helpers build a directed adjacency index, break cycles into a set
 * of "back edges", assign each node to a layer via longest-path layering, order the nodes within
 * each layer to minimize crossings (barycenter heuristic), and finally assign radius-aware coordinates.
 */

type DirectedPath<N extends Node, E extends Edge> = { edge: E; node: N }

type DirectedIndex<N extends Node, E extends Edge> = Record<Id, { node: N; outgoing: DirectedPath<N, E>[]; incoming: DirectedPath<N, E>[] }>

export type LayerAlignment = 'min' | 'max' | 'justify'
// TODO: support a centered alignment (d3-sankey's nodeCenter) for sourceless/sinkless nodes.

export const createDirectedIndex = <N extends Node, E extends Edge>(graph: { nodes: N[]; edges: E[] }): DirectedIndex<N, E> => {
  const index: DirectedIndex<N, E> = {}

  for (const node of graph.nodes) {
    index[node.id] = { node, outgoing: [], incoming: [] }
  }

  for (const edge of graph.edges) {
    const source = index[edge.source]
    const target = index[edge.target]
    if (source !== undefined && target !== undefined) {
      source.outgoing.push({ edge, node: target.node })
      target.incoming.push({ edge, node: source.node })
    }
  }

  return index
}

/**
 * A sankey is a layered DAG, but real graphs contain cycles. Walk the graph depth-first and flag every
 * edge that points back to a node currently on the traversal stack ("back edges"). These are excluded from
 * layering and ordering (so the rest of the pipeline sees an acyclic graph) but are returned to the caller
 * so a renderer can still draw them. Which edge in a cycle becomes the back edge is determined by node
 * insertion order — a stable, if arbitrary, heuristic.
 */
export const findBackEdges = <N extends Node, E extends Edge>(index: DirectedIndex<N, E>, nodes: N[]): Set<Id> => {
  const backEdges = new Set<Id>()
  const state = new Map<Id, 'active' | 'done'>()

  // Recursive DFS can overflow on very deep chains.
  const visit = (id: Id) => {
    state.set(id, 'active')
    for (const { edge, node } of index[id].outgoing) {
      const childState = state.get(node.id)
      if (childState === 'active') {
        backEdges.add(edge.id) // edge closes a cycle
      } else if (childState === undefined) {
        visit(node.id)
      }
    }
    state.set(id, 'done')
  }

  for (const node of nodes) {
    if (!state.has(node.id)) {
      visit(node.id)
    }
  }

  return backEdges
}

// Longest-path layering over acyclic edges.
export const assignLayers = <N extends Node, E extends Edge>(
  index: DirectedIndex<N, E>,
  nodes: N[],
  backEdges: Set<Id>,
  layerAlignment: LayerAlignment
): { layer: Map<Id, number>; maxLayer: number } => {
  const acyclic = (paths: DirectedPath<N, E>[]) => paths.filter(({ edge }) => !backEdges.has(edge.id))

  // longest path from a source (no acyclic incoming): depth = 1 + max(depth of predecessors)
  const fromSource = new Map<Id, number>()
  const computeFromSource = (id: Id): number => {
    const cached = fromSource.get(id)
    if (cached !== undefined) return cached
    fromSource.set(id, 0)
    let depth = 0
    for (const { node } of acyclic(index[id].incoming)) {
      depth = Math.max(depth, computeFromSource(node.id) + 1)
    }
    fromSource.set(id, depth)
    return depth
  }
  for (const node of nodes) computeFromSource(node.id)

  const maxLayer = nodes.reduce((max, node) => Math.max(max, fromSource.get(node.id)!), 0)

  if (layerAlignment === 'min') {
    return { layer: fromSource, maxLayer }
  }

  const toSink = new Map<Id, number>()
  const computeToSink = (id: Id): number => {
    const cached = toSink.get(id)
    if (cached !== undefined) return cached
    toSink.set(id, 0)
    let depth = 0
    for (const { node } of acyclic(index[id].outgoing)) {
      depth = Math.max(depth, computeToSink(node.id) + 1)
    }
    toSink.set(id, depth)
    return depth
  }
  for (const node of nodes) computeToSink(node.id)

  const layer = new Map<Id, number>()
  for (const node of nodes) {
    if (layerAlignment === 'max') {
      layer.set(node.id, maxLayer - toSink.get(node.id)!)
    } else {
      layer.set(node.id, acyclic(index[node.id].outgoing).length === 0 ? maxLayer : fromSource.get(node.id)!)
    }
  }

  return { layer, maxLayer }
}

/**
 * The layered graph operated on by ordering and coordinate assignment. Its vertices are not just the real
 * nodes: every edge spanning more than one layer is split into unit-length segments by inserting a "virtual
 * node" at each crossed layer. Virtual nodes never appear in the output node set — they exist so that (a)
 * the crossing-minimization barycenter can see long edges in every layer they cross, and (b) their final
 * positions become the edge's control points (so the points that minimize crossings are the points that
 * shape the curve). A `Vertex` is keyed by a string so real nodes and virtual nodes share the maps below.
 */
type Vertex<E extends Edge> = { kind: 'node'; id: Id } | { kind: 'virtual'; edge: E; step: number }

type LayeredGraph<E extends Edge> = {
  slots: string[][]
  vertices: Map<string, Vertex<E>>
  layerOfVertex: Map<string, number>
  neighbors: Map<string, { key: string; weight: number }[]>
  // per edge: the full chain of vertex keys from source to target inclusive (length 2 for short edges).
  // The interior keys (everything but the endpoints) are the edge's routing waypoints / control points.
  routes: { edge: E; keys: string[] }[]
}

const nodeKey = (id: Id) => `n:${id}`
const virtualKey = (edgeId: Id, step: number) => `v:${edgeId}:${step}`

/**
 * Build the layered graph: bucket real nodes into their layers (preserving input order), then split every
 * edge whose endpoints sit in different layers into a chain through one virtual node per intervening layer.
 * Edges within a single layer contribute no ordering adjacency (they can't reduce crossings). Back edges
 * are routed as forward edges are — their chain steps from the source's (higher) layer down to the
 * target's — so they bow through the layers they span rather than cutting straight back.
 */
export const buildLayeredGraph = <N extends Node, E extends Edge>(
  index: DirectedIndex<N, E>,
  nodes: N[],
  edges: E[],
  layerOf: Map<Id, number>,
  maxLayer: number,
  linkValue: (edge: E) => number
): LayeredGraph<E> => {
  const slots: string[][] = Array.from({ length: maxLayer + 1 }, () => [])
  const vertices = new Map<string, Vertex<E>>()
  const layerOfVertex = new Map<string, number>()
  const neighbors = new Map<string, { key: string; weight: number }[]>()
  const routes: { edge: E; keys: string[] }[] = []

  const addVertex = (key: string, vertex: Vertex<E>, layer: number) => {
    vertices.set(key, vertex)
    layerOfVertex.set(key, layer)
    neighbors.set(key, [])
    slots[layer].push(key)
  }
  const link = (a: string, b: string, weight: number) => {
    neighbors.get(a)!.push({ key: b, weight })
    neighbors.get(b)!.push({ key: a, weight })
  }

  for (const node of nodes) {
    addVertex(nodeKey(node.id), { kind: 'node', id: node.id }, layerOf.get(node.id)!)
  }

  for (const edge of edges) {
    if (index[edge.source] === undefined || index[edge.target] === undefined) continue
    const sourceLayer = layerOf.get(edge.source)!
    const targetLayer = layerOf.get(edge.target)!
    const keys = [nodeKey(edge.source)]

    if (sourceLayer !== targetLayer) {
      const step = sourceLayer < targetLayer ? 1 : -1
      const weight = linkValue(edge)
      let waypoint = 0
      for (let layer = sourceLayer + step; layer !== targetLayer; layer += step) {
        waypoint += 1
        const key = virtualKey(edge.id, waypoint)
        addVertex(key, { kind: 'virtual', edge, step: waypoint }, layer)
        keys.push(key)
      }
      keys.push(nodeKey(edge.target))
      for (let i = 0; i < keys.length - 1; i++) link(keys[i], keys[i + 1], weight)
    } else {
      keys.push(nodeKey(edge.target))
    }

    routes.push({ edge, keys })
  }

  return { slots, vertices, layerOfVertex, neighbors, routes }
}

/**
 * Order vertices within each layer to minimize edge crossings, using the iterative barycenter (weighted-
 * median) heuristic over the layered graph (real + virtual nodes): sweep across the layers, repositioning
 * each vertex to the link-value-weighted average within-layer index of its neighbors in the adjacent layer,
 * then re-sort. Sweep direction alternates each iteration so order propagates both ways. Vertices with no
 * neighbors in the reference layer keep their relative position; ties between two real nodes fall back to
 * the optional `sort` comparator. Mutates `graph.slots` in place.
 *
 * `linkValue` (baked into the neighbor weights) lets heavy links pull harder; the default `() => 1` reduces
 * this to a plain unweighted barycenter (Sugiyama).
 */
export const orderVertices = <N extends Node, E extends Edge>(
  index: DirectedIndex<N, E>,
  graph: LayeredGraph<E>,
  maxLayer: number,
  iterations: number,
  sort?: (a: N, b: N) => number
): void => {
  const { slots, vertices, layerOfVertex, neighbors } = graph

  const orderOf = new Map<string, number>()
  const reindex = () => {
    for (const layer of slots) layer.forEach((key, i) => orderOf.set(key, i))
  }
  reindex()

  const barycenter = (key: string, referenceLayer: number): number | undefined => {
    let sum = 0
    let weight = 0
    for (const { key: other, weight: w } of neighbors.get(key)!) {
      if (layerOfVertex.get(other) !== referenceLayer) continue
      sum += w * orderOf.get(other)!
      weight += w
    }
    return weight === 0 ? undefined : sum / weight
  }

  const tieBreak = (a: string, b: string): number => {
    if (!sort) return 0
    const va = vertices.get(a)!
    const vb = vertices.get(b)!
    return va.kind === 'node' && vb.kind === 'node' ? sort(index[va.id].node, index[vb.id].node) : 0
  }

  const sortLayer = (layer: string[], referenceLayer: number) => {
    const bary = new Map<string, number>()
    layer.forEach((key, i) => bary.set(key, barycenter(key, referenceLayer) ?? i))
    layer.sort((a, b) => {
      const delta = bary.get(a)! - bary.get(b)!
      return delta !== 0 ? delta : tieBreak(a, b)
    })
    reindex()
  }

  for (let i = 0; i < iterations; i++) {
    if (i % 2 === 0) {
      for (let l = 1; l <= maxLayer; l++) sortLayer(slots[l], l - 1) // left -> right
    } else {
      for (let l = maxLayer - 1; l >= 0; l--) sortLayer(slots[l], l + 1) // right -> left
    }
  }
}

// More breadth-alignment iterations straighten long-edge routes.
const ALIGNMENT_ITERATIONS = 16

/**
 * Assign each vertex a raw (depth, breadth) coordinate. `nodeBreadth` is the across-flow extent: `2 * radius`
 * for circles, value-scaled height for a sankey. The layout reads geometry only through this accessor — it
 * never touches `radius`/`width` directly, so the same code serves circle and rectangle nodes. Virtual nodes
 * are points (extent 0).
 * - depth (along the flow): layers are spaced by the largest half-extent on either side of the gap plus
 *   `layerGap`.
 * - breadth (across the flow): a naive per-layer stack would put each vertex at a different absolute breadth
 *   in every layer, so lanes and (especially) long-edge routes zigzag. Instead, after an initial stack we run
 *   an alignment pass: repeatedly pull each vertex toward the breadth of its neighbors in the adjacent layer,
 *   then resolve overlaps *while preserving the crossing-minimized order*. This straightens branch lanes and
 *   routes long edges down a consistent track, so their control points form a smooth curve rather than a saw.
 * Coordinates are anchor-agnostic; index.ts maps them onto world x/y and recenters.
 *
 * TODO (along-flow extent): layer spacing currently reuses the across-flow half-extent, which is exact for
 * circles (width == height) but not for rectangle nodes whose along-flow size differs. When rect nodes
 * land, add a second `nodeDepth` accessor for the along-flow extent rather than reusing `nodeBreadth`.
 */
export const assignCoordinates = <N extends Node, E extends Edge>(
  index: DirectedIndex<N, E>,
  graph: LayeredGraph<E>,
  nodeBreadth: (node: N) => number,
  layerGap: number,
  rowGap: number
): Map<string, { depth: number; breadth: number; extent: number }> => {
  const { slots, neighbors, layerOfVertex } = graph
  const maxLayer = slots.length - 1

  const extentOf = (key: string): number => {
    const vertex = graph.vertices.get(key)!
    return vertex.kind === 'node' ? nodeBreadth(index[vertex.id].node) : 0
  }
  const half = new Map<string, number>()
  for (const layer of slots) for (const key of layer) half.set(key, extentOf(key) / 2)

  // depth (along the flow): one value per layer, spaced by the largest half-extent on each side + layerGap
  const depthAt: number[] = []
  let depth = 0
  let prevMaxHalf = 0
  slots.forEach((layer, l) => {
    const maxHalf = layer.reduce<number>((max, key) => Math.max(max, half.get(key)!), 0)
    if (l > 0) depth += prevMaxHalf + layerGap + maxHalf
    depthAt[l] = depth
    prevMaxHalf = maxHalf
  })

  // breadth: initial non-overlapping stack
  const breadth = new Map<string, number>()
  for (const layer of slots) {
    let cursor = 0
    for (const key of layer) {
      cursor += half.get(key)!
      breadth.set(key, cursor)
      cursor += half.get(key)! + rowGap
    }
  }

  // push the vertices of one layer apart to honor min spacing, preserving their order: a forward sweep
  // removes overlaps, a backward sweep pulls slack back so the layer doesn't drift downward
  const resolveOverlaps = (layer: string[]) => {
    for (let i = 1; i < layer.length; i++) {
      const lo = breadth.get(layer[i - 1])! + half.get(layer[i - 1])! + rowGap + half.get(layer[i])!
      if (breadth.get(layer[i])! < lo) breadth.set(layer[i], lo)
    }
    for (let i = layer.length - 2; i >= 0; i--) {
      const hi = breadth.get(layer[i + 1])! - half.get(layer[i + 1])! - rowGap - half.get(layer[i])!
      if (breadth.get(layer[i])! > hi) breadth.set(layer[i], hi)
    }
  }

  // align each vertex to the weighted-average breadth of its neighbors in the reference (adjacent) layer
  const alignLayer = (layer: string[], referenceLayer: number) => {
    for (const key of layer) {
      let sum = 0
      let weight = 0
      for (const { key: other, weight: w } of neighbors.get(key)!) {
        if (layerOfVertex.get(other) !== referenceLayer) continue
        sum += w * breadth.get(other)!
        weight += w
      }
      if (weight > 0) breadth.set(key, sum / weight)
    }
    resolveOverlaps(layer)
  }

  for (let it = 0; it < ALIGNMENT_ITERATIONS; it++) {
    if (it % 2 === 0) {
      for (let l = 1; l <= maxLayer; l++) alignLayer(slots[l], l - 1) // align to the layer above/left
    } else {
      for (let l = maxLayer - 1; l >= 0; l--) alignLayer(slots[l], l + 1) // align to the layer below/right
    }
  }

  const coords = new Map<string, { depth: number; breadth: number; extent: number }>()
  slots.forEach((layer, l) => {
    for (const key of layer) coords.set(key, { depth: depthAt[l], breadth: breadth.get(key)!, extent: half.get(key)! * 2 })
  })
  return coords
}

// vertex-key helpers, exported so index.ts can look up real-node coordinates and edge routes
export { nodeKey }
