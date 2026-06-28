import type { Edge, EdgeRef, GraphState, LayoutResult, Node, NodeRef, PathSegment } from '@sayari/trellis'
import { decycle } from './decycle'
import { assignCoordinates, type BreadthAlignment, type Orientation } from './coordinate'
import { buildLayeredGraph, validateProperLayeredGraph, type ConfluentBundlingOptions } from './layered'
import { orderLayers, type Ordering, type OrderingRefinement } from './order'
import { applyPortGroups } from './ports'
import { longestPathRank, networkSimplexRank } from './rank'
import { routeEdges, type CorridorOptions, type EdgeDecoration, type EdgeRouteLayout, type FanRoutingOptions, type Route } from './route'
import { activeEdges, edgeSource, edgeTarget, type SugiyamaState } from './state'

export type Ranking = 'longest-path' | 'network-simplex'

export type Options = Partial<{
  orientation: Orientation
  ranking: Ranking
  ordering: Ordering
  refinement: OrderingRefinement
  route: Route
  breadthAlignment: BreadthAlignment
  layerGap: number
  rowGap: number
  orderingIterations: number
  coordinateIterations: number
  maxSiftingRounds: number
  portGrouping: boolean
  bundling: boolean
  confluentBundling: false | ConfluentBundlingOptions
  nodeBreadth: (node: Node) => number
  linkValue: (edge: Edge) => number
  minLayerSpan: (edge: Edge) => number
  decorateEdge: (edge: Readonly<Edge>, layout: EdgeRouteLayout) => EdgeDecoration | undefined
}>

export type SugiyamaMetrics = {
  sccCount: number
  cyclicSccSizes: number[]
  reversedEdgeCount: number
  reversedEdgeWeight: number
  layerCount: number
  totalEdgeSpan: number
  virtualNodeCount: number
  crossingCount: number
  coordinateExtent: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }
  routedSegmentCount: number
  routedControlPointCount: number
  confluentBundleCount: number
  confluentSegmentReduction: number
  fanTrunkCount: number
  fanRoutedEdgeCount: number
  corridorTrackCount: number
  edgeInk: number
  portGroupCount: number
  edgeStraightness: number
}

export const layout = (graphState: GraphState, options: Options = {}) => {
  let orientation = options.orientation ?? 'top'
  let ranking = options.ranking ?? 'network-simplex'
  let ordering = options.ordering ?? 'sifting'
  let refinement = options.refinement
  let route = options.route ?? { type: 'orthogonal', mode: 'bus' }
  let breadthAlignment = options.breadthAlignment ?? 'center'
  let layerGap = options.layerGap ?? 240
  let rowGap = options.rowGap ?? 28
  let orderingIterations = options.orderingIterations ?? 6
  let coordinateIterations = options.coordinateIterations ?? 6
  let maxSiftingRounds = options.maxSiftingRounds ?? 3
  let portGrouping = options.portGrouping ?? true
  let bundling = options.bundling ?? true
  let confluentBundling = options.confluentBundling ?? false
  let decorateEdge = options.decorateEdge
  let ranked = false

  const state: SugiyamaState = {
    graphState,
    breadth: [],
    rank: [],
    reversed: [],
    feedback: [],
    weight: [],
    minLayerSpan: [],
    routeNodeRefs: []
  }

  for (const ref of graphState.nodes()) {
    const node: Node = {
      id: graphState.nodeId(ref),
      x: graphState.nodeX(ref),
      y: graphState.nodeY(ref),
      radius: graphState.nodeRadius(ref),
      label: graphState.nodeLabel(ref),
      style: graphState.nodeStyle(ref)
    }
    state.breadth[ref] = Math.max(1, options.nodeBreadth?.(node) ?? node.radius * 2)
    state.rank[ref] = 0
  }

  for (const ref of graphState.edges()) {
    const edge: Edge = {
      id: graphState.edgeId(ref),
      source: graphState.nodeId(graphState.edgeSource(ref)),
      target: graphState.nodeId(graphState.edgeTarget(ref)),
      width: graphState.edgeWidth(ref),
      label: graphState.edgeLabel(ref),
      style: graphState.edgeStyle(ref),
      path: graphState.edgePath[ref]
    }
    state.reversed[ref] = false
    state.feedback[ref] = false
    state.weight[ref] = Math.max(0, options.linkValue?.(edge) ?? 1)
    state.minLayerSpan[ref] = Math.max(1, Math.round(options.minLayerSpan?.(edge) ?? 1))
    state.routeNodeRefs[ref] = []
  }

  // Phase 1: decycle cyclic inputs with SCC detection and greedy feedback arc reversal.
  const decycleResult = decycle(state)

  const cyclicSccSizes: number[] = []
  for (const scc of decycleResult.cyclicSccs) cyclicSccSizes.push(scc.length)
  let reversedEdgeWeight = 0
  for (const edge of decycleResult.reversedEdges) reversedEdgeWeight += state.weight[edge]
  const metrics: SugiyamaMetrics = {
    sccCount: decycleResult.sccs.length,
    cyclicSccSizes,
    reversedEdgeCount: decycleResult.reversedEdges.length,
    reversedEdgeWeight,
    layerCount: 0,
    totalEdgeSpan: 0,
    virtualNodeCount: 0,
    crossingCount: 0,
    coordinateExtent: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    routedSegmentCount: 0,
    routedControlPointCount: 0,
    confluentBundleCount: 0,
    confluentSegmentReduction: 0,
    fanTrunkCount: 0,
    fanRoutedEdgeCount: 0,
    corridorTrackCount: 0,
    edgeInk: 0,
    portGroupCount: 0,
    edgeStraightness: 1
  }

  return (options: Options = {}): LayoutResult<SugiyamaMetrics> => {
    if (options.ranking !== undefined && options.ranking !== ranking) {
      ranking = options.ranking
      ranked = false
    }
    orientation = options.orientation ?? orientation
    ordering = options.ordering ?? ordering
    refinement = options.refinement ?? refinement
    route = options.route ?? route
    breadthAlignment = options.breadthAlignment ?? breadthAlignment
    layerGap = options.layerGap ?? layerGap
    rowGap = options.rowGap ?? rowGap
    orderingIterations = options.orderingIterations ?? orderingIterations
    coordinateIterations = options.coordinateIterations ?? coordinateIterations
    maxSiftingRounds = options.maxSiftingRounds ?? maxSiftingRounds
    portGrouping = options.portGrouping ?? portGrouping
    bundling = options.bundling ?? bundling
    confluentBundling = options.confluentBundling ?? confluentBundling
    decorateEdge = options.decorateEdge ?? decorateEdge

    // Phase 2: assign ranks with a fast longest-path pass or network-simplex tightening.
    if (!ranked) {
      const rankResult = ranking === 'longest-path' ? longestPathRank(state) : networkSimplexRank(state)
      metrics.layerCount = rankResult.layerCount
      metrics.totalEdgeSpan = rankResult.totalEdgeSpan
      metrics.virtualNodeCount = 0
      for (const edge of activeEdges(state)) {
        const span = (state.rank[edgeTarget(state, edge)] ?? 0) - (state.rank[edgeSource(state, edge)] ?? 0)
        metrics.virtualNodeCount += Math.max(0, span - 1)
      }
      ranked = true
    }

    // Phase 3: split long edges into dummy chains, optionally bundle chains, and minimize crossings.
    const layered = buildLayeredGraph(state, bundling, confluentBundling)
    validateProperLayeredGraph(layered)
    metrics.confluentBundleCount = layered.confluentBundles.length
    metrics.confluentSegmentReduction = 0
    for (const bundle of layered.confluentBundles) {
      metrics.confluentSegmentReduction += Math.max(
        0,
        bundle.sourceRefs.length * bundle.targetRefs.length - (bundle.sourceRefs.length + bundle.targetRefs.length)
      )
    }
    metrics.crossingCount = orderLayers(
      layered,
      ordering,
      orderingIterations,
      maxSiftingRounds,
      refinement ?? (ordering === 'sifting' ? 'sifting' : 'adjacent-swaps')
    )

    // Phase 4 setup: widen high-degree nodes so incident edges can share stable port bands.
    const portGroups = applyPortGroups(layered, { enabled: portGrouping, degreeThreshold: 8, spacing: 8 })
    metrics.portGroupCount = portGroups.length

    // Phase 4: assign coordinates with sparse lane alignment or dense median relaxation.
    const coordinateResult = assignCoordinates(layered, orientation, layerGap, rowGap, coordinateIterations, breadthAlignment)
    metrics.coordinateExtent = coordinateResult.extent
    metrics.edgeStraightness = coordinateResult.edgeStraightness

    // Phase 5: route final edge paths from the ordered and positioned dummy chains.
    const routeResult = routeEdges(layered, state, { route, orientation, decorateEdge })
    metrics.routedSegmentCount = routeResult.segmentCount
    metrics.routedControlPointCount = routeResult.controlPointCount
    metrics.fanTrunkCount = routeResult.fanTrunkCount
    metrics.fanRoutedEdgeCount = routeResult.fanRoutedEdgeCount
    metrics.corridorTrackCount = routeResult.corridorTrackCount
    metrics.edgeInk = routeResult.edgeInk

    const nodePositions: { node: NodeRef; x: number; y: number }[] = []
    for (const node of layered.nodes) {
      if (!node.dummy && node.originalRef !== undefined) nodePositions.push({ node: node.originalRef, x: node.x, y: node.y })
    }

    const edgePaths: { edge: EdgeRef; path?: PathSegment[] }[] = []
    const edgeWidths: { edge: EdgeRef; width: number }[] = []
    const edgeStyles: { edge: EdgeRef; style: number }[] = []
    const edgeLabels: { edge: EdgeRef; label: string }[] = []
    for (const edge of routeResult.edges) {
      edgePaths.push({ edge: edge.ref, path: edge.path })
      edgeWidths.push({ edge: edge.ref, width: edge.width })
      edgeStyles.push({ edge: edge.ref, style: edge.style })
      if (edge.label !== undefined) edgeLabels.push({ edge: edge.ref, label: edge.label })
    }

    graphState.updateNodePositions(nodePositions)
    graphState.updateEdgePaths(edgePaths)
    graphState.updateEdgeWidths(edgeWidths)
    graphState.updateEdgeStyles(edgeStyles)
    graphState.updateEdgeLabels(edgeLabels)

    return { done: true, metrics }
  }
}

export type {
  BreadthAlignment,
  ConfluentBundlingOptions,
  CorridorOptions,
  EdgeDecoration,
  EdgeRouteLayout,
  FanRoutingOptions,
  Ordering,
  OrderingRefinement,
  Orientation,
  Route
}
