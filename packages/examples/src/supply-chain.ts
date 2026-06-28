import {
  FPSOverlay,
  GraphState,
  DOMInteractionHandler,
  DIRTY_NODE_STYLE_TABLE,
  Renderer,
  VIEWPORT_X,
  VIEWPORT_Y,
  VIEWPORT_ZOOM,
  type Edge,
  type EdgeStyle,
  type Id,
  type Node,
  type NodeLabelStyle,
  type NodeStyle,
  orthogonalPath,
  smoothPath,
  routeOrthogonal,
  type PathPoint
} from '@sayari/trellis'
import { Control as DownloadControl } from '@sayari/trellis-controls/download'
import { Control as ZoomControl, clampZoom } from '@sayari/trellis-controls/zoom'
import { animate, interpolatePosition, smootherstep } from '@sayari/trellis-utils'
import {
  layout as sugiyamaLayout,
  type BreadthAlignment,
  type Ordering,
  type Orientation,
  type Route,
  type SugiyamaMetrics
} from '@sayari/trellis-sugiyama'
import { layout as hierarchyLayout } from '@sayari/trellis-hierarchy'
import { layout as forceLayout } from '@sayari/trellis-force'
import supplyChainData from '../../../data/Zhongshan_Wei_Li_Textile_Co-supply_chain.json'

type Entity = {
  id: string
  type: string
  label: string
  risk_factors: string[]
  countries: string[]
}

type Component = {
  hs_code?: string
  arrival_countries?: string[]
  departure_countries?: string[]
  min_date?: string
  max_date?: string
}

type PathStep = {
  tier: number
  entity_id: string
  components: Component[]
}

type SupplyPath = {
  source_entity_id: string
  path: PathStep[]
}

type SupplyChainData = {
  data: {
    paths: SupplyPath[]
    entities: Record<string, Entity>
  }
}

type SupplyNode = Node & {
  entityId: string
  tier: number
  country?: string
}

type SupplyEdge = Edge & {
  count: number
  hsCodes: string[]
  routePoints?: PathPoint[]
}

type LayoutKind = 'sugiyama' | 'hierarchy' | 'force'
type EdgePathKind = 'curve' | 'orthogonal' | 'straight'
type OrthogonalMode = 'bus' | 'control-points'
type OrthogonalRadius = 'sharp' | 'rounded'
type OrthogonalSpacing = 'tight' | 'normal' | 'wide'
type SplineSmoothing = 0 | 1 | 2 | 3
type BackEdgeRouting = 'loop' | 'route' | 'hide'
type PathDepth = 0 | 1 | 2 | 3 | 4
type OrderingIterations = 1 | 3 | 6 | 12
type CoordinateIterations = 1 | 3 | 6 | 12
type MaxSiftingRounds = 1 | 3 | 6
type LayoutGraph = { nodes: SupplyNode[]; edges: SupplyEdge[]; metrics?: SugiyamaMetrics }

const PATH_DEPTHS = [0, 1, 2, 3, 4] as const
const EDGE_PATH_KINDS = ['curve', 'orthogonal', 'straight'] as const
const ORTHOGONAL_MODES = ['bus', 'control-points'] as const
const ORTHOGONAL_RADII = ['sharp', 'rounded'] as const
const ORTHOGONAL_SPACINGS = ['tight', 'normal', 'wide'] as const
const SPLINE_SMOOTHINGS = [0, 1, 2, 3] as const
const BACK_EDGE_ROUTINGS = ['loop', 'route', 'hide'] as const
const BREADTH_ALIGNMENTS = ['min', 'center', 'max'] as const
const ORIENTATIONS = ['top', 'right', 'bottom', 'left'] as const
const ORDERINGS = ['sifting', 'barycenter'] as const
const ORDERING_ITERATIONS = [1, 3, 6, 12] as const
const COORDINATE_ITERATIONS = [1, 3, 6, 12] as const
const MAX_SIFTING_ROUNDS = [1, 3, 6] as const
const BOOLEAN_TOGGLE_VALUES = ['off', 'on'] as const

const routeFlow = (orientation: Orientation) => (orientation === 'top' || orientation === 'bottom' ? 'vertical' : 'horizontal')
const INITIAL_ORIENTATION: Orientation = 'top'
const ORTHOGONAL_RADIUS: Record<OrthogonalRadius, number> = {
  sharp: 0,
  rounded: 12
}

const raw = supplyChainData as SupplyChainData
const app = document.querySelector<HTMLDivElement>('#app')
if (app === null) throw new Error('Could not find #app container')

const canvas = document.createElement('canvas')
app.appendChild(canvas)

const BASE_NODE_LABEL: Pick<NodeLabelStyle, 'fontSize' | 'textColor' | 'textOutlineWidth' | 'textOutlineColor'> = {
  fontSize: 7,
  textColor: 0x253142,
  textOutlineWidth: 0.75,
  textOutlineColor: 0xffffff
}
const LABEL_BY_ORIENTATION: Record<Orientation, Required<Pick<NodeLabelStyle, 'textPosition' | 'textAnchor' | 'textAngle'>>> = {
  top: { textPosition: 'bottom', textAnchor: 'start', textAngle: -Math.PI / 8 },
  bottom: { textPosition: 'top', textAnchor: 'start', textAngle: Math.PI / 8 },
  left: { textPosition: 'right', textAnchor: 'start', textAngle: 0 },
  right: { textPosition: 'left', textAnchor: 'end', textAngle: 0 }
}
const nodeLabelForOrientation = (orientation: Orientation): NodeLabelStyle => ({
  ...BASE_NODE_LABEL,
  ...LABEL_BY_ORIENTATION[orientation]
})
let nodeLabel = nodeLabelForOrientation(INITIAL_ORIENTATION)

const SOURCE_STYLE = 0
const TIER_STYLE_OFFSET = 1
const TIER_COLORS = [0xb91c1c, 0xea580c, 0xf59e0b, 0xfef08a] as const
const BACK_EDGE_STYLE = 1
const NODE_DIM_STYLE = TIER_STYLE_OFFSET + TIER_COLORS.length
const EDGE_DOWNSTREAM_HIGHLIGHT_STYLE = 2
const EDGE_UPSTREAM_HIGHLIGHT_STYLE = 3
const EDGE_DIM_STYLE = 4
const EDGE_WIDTH = 3
const EDGE_FILL = 0xcccccc
const EDGE_FILL_OPACITY = 0.6
const EDGE_HIGHLIGHT_DOWNSTREAM_FILL = 0x99bdf7
const EDGE_HIGHLIGHT_UPSTREAM_FILL = 0xde8b36
const EDGE_HIGHLIGHT_OPACITY = 0.87
const EDGE_DIM_FILL = 0xcccccc
const EDGE_DIM_OPACITY = 0.3
const ORTHOGONAL_SPACING: Record<OrthogonalSpacing, number> = {
  tight: EDGE_WIDTH,
  normal: EDGE_WIDTH + 2,
  wide: EDGE_WIDTH + 8
}

const shade = (color: number, amount: number) => {
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return (mix((color >> 16) & 0xff) << 16) | (mix((color >> 8) & 0xff) << 8) | mix(color & 0xff)
}
const nodeStyleFor = (tier: number) => {
  if (tier === 1) return SOURCE_STYLE
  return TIER_STYLE_OFFSET + Math.max(0, Math.min(TIER_COLORS.length - 1, tier - 2))
}

const tierNodeStyles = TIER_COLORS.map(
  (fillColor): NodeStyle => ({
    fillColor,
    strokeWidth: 3,
    strokeColor: shade(fillColor, 0.58),
    label: nodeLabel
  })
)
const nodeStyles: NodeStyle[] = [
  { fillColor: 0x7f1d1d, strokeWidth: 5, strokeColor: 0xfecaca, label: nodeLabel },
  ...tierNodeStyles,
  {
    fillColor: 0xf0f0f0,
    fillColorOpacity: 1,
    strokeWidth: 3,
    strokeColor: 0xcccccc,
    strokeColorOpacity: 1,
    label: { ...nodeLabel, textColorOpacity: 0, textOutlineColorOpacity: 0 }
  }
]
const applyNodeLabelOrientation = (orientation: Orientation, graphState?: GraphState) => {
  nodeLabel = nodeLabelForOrientation(orientation)
  nodeStyles[SOURCE_STYLE] = { ...nodeStyles[SOURCE_STYLE], label: nodeLabel }
  for (let index = TIER_STYLE_OFFSET; index < NODE_DIM_STYLE; index++) {
    nodeStyles[index] = { ...nodeStyles[index], label: nodeLabel }
  }
  nodeStyles[NODE_DIM_STYLE] = { ...nodeStyles[NODE_DIM_STYLE], label: { ...nodeLabel, textColorOpacity: 0, textOutlineColorOpacity: 0 } }
  if (graphState === undefined) return
  for (let index = 0; index < nodeStyles.length; index++) graphState.nodeStyleDefs[index] = nodeStyles[index]
  graphState.dirty[0] |= DIRTY_NODE_STYLE_TABLE
  graphState.updateNodeStyles(layoutGraph.nodes.map((node) => ({ id: node.id, style: node.style })))
}

const edgeStyles: EdgeStyle[] = [
  { fillColor: EDGE_FILL, fillColorOpacity: EDGE_FILL_OPACITY, arrow: 'forward' },
  { fillColor: EDGE_FILL, fillColorOpacity: EDGE_FILL_OPACITY, arrow: 'forward' },
  { fillColor: EDGE_HIGHLIGHT_DOWNSTREAM_FILL, fillColorOpacity: EDGE_HIGHLIGHT_OPACITY, arrow: 'forward' },
  { fillColor: EDGE_HIGHLIGHT_UPSTREAM_FILL, fillColorOpacity: EDGE_HIGHLIGHT_OPACITY, arrow: 'forward' },
  { fillColor: EDGE_DIM_FILL, fillColorOpacity: EDGE_DIM_OPACITY, arrow: 'forward' }
]

const edgeKey = (source: Id, target: Id) => `${source}-->${target}`
const displayName = (entity: Entity | undefined, id: string) => {
  if (entity === undefined) return id
  return entity.label
}

const shortLabel = (label: string) => {
  return label.length <= 30 ? label : `${label.slice(0, 27)}...`
}

const makeGraph = (maxDepth: PathDepth): { nodes: SupplyNode[]; edges: SupplyEdge[] } => {
  const tierById = new Map<string, number>()
  const pathEntityIds = new Set<string>()
  const edgeCounts = new Map<string, { source: string; target: string; count: number; hsCodes: Set<string> }>()

  for (const supplyPath of raw.data.paths) {
    const source = supplyPath.source_entity_id
    pathEntityIds.add(source)
    tierById.set(source, Math.min(tierById.get(source) ?? 1, 1))

    let previous = source
    for (const step of supplyPath.path.slice(0, maxDepth)) {
      pathEntityIds.add(step.entity_id)
      tierById.set(step.entity_id, Math.min(tierById.get(step.entity_id) ?? step.tier, step.tier))

      const key = edgeKey(previous, step.entity_id)
      const edge = edgeCounts.get(key) ?? { source: previous, target: step.entity_id, count: 0, hsCodes: new Set<string>() }
      edge.count += 1
      for (const component of step.components) {
        if (component.hs_code !== undefined) edge.hsCodes.add(component.hs_code)
      }
      edgeCounts.set(key, edge)
      previous = step.entity_id
    }
  }

  const weightedDegree = new Map<string, number>()
  for (const edge of edgeCounts.values()) {
    weightedDegree.set(edge.source, (weightedDegree.get(edge.source) ?? 0) + edge.count)
    weightedDegree.set(edge.target, (weightedDegree.get(edge.target) ?? 0) + edge.count)
  }

  const nodes = [...pathEntityIds].map((id): SupplyNode => {
    const entity = raw.data.entities[id]
    const tier = tierById.get(id) ?? 1
    const weighted = weightedDegree.get(id) ?? 1
    const radius = Math.min(28, 8 + Math.log2(weighted + 1) * 2)
    return {
      id,
      x: tier * 140,
      y: 0,
      radius,
      style: nodeStyleFor(tier),
      label: shortLabel(displayName(entity, id)),
      entityId: id,
      tier,
      country: entity?.countries[0]
    }
  })

  const edges = [...edgeCounts.values()].map(
    (edge, index): SupplyEdge => ({
      id: `supply-${index}`,
      source: edge.source,
      target: edge.target,
      width: EDGE_WIDTH,
      style: 0,
      count: edge.count,
      hsCodes: [...edge.hsCodes].sort()
    })
  )

  return { nodes, edges }
}

const fitViewport = (state: GraphState, points: { x: number; y: number }[]) => {
  if (points.length === 0) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const padding = 48
  const worldW = maxX - minX + padding
  const worldH = maxY - minY + padding
  const zoom = clampZoom(state.minZoom, state.maxZoom, 0.98 * Math.min(window.innerWidth / worldW, window.innerHeight / worldH))
  state.updateViewport({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom })
}

let currentDepth: PathDepth = 3
let currentEdgePath: EdgePathKind = 'curve'
let currentOrthogonalMode: OrthogonalMode = 'bus'
let currentOrthogonalRadius: OrthogonalRadius = 'rounded'
let currentOrthogonalSpacing: OrthogonalSpacing = 'normal'
let currentFanRouting = false
let currentCorridors = false
let currentSplineSmoothing: SplineSmoothing = 0
let currentBackEdges: BackEdgeRouting = 'loop'
let currentOrientation: Orientation = INITIAL_ORIENTATION
let currentOrdering: Ordering = 'sifting'
let currentOrderingIterations: OrderingIterations = 6
let currentCoordinateIterations: CoordinateIterations = 6
let currentMaxSiftingRounds: MaxSiftingRounds = 3
let currentPortGrouping = true
let currentBundling = true
let currentConfluentBundling = false
let graph = makeGraph(currentDepth)
const rootId: Id = raw.data.paths[0]?.source_entity_id ?? graph.nodes[0]?.id ?? ''

const currentRoute = (): Route => {
  switch (currentEdgePath) {
    case 'straight':
      return { type: 'straight', backEdges: currentBackEdges }
    case 'orthogonal':
      return {
        type: 'orthogonal',
        mode: currentOrthogonalMode,
        radius: ORTHOGONAL_RADIUS[currentOrthogonalRadius],
        spacing: ORTHOGONAL_SPACING[currentOrthogonalSpacing],
        fanRouting: currentFanRouting ? { minDegree: 8, trunkOffset: 32 } : false,
        corridors: currentCorridors ? { enabled: true, trackSpacing: ORTHOGONAL_SPACING[currentOrthogonalSpacing] } : false,
        backEdges: currentBackEdges
      }
    case 'curve':
    default:
      return { type: 'spline', smoothing: currentSplineSmoothing, backEdges: currentBackEdges }
  }
}

const copyNodes = (nodes: SupplyNode[]) => nodes.map((node) => ({ ...node }))
const copyEdges = (edges: SupplyEdge[]): SupplyEdge[] =>
  edges.map((edge) => {
    const copy: SupplyEdge = { ...edge, style: 0 }
    copy.path = undefined
    return copy
  })

const createLayoutGraphState = (nodes: SupplyNode[], edges: SupplyEdge[]) => {
  const graphState = new GraphState({ minZoom: 0.001, maxZoom: 5, nodeStyles, edgeStyles })
  graphState.addNodes(nodes)
  graphState.addEdges(edges)
  return graphState
}

const readLayoutGraph = (graphState: GraphState, nodes: SupplyNode[], edges: SupplyEdge[], metrics?: SugiyamaMetrics): LayoutGraph => {
  const nodeById = new Map(
    [...graphState.nodes()].map((node) => [
      graphState.nodeId(node),
      {
        x: graphState.nodeX(node),
        y: graphState.nodeY(node),
        radius: graphState.nodeRadius(node),
        style: graphState.nodeStyle(node),
        label: graphState.nodeLabel(node)
      }
    ])
  )
  const edgeById = new Map(
    [...graphState.edges()].map((edge) => [
      graphState.edgeId(edge),
      {
        width: graphState.edgeWidth(edge),
        style: graphState.edgeStyle(edge),
        label: graphState.edgeLabel(edge),
        path: graphState.edgePath[edge]
      }
    ])
  )

  return {
    nodes: nodes.map((node) => {
      const positioned = nodeById.get(node.id)
      return positioned === undefined
        ? node
        : {
            ...node,
            x: positioned.x,
            y: positioned.y,
            radius: positioned.radius,
            style: positioned.style,
            label: positioned.label
          }
    }),
    edges: edges.map((edge) => {
      const positioned = edgeById.get(edge.id)
      return positioned === undefined
        ? edge
        : {
            ...edge,
            width: positioned.width,
            style: positioned.style,
            label: positioned.label,
            path: positioned.path
          }
    }),
    metrics
  }
}

const forceOptions = {
  ticks: 500,
  collidePadding: 10,
  params: {
    chargeStrength: -260,
    theta: 1.1,
    distanceMax: 2500,
    linkDistance: 90,
    gravityStrength: 0.05,
    centerStrength: 0.8
  }
}

const computeSugiyama = (input: { nodes: SupplyNode[]; edges: SupplyEdge[] }) => {
  const nodes = copyNodes(input.nodes)
  const edges = copyEdges(input.edges)
  const graphState = createLayoutGraphState(nodes, edges)
  const edgeCountById = new Map(edges.map((edge) => [edge.id, edge.count]))
  const routePointsById = new Map<Id, PathPoint[]>()

  const result = sugiyamaLayout(graphState, {
    orientation: currentOrientation,
    layerGap: 220,
    rowGap: 16,
    ordering: currentOrdering,
    orderingIterations: currentOrderingIterations,
    coordinateIterations: currentCoordinateIterations,
    maxSiftingRounds: currentMaxSiftingRounds,
    portGrouping: currentPortGrouping,
    bundling: currentBundling,
    confluentBundling: currentConfluentBundling ? { enabled: true, minBicliqueEdges: 8 } : false,
    breadthAlignment: currentBreadthAlignment,
    route: currentRoute(),
    linkValue: (edge) => edgeCountById.get(edge.id) ?? 1,
    decorateEdge: (edge, edgeLayout) => {
      routePointsById.set(edge.id, edgeLayout.points)
      return {
        style: edgeLayout.back ? BACK_EDGE_STYLE : edge.style
      }
    }
  })()
  const layoutGraph = readLayoutGraph(graphState, nodes, edges, result.metrics)
  for (const edge of layoutGraph.edges) {
    edge.routePoints = routePointsById.get(edge.id)
  }
  return layoutGraph
}

const computeHierarchy = () => {
  const nodes = copyNodes(graph.nodes)
  const edges = copyEdges(graph.edges)
  const graphState = createLayoutGraphState(nodes, edges)
  hierarchyLayout(graphState, {
    rootId,
    orientation: 'top',
    siblingGap: 42,
    levelGap: 180,
    alignment: 'mid',
    bfs: true,
    sort: (a, b) => {
      const weightA = (a.data.node as SupplyNode).radius
      const weightB = (b.data.node as SupplyNode).radius
      return weightB - weightA
    }
  })()
  return readLayoutGraph(graphState, nodes, edges)
}

const forceSeededNodes = () => {
  const tierCounts = new Map<number, number>()
  return graph.nodes.map((node) => {
    const index = tierCounts.get(node.tier) ?? 0
    tierCounts.set(node.tier, index + 1)
    const row = index % 80
    const column = Math.floor(index / 80)
    return {
      ...node,
      x: (node.tier - 3) * 450 + column * 32,
      y: (row - 40) * 32
    }
  })
}

const computeForce = () => {
  const nodes = forceSeededNodes()
  const edges = copyEdges(graph.edges)
  const graphState = createLayoutGraphState(nodes, edges)
  forceLayout(graphState, forceOptions)()
  return readLayoutGraph(graphState, nodes, edges)
}

let currentLayout: LayoutKind = 'sugiyama'
let currentBreadthAlignment: BreadthAlignment = 'center'
let layouts: Record<LayoutKind, LayoutGraph> = {
  sugiyama: computeSugiyama(graph),
  hierarchy: computeHierarchy(),
  force: computeForce()
}
let layoutGraph: LayoutGraph = layouts[currentLayout]

const recomputeLayouts = () => {
  layouts = {
    sugiyama: computeSugiyama(graph),
    hierarchy: computeHierarchy(),
    force: computeForce()
  }
}

const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
const state = new GraphState({ minZoom: 0.001, maxZoom: 5, nodeStyles, edgeStyles })
const resize = () => {
  canvas.width = Math.round(window.innerWidth * pixelRatio)
  canvas.height = Math.round(window.innerHeight * pixelRatio)
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
}

window.addEventListener('resize', () => {
  resize()
  fitViewport(state, layoutGraph.nodes)
})
resize()

new FPSOverlay()
const renderer = new Renderer({ canvas, state, pixelRatio })
state.addNodes(layoutGraph.nodes)
state.addEdges(layoutGraph.edges)
fitViewport(state, layoutGraph.nodes)

const layoutButtons = new Map<LayoutKind, HTMLButtonElement>()
const depthButtons = new Map<PathDepth, HTMLButtonElement>()
const edgePathButtons = new Map<EdgePathKind, HTMLButtonElement>()
const orthogonalModeButtons = new Map<OrthogonalMode, HTMLButtonElement>()
const orthogonalRadiusButtons = new Map<OrthogonalRadius, HTMLButtonElement>()
const orthogonalSpacingButtons = new Map<OrthogonalSpacing, HTMLButtonElement>()
const fanRoutingButtons = new Map<boolean, HTMLButtonElement>()
const corridorButtons = new Map<boolean, HTMLButtonElement>()
const splineSmoothingButtons = new Map<SplineSmoothing, HTMLButtonElement>()
const backEdgeButtons = new Map<BackEdgeRouting, HTMLButtonElement>()
const breadthAlignmentButtons = new Map<BreadthAlignment, HTMLButtonElement>()
const orientationButtons = new Map<Orientation, HTMLButtonElement>()
const orderingButtons = new Map<Ordering, HTMLButtonElement>()
const orderingIterationsButtons = new Map<OrderingIterations, HTMLButtonElement>()
const coordinateIterationsButtons = new Map<CoordinateIterations, HTMLButtonElement>()
const maxSiftingRoundsButtons = new Map<MaxSiftingRounds, HTMLButtonElement>()
const portGroupingButtons = new Map<boolean, HTMLButtonElement>()
const bundlingButtons = new Map<boolean, HTMLButtonElement>()
const confluentBundlingButtons = new Map<boolean, HTMLButtonElement>()
const isSugiyamaLayout = (layout: LayoutKind = currentLayout) => layout === 'sugiyama'
const syncRouteOptionButtons = () => {
  edgePathButtons.forEach((button, edgePath) => button.classList.toggle('active', currentEdgePath === edgePath))
  orthogonalModeButtons.forEach((button, mode) => button.classList.toggle('active', currentOrthogonalMode === mode))
  orthogonalRadiusButtons.forEach((button, radius) => button.classList.toggle('active', currentOrthogonalRadius === radius))
  orthogonalSpacingButtons.forEach((button, spacing) => button.classList.toggle('active', currentOrthogonalSpacing === spacing))
  fanRoutingButtons.forEach((button, enabled) => button.classList.toggle('active', currentFanRouting === enabled))
  corridorButtons.forEach((button, enabled) => button.classList.toggle('active', currentCorridors === enabled))
  splineSmoothingButtons.forEach((button, smoothing) => button.classList.toggle('active', currentSplineSmoothing === smoothing))
  backEdgeButtons.forEach((button, backEdges) => button.classList.toggle('active', currentBackEdges === backEdges))
  overlay.querySelectorAll<HTMLElement>('[data-spline-route-control]').forEach((element) => {
    element.style.display = isSugiyamaLayout() && currentEdgePath === 'curve' ? 'flex' : 'none'
  })
  overlay.querySelectorAll<HTMLElement>('[data-orthogonal-route-control]').forEach((element) => {
    element.style.display = isSugiyamaLayout() && currentEdgePath === 'orthogonal' ? 'flex' : 'none'
  })
  overlay.querySelectorAll<HTMLElement>('[data-bus-route-control]').forEach((element) => {
    element.style.display = isSugiyamaLayout() && currentEdgePath === 'orthogonal' && currentOrthogonalMode === 'bus' ? 'flex' : 'none'
  })
}
const syncLayoutButtons = () => {
  layoutButtons.forEach((button, layout) => button.classList.toggle('active', currentLayout === layout))
  overlay.querySelectorAll<HTMLElement>('[data-sugiyama-control]').forEach((element) => {
    element.style.display = isSugiyamaLayout() ? 'flex' : 'none'
  })
  syncRouteOptionButtons()
  syncLayoutOptionButtons()
}
const syncDepthButtons = () => {
  depthButtons.forEach((button, depth) => button.classList.toggle('active', currentDepth === depth))
}
const syncBreadthAlignmentButtons = () => {
  breadthAlignmentButtons.forEach((button, alignment) => button.classList.toggle('active', currentBreadthAlignment === alignment))
}
const syncLayoutOptionButtons = () => {
  syncBreadthAlignmentButtons()
  orientationButtons.forEach((button, orientation) => button.classList.toggle('active', currentOrientation === orientation))
  orderingButtons.forEach((button, ordering) => button.classList.toggle('active', currentOrdering === ordering))
  orderingIterationsButtons.forEach((button, iterations) => button.classList.toggle('active', currentOrderingIterations === iterations))
  coordinateIterationsButtons.forEach((button, iterations) => button.classList.toggle('active', currentCoordinateIterations === iterations))
  maxSiftingRoundsButtons.forEach((button, rounds) => button.classList.toggle('active', currentMaxSiftingRounds === rounds))
  portGroupingButtons.forEach((button, enabled) => button.classList.toggle('active', currentPortGrouping === enabled))
  bundlingButtons.forEach((button, enabled) => button.classList.toggle('active', currentBundling === enabled))
  confluentBundlingButtons.forEach((button, enabled) => button.classList.toggle('active', currentConfluentBundling === enabled))
}
let highlightActive = false
let stopNodePositionTransition: (() => void) | undefined

const applyGraphToState = (next: LayoutGraph, fit = true) => {
  layoutGraph = next
  state.clearGraph()
  state.addNodes(layoutGraph.nodes)
  state.addEdges(layoutGraph.edges)
  if (fit) fitViewport(state, layoutGraph.nodes)
}

const buildAnimatedEdgePaths = (
  edges: SupplyEdge[],
  nodeById: Map<Id, { x: number; y: number }>,
  routePointsById?: Map<Id, PathPoint[]>
) => {
  if (!isSugiyamaLayout()) return edges.map((edge) => ({ id: edge.id, path: undefined }))
  if (currentEdgePath === 'straight') return edges.map((edge) => ({ id: edge.id, path: undefined }))
  if (currentEdgePath === 'orthogonal') {
    if (currentOrthogonalMode === 'control-points') {
      return edges.map((edge) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        const routePoints = routePointsById?.get(edge.id) ?? edge.routePoints
        const points = source !== undefined && target !== undefined ? [source, ...(routePoints?.slice(1, -1) ?? []), target] : undefined
        return { id: edge.id, path: points === undefined ? edge.path : orthogonalPath(points, ORTHOGONAL_RADIUS[currentOrthogonalRadius]) }
      })
    }
    const routed = routeOrthogonal(
      edges.flatMap((edge) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        return source === undefined || target === undefined ? [] : [{ id: edge.id, source, target }]
      }),
      {
        flow: routeFlow(currentOrientation),
        radius: ORTHOGONAL_RADIUS[currentOrthogonalRadius],
        spacing: ORTHOGONAL_SPACING[currentOrthogonalSpacing]
      }
    )
    return edges.map((edge) => ({ id: edge.id, path: routed.get(edge.id) }))
  }

  return edges.map((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    const routePoints = routePointsById?.get(edge.id) ?? edge.routePoints
    // prettier-ignore
    const path = source !== undefined && target !== undefined
      ? smoothPath([source, ...(routePoints?.slice(1, -1) ?? []), target])
      : edge.path
    return { id: edge.id, path }
  })
}

const graphIndexes = () => {
  const incoming = new Map<Id, SupplyEdge[]>()
  const outgoing = new Map<Id, SupplyEdge[]>()
  for (const node of layoutGraph.nodes) {
    incoming.set(node.id, [])
    outgoing.set(node.id, [])
  }
  for (const edge of layoutGraph.edges) {
    incoming.get(edge.target)?.push(edge)
    outgoing.get(edge.source)?.push(edge)
  }
  return { incoming, outgoing }
}

const collectReachableEdges = (start: Id, direction: 'incoming' | 'outgoing', edgesByNode: Map<Id, SupplyEdge[]>) => {
  const nodes = new Set<Id>([start])
  const edges = new Set<Id>()
  const queue: Id[] = [start]
  for (let i = 0; i < queue.length; i++) {
    const nodeId = queue[i]
    for (const edge of edgesByNode.get(nodeId) ?? []) {
      edges.add(edge.id)
      const next = direction === 'incoming' ? edge.source : edge.target
      if (!nodes.has(next)) {
        nodes.add(next)
        queue.push(next)
      }
    }
  }
  return { nodes, edges }
}

const clearHighlight = () => {
  if (!highlightActive) return
  state.updateNodeStyles(layoutGraph.nodes.map((node) => ({ id: node.id, style: node.style })))
  state.updateEdgeStyles(layoutGraph.edges.map((edge) => ({ id: edge.id, style: edge.style })))
  highlightActive = false
}

const highlightNodePaths = (id: Id) => {
  const { incoming, outgoing } = graphIndexes()
  const ancestors = collectReachableEdges(id, 'incoming', incoming)
  const descendants = collectReachableEdges(id, 'outgoing', outgoing)
  const highlightedNodes = new Set<Id>([...ancestors.nodes, ...descendants.nodes])

  state.updateNodeStyles(
    layoutGraph.nodes.map((node) => ({
      id: node.id,
      style: highlightedNodes.has(node.id) ? node.style : NODE_DIM_STYLE
    }))
  )
  state.updateEdgeStyles(
    layoutGraph.edges.map((edge) => {
      const downstream = descendants.edges.has(edge.id)
      const upstream = ancestors.edges.has(edge.id)
      return {
        id: edge.id,
        style: downstream ? EDGE_DOWNSTREAM_HIGHLIGHT_STYLE : upstream ? EDGE_UPSTREAM_HIGHLIGHT_STYLE : EDGE_DIM_STYLE
      }
    })
  )
  highlightActive = true
}

const applyLayout = (layout: LayoutKind) => {
  stopNodePositionTransition?.()
  stopNodePositionTransition = undefined
  clearHighlight()
  currentLayout = layout
  applyGraphToState(layouts[layout], false)
  syncLayoutButtons()
  updateOverlaySummary()
}
const applyDepth = (depth: PathDepth) => {
  stopNodePositionTransition?.()
  stopNodePositionTransition = undefined
  clearHighlight()
  currentDepth = depth
  graph = makeGraph(currentDepth)
  recomputeLayouts()
  applyGraphToState(layouts[currentLayout], false)
  syncDepthButtons()
  updateOverlaySummary()
}
const applyEdgePath = (edgePath: EdgePathKind) => {
  stopNodePositionTransition?.()
  stopNodePositionTransition = undefined
  clearHighlight()
  currentEdgePath = edgePath
  layouts.sugiyama = computeSugiyama(graph)
  if (isSugiyamaLayout()) applyGraphToState(layouts.sugiyama, false)
  syncRouteOptionButtons()
  updateOverlaySummary()
}
const applyRouteOption = () => {
  stopNodePositionTransition?.()
  stopNodePositionTransition = undefined
  clearHighlight()
  layouts.sugiyama = computeSugiyama(graph)
  if (isSugiyamaLayout()) applyGraphToState(layouts.sugiyama, false)
  syncRouteOptionButtons()
  updateOverlaySummary()
}
const applySugiyamaLayoutOption = () => {
  stopNodePositionTransition?.()
  stopNodePositionTransition = undefined
  clearHighlight()
  applyNodeLabelOrientation(currentOrientation, state)
  layouts.sugiyama = computeSugiyama(graph)
  const next = layouts[currentLayout]
  if (!isSugiyamaLayout()) {
    syncLayoutOptionButtons()
    updateOverlaySummary()
    return
  }

  const from = layoutGraph.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }))
  const to = next.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }))
  const at = interpolatePosition(from, to)
  const previousEdges = layoutGraph.edges
  const previousRoutePointsById = new Map(previousEdges.map((edge) => [edge.id, edge.routePoints]))
  const nextRoutePointsById = new Map(next.edges.map((edge) => [edge.id, edge.routePoints]))
  const routePointTweenById = new Map<Id, (t: number) => PathPoint[]>()
  for (const edge of next.edges) {
    const previous = previousRoutePointsById.get(edge.id)
    const target = nextRoutePointsById.get(edge.id)
    if (previous === undefined || target === undefined || previous.length !== target.length) continue
    routePointTweenById.set(edge.id, (t) =>
      target.map((point, index) => ({
        x: previous[index].x + (point.x - previous[index].x) * t,
        y: previous[index].y + (point.y - previous[index].y) * t
      }))
    )
  }
  layoutGraph = next
  state.updateEdgeStyles(layoutGraph.edges.map((edge) => ({ id: edge.id, style: edge.style })))
  state.updateNodeStyles(layoutGraph.nodes.map((node) => ({ id: node.id, style: node.style })))
  stopNodePositionTransition = animate(
    900,
    (t) => {
      const eased = smootherstep(t)
      const positions = at(eased)
      const nodeById = new Map<Id, { x: number; y: number }>(layoutGraph.nodes.map((node) => [node.id, node]))
      for (const position of positions) {
        const node = nodeById.get(position.id)
        if (node !== undefined) {
          node.x = position.x
          node.y = position.y
        }
      }
      const routePointsById =
        routePointTweenById.size === 0
          ? undefined
          : new Map<Id, PathPoint[]>([...routePointTweenById].map(([id, tween]) => [id, tween(eased)]))
      state.updateNodePositions(positions)
      state.updateEdgePaths(buildAnimatedEdgePaths(layoutGraph.edges, nodeById, routePointsById))
    },
    () => {
      state.updateNodePositions(to)
      state.updateEdgePaths(layoutGraph.edges.map((edge) => ({ id: edge.id, path: edge.path })))
      stopNodePositionTransition = undefined
    }
  )
  syncLayoutOptionButtons()
  updateOverlaySummary()
}

new DOMInteractionHandler({
  canvas,
  state,
  onNodePointerEnter: ({ id }) => highlightNodePaths(id),
  onNodePointerLeave: () => clearHighlight(),
  // Treat node drags as viewport pans for this read-only example; otherwise dense nodes would block panning.
  onNodeDrag: ({ dx, dy }) => {
    state.updateViewport({
      x: state.viewport[VIEWPORT_X] - dx,
      y: state.viewport[VIEWPORT_Y] - dy,
      zoom: state.viewport[VIEWPORT_ZOOM]
    })
  },
  onViewportDoubleClick: () => fitViewport(state, layoutGraph.nodes)
})

const style = document.createElement('style')
style.textContent = `
  .supply-overlay {
    position: fixed;
    left: 16px;
    top: 16px;
    max-width: 380px;
    padding: 12px 14px;
    border: 1px solid #d4dbe7;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 12px rgba(15, 23, 42, 0.12);
    color: #1f2937;
    font: 13px system-ui, sans-serif;
    z-index: 10;
  }
  .supply-overlay h1 {
    margin: 0 0 6px;
    font-size: 15px;
  }
  .supply-overlay p {
    margin: 0;
    line-height: 1.45;
  }
  .supply-overlay a {
    color: #6f42c1;
  }
  .button-group {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .button-group-label {
    flex: 0 0 100%;
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .button-group button {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #f8fafc;
    color: #334155;
    cursor: pointer;
    font: inherit;
    padding: 4px 8px;
  }
  .button-group button.active {
    border-color: #6f42c1;
    background: #6f42c1;
    color: #fff;
  }
`
document.head.appendChild(style)

const overlay = document.createElement('aside')
overlay.className = 'supply-overlay'
overlay.innerHTML = `
  <h1>Zhongshan Wei Li Supply Chain</h1>
  <p data-summary></p>
  <div class="button-group depth-buttons" aria-label="Path depth">
    <span class="button-group-label">Path depth</span>
    <button type="button" data-depth="0">Depth 0</button>
    <button type="button" data-depth="1">1</button>
    <button type="button" data-depth="2">2</button>
    <button type="button" data-depth="3">3</button>
    <button type="button" data-depth="4">4</button>
  </div>
  <div class="button-group edge-path-buttons" aria-label="Sugiyama edge paths" data-sugiyama-control>
    <span class="button-group-label">Route type</span>
    <button type="button" data-edge-path="curve">Curve</button>
    <button type="button" data-edge-path="orthogonal">Orthogonal</button>
    <button type="button" data-edge-path="straight">Straight</button>
  </div>
  <div class="button-group spline-smoothing-buttons" aria-label="Spline smoothing" data-sugiyama-control data-spline-route-control>
    <span class="button-group-label">Spline smoothing</span>
    <button type="button" data-spline-smoothing="0">0</button>
    <button type="button" data-spline-smoothing="1">1</button>
    <button type="button" data-spline-smoothing="2">2</button>
    <button type="button" data-spline-smoothing="3">3</button>
  </div>
  <div class="button-group orthogonal-mode-buttons" aria-label="Orthogonal route mode" data-sugiyama-control data-orthogonal-route-control>
    <span class="button-group-label">Orthogonal mode</span>
    <button type="button" data-orthogonal-mode="bus">Bus</button>
    <button type="button" data-orthogonal-mode="control-points">Control points</button>
  </div>
  <div class="button-group orthogonal-radius-buttons" aria-label="Orthogonal corner radius" data-sugiyama-control data-orthogonal-route-control>
    <span class="button-group-label">Orthogonal corners</span>
    <button type="button" data-orthogonal-radius="sharp">Sharp</button>
    <button type="button" data-orthogonal-radius="rounded">Rounded</button>
  </div>
  <div class="button-group orthogonal-spacing-buttons" aria-label="Orthogonal bus spacing" data-sugiyama-control data-orthogonal-route-control data-bus-route-control>
    <span class="button-group-label">Bus spacing</span>
    <button type="button" data-orthogonal-spacing="tight">Tight</button>
    <button type="button" data-orthogonal-spacing="normal">Normal</button>
    <button type="button" data-orthogonal-spacing="wide">Wide</button>
  </div>
  <div class="button-group fan-routing-buttons" aria-label="Fan routing" data-sugiyama-control data-orthogonal-route-control>
    <span class="button-group-label">Fan routing</span>
    <button type="button" data-fan-routing="on">On</button>
    <button type="button" data-fan-routing="off">Off</button>
  </div>
  <div class="button-group corridor-buttons" aria-label="Edge corridors" data-sugiyama-control data-orthogonal-route-control>
    <span class="button-group-label">Corridors</span>
    <button type="button" data-corridors="on">On</button>
    <button type="button" data-corridors="off">Off</button>
  </div>
  <div class="button-group back-edge-buttons" aria-label="Feedback edge routing" data-sugiyama-control>
    <span class="button-group-label">Back edges</span>
    <button type="button" data-back-edges="loop">Loop</button>
    <button type="button" data-back-edges="route">Route</button>
    <button type="button" data-back-edges="hide">Hide</button>
  </div>
  <div class="button-group breadth-alignment-buttons" aria-label="Sugiyama breadth alignment" data-sugiyama-control>
    <span class="button-group-label">Layer align</span>
    <button type="button" data-breadth-alignment="min">Min</button>
    <button type="button" data-breadth-alignment="center">Center</button>
    <button type="button" data-breadth-alignment="max">Max</button>
  </div>
  <div class="button-group orientation-buttons" aria-label="Sugiyama orientation" data-sugiyama-control>
    <span class="button-group-label">Orientation</span>
    <button type="button" data-orientation="top">Top</button>
    <button type="button" data-orientation="right">Right</button>
    <button type="button" data-orientation="bottom">Bottom</button>
    <button type="button" data-orientation="left">Left</button>
  </div>
  <div class="button-group ordering-buttons" aria-label="Sugiyama ordering" data-sugiyama-control>
    <span class="button-group-label">Ordering</span>
    <button type="button" data-ordering="sifting">Sifting</button>
    <button type="button" data-ordering="barycenter">Barycenter</button>
  </div>
  <div class="button-group ordering-iterations-buttons" aria-label="Ordering iterations" data-sugiyama-control>
    <span class="button-group-label">Ordering iterations</span>
    <button type="button" data-ordering-iterations="1">1</button>
    <button type="button" data-ordering-iterations="3">3</button>
    <button type="button" data-ordering-iterations="6">6</button>
    <button type="button" data-ordering-iterations="12">12</button>
  </div>
  <div class="button-group coordinate-iterations-buttons" aria-label="Coordinate iterations" data-sugiyama-control>
    <span class="button-group-label">Coordinate iterations</span>
    <button type="button" data-coordinate-iterations="1">1</button>
    <button type="button" data-coordinate-iterations="3">3</button>
    <button type="button" data-coordinate-iterations="6">6</button>
    <button type="button" data-coordinate-iterations="12">12</button>
  </div>
  <div class="button-group max-sifting-rounds-buttons" aria-label="Max sifting rounds" data-sugiyama-control>
    <span class="button-group-label">Sifting rounds</span>
    <button type="button" data-max-sifting-rounds="1">1</button>
    <button type="button" data-max-sifting-rounds="3">3</button>
    <button type="button" data-max-sifting-rounds="6">6</button>
  </div>
  <div class="button-group port-grouping-buttons" aria-label="Port grouping" data-sugiyama-control>
    <span class="button-group-label">Port grouping</span>
    <button type="button" data-port-grouping="on">On</button>
    <button type="button" data-port-grouping="off">Off</button>
  </div>
  <div class="button-group bundling-buttons" aria-label="Long-edge bundling" data-sugiyama-control>
    <span class="button-group-label">Bundling</span>
    <button type="button" data-bundling="on">On</button>
    <button type="button" data-bundling="off">Off</button>
  </div>
  <div class="button-group confluent-bundling-buttons" aria-label="Confluent edge bundling" data-sugiyama-control>
    <span class="button-group-label">Confluent</span>
    <button type="button" data-confluent-bundling="on">On</button>
    <button type="button" data-confluent-bundling="off">Off</button>
  </div>
  <div class="button-group layout-buttons" aria-label="Layout">
    <span class="button-group-label">Layout</span>
    <button type="button" data-layout="sugiyama">Sugiyama</button>
    <button type="button" data-layout="hierarchy">Hierarchy</button>
    <button type="button" data-layout="force">Force</button>
  </div>
  <p style="margin-top: 8px;" data-source></p>
  <p style="margin-top: 8px;">
    <a href="/">Back to examples</a>
  </p>
`
document.body.appendChild(overlay)

function updateOverlaySummary() {
  const sourceNode = layoutGraph.nodes.find((node) => node.tier === 1)
  const summary = overlay.querySelector<HTMLElement>('[data-summary]')
  const source = overlay.querySelector<HTMLElement>('[data-source]')
  if (summary !== null) {
    const edgePathLabel =
      currentEdgePath === 'straight'
        ? 'straight'
        : currentEdgePath === 'orthogonal'
        ? `orthogonal ${currentOrthogonalMode}, ${currentOrthogonalRadius} corners, ${currentOrthogonalSpacing} bus spacing, fan routing ${
            currentFanRouting ? 'on' : 'off'
          }, corridors ${currentCorridors ? 'on' : 'off'}`
        : `curved, smoothing ${currentSplineSmoothing}`
    const alignmentText = isSugiyamaLayout() ? `, ${currentBreadthAlignment} aligned layers` : ''
    const tuningText = isSugiyamaLayout()
      ? `, ${currentOrderingIterations} ordering iterations, ${currentCoordinateIterations} coordinate iterations, ${currentMaxSiftingRounds} sifting rounds, port grouping ${
          currentPortGrouping ? 'on' : 'off'
        }, bundling ${currentBundling ? 'on' : 'off'}, confluent ${currentConfluentBundling ? 'on' : 'off'}`
      : ''
    const layoutOptionText = isSugiyamaLayout() ? `, ${currentOrientation} orientation, ${currentOrdering} ordering${tuningText}` : ''
    const backEdgeText = isSugiyamaLayout() ? `, ${currentBackEdges} back edges` : ''
    const coordinateText = isSugiyamaLayout()
      ? ` Brandes-Köpf coordinates, ${edgePathLabel} edge paths${alignmentText}${layoutOptionText}${backEdgeText}.`
      : ''
    const metrics =
      layoutGraph.metrics === undefined
        ? ''
        : ` Reversed ${layoutGraph.metrics.reversedEdgeCount.toLocaleString()} edges, inserted ${layoutGraph.metrics.virtualNodeCount.toLocaleString()} virtual nodes, found ${layoutGraph.metrics.crossingCount.toLocaleString()} crossings, routed ${layoutGraph.metrics.routedSegmentCount.toLocaleString()} segments through ${layoutGraph.metrics.confluentBundleCount.toLocaleString()} confluent bundles and ${layoutGraph.metrics.fanTrunkCount.toLocaleString()} fan trunks across ${layoutGraph.metrics.corridorTrackCount.toLocaleString()} corridor tracks, extent ${Math.round(
            layoutGraph.metrics.coordinateExtent.width
          ).toLocaleString()} x ${Math.round(layoutGraph.metrics.coordinateExtent.height).toLocaleString()}.`
    summary.textContent = `${layoutGraph.nodes.length.toLocaleString()} entities and ${layoutGraph.edges.length.toLocaleString()} deduplicated relationships from ${raw.data.paths.length.toLocaleString()} paths at depth ${currentDepth}.${coordinateText}${metrics} Node size scales by path frequency.`
  }
  if (source !== null) source.textContent = `Source: ${sourceNode?.label ?? 'unknown'}.`
}

overlay.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach((button) => {
  const layout = button.dataset.layout as LayoutKind
  layoutButtons.set(layout, button)
  button.onclick = () => applyLayout(layout)
})
overlay.querySelectorAll<HTMLButtonElement>('[data-depth]').forEach((button) => {
  const value = Number(button.dataset.depth)
  if (!PATH_DEPTHS.includes(value as PathDepth)) return
  const depth = value as PathDepth
  depthButtons.set(depth, button)
  button.onclick = () => applyDepth(depth)
})
overlay.querySelectorAll<HTMLButtonElement>('[data-edge-path]').forEach((button) => {
  const edgePath = button.dataset.edgePath as EdgePathKind
  if (!EDGE_PATH_KINDS.includes(edgePath)) return
  edgePathButtons.set(edgePath, button)
  button.onclick = () => applyEdgePath(edgePath)
})
overlay.querySelectorAll<HTMLButtonElement>('[data-orthogonal-mode]').forEach((button) => {
  const mode = button.dataset.orthogonalMode as OrthogonalMode
  if (!ORTHOGONAL_MODES.includes(mode)) return
  orthogonalModeButtons.set(mode, button)
  button.onclick = () => {
    currentOrthogonalMode = mode
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-orthogonal-radius]').forEach((button) => {
  const radius = button.dataset.orthogonalRadius as OrthogonalRadius
  if (!ORTHOGONAL_RADII.includes(radius)) return
  orthogonalRadiusButtons.set(radius, button)
  button.onclick = () => {
    currentOrthogonalRadius = radius
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-orthogonal-spacing]').forEach((button) => {
  const spacing = button.dataset.orthogonalSpacing as OrthogonalSpacing
  if (!ORTHOGONAL_SPACINGS.includes(spacing)) return
  orthogonalSpacingButtons.set(spacing, button)
  button.onclick = () => {
    currentOrthogonalSpacing = spacing
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-fan-routing]').forEach((button) => {
  const value = button.dataset.fanRouting
  if (!BOOLEAN_TOGGLE_VALUES.includes(value as (typeof BOOLEAN_TOGGLE_VALUES)[number])) return
  const enabled = value === 'on'
  fanRoutingButtons.set(enabled, button)
  button.onclick = () => {
    currentFanRouting = enabled
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-corridors]').forEach((button) => {
  const value = button.dataset.corridors
  if (!BOOLEAN_TOGGLE_VALUES.includes(value as (typeof BOOLEAN_TOGGLE_VALUES)[number])) return
  const enabled = value === 'on'
  corridorButtons.set(enabled, button)
  button.onclick = () => {
    currentCorridors = enabled
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-spline-smoothing]').forEach((button) => {
  const smoothing = Number(button.dataset.splineSmoothing)
  if (!SPLINE_SMOOTHINGS.includes(smoothing as SplineSmoothing)) return
  const value = smoothing as SplineSmoothing
  splineSmoothingButtons.set(value, button)
  button.onclick = () => {
    currentSplineSmoothing = value
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-back-edges]').forEach((button) => {
  const backEdges = button.dataset.backEdges as BackEdgeRouting
  if (!BACK_EDGE_ROUTINGS.includes(backEdges)) return
  backEdgeButtons.set(backEdges, button)
  button.onclick = () => {
    currentBackEdges = backEdges
    applyRouteOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-breadth-alignment]').forEach((button) => {
  const alignment = button.dataset.breadthAlignment as BreadthAlignment
  if (!BREADTH_ALIGNMENTS.includes(alignment)) return
  breadthAlignmentButtons.set(alignment, button)
  button.onclick = () => {
    currentBreadthAlignment = alignment
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-orientation]').forEach((button) => {
  const orientation = button.dataset.orientation as Orientation
  if (!ORIENTATIONS.includes(orientation)) return
  orientationButtons.set(orientation, button)
  button.onclick = () => {
    currentOrientation = orientation
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-ordering]').forEach((button) => {
  const ordering = button.dataset.ordering as Ordering
  if (!ORDERINGS.includes(ordering)) return
  orderingButtons.set(ordering, button)
  button.onclick = () => {
    currentOrdering = ordering
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-ordering-iterations]').forEach((button) => {
  const iterations = Number(button.dataset.orderingIterations)
  if (!ORDERING_ITERATIONS.includes(iterations as OrderingIterations)) return
  const value = iterations as OrderingIterations
  orderingIterationsButtons.set(value, button)
  button.onclick = () => {
    currentOrderingIterations = value
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-coordinate-iterations]').forEach((button) => {
  const iterations = Number(button.dataset.coordinateIterations)
  if (!COORDINATE_ITERATIONS.includes(iterations as CoordinateIterations)) return
  const value = iterations as CoordinateIterations
  coordinateIterationsButtons.set(value, button)
  button.onclick = () => {
    currentCoordinateIterations = value
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-max-sifting-rounds]').forEach((button) => {
  const rounds = Number(button.dataset.maxSiftingRounds)
  if (!MAX_SIFTING_ROUNDS.includes(rounds as MaxSiftingRounds)) return
  const value = rounds as MaxSiftingRounds
  maxSiftingRoundsButtons.set(value, button)
  button.onclick = () => {
    currentMaxSiftingRounds = value
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-port-grouping]').forEach((button) => {
  const value = button.dataset.portGrouping
  if (!BOOLEAN_TOGGLE_VALUES.includes(value as (typeof BOOLEAN_TOGGLE_VALUES)[number])) return
  const enabled = value === 'on'
  portGroupingButtons.set(enabled, button)
  button.onclick = () => {
    currentPortGrouping = enabled
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-bundling]').forEach((button) => {
  const value = button.dataset.bundling
  if (!BOOLEAN_TOGGLE_VALUES.includes(value as (typeof BOOLEAN_TOGGLE_VALUES)[number])) return
  const enabled = value === 'on'
  bundlingButtons.set(enabled, button)
  button.onclick = () => {
    currentBundling = enabled
    applySugiyamaLayoutOption()
  }
})
overlay.querySelectorAll<HTMLButtonElement>('[data-confluent-bundling]').forEach((button) => {
  const value = button.dataset.confluentBundling
  if (!BOOLEAN_TOGGLE_VALUES.includes(value as (typeof BOOLEAN_TOGGLE_VALUES)[number])) return
  const enabled = value === 'on'
  confluentBundlingButtons.set(enabled, button)
  button.onclick = () => {
    currentConfluentBundling = enabled
    applySugiyamaLayoutOption()
  }
})
syncLayoutButtons()
syncDepthButtons()
syncRouteOptionButtons()
syncLayoutOptionButtons()
updateOverlaySummary()

const zoomBy = (factor: number) => {
  const nextZoom = clampZoom(state.minZoom, state.maxZoom, state.viewport[VIEWPORT_ZOOM] * factor)
  state.updateViewport({ x: state.viewport[VIEWPORT_X], y: state.viewport[VIEWPORT_Y], zoom: nextZoom })
}

const zoom = ZoomControl({ container: app })
zoom({ onZoomIn: () => zoomBy(1.6), onZoomOut: () => zoomBy(1 / 1.6) })

const download = DownloadControl({ container: app })
download({ top: 90, fileName: 'zhongshan-supply-chain.png', onDownload: () => renderer.exportImage() })
