import {
  GraphState,
  Renderer,
  FPSOverlay,
  DOMInteractionHandler,
  VIEWPORT_X,
  VIEWPORT_Y,
  VIEWPORT_ZOOM,
  Id,
  Node,
  Edge,
  NodeStyle,
  EdgeStyle,
  NodeLabelStyle,
  EdgeLabelStyle,
  NodeIcon,
  Viewport,
  PathPoint,
  smoothPath,
  routeOrthogonal
} from '@sayari/trellis'
import {
  interpolatePosition,
  interpolateViewport,
  animate,
  smootherstep,
  gridGraph,
  clusteredGraph,
  egoForestGraph,
  treeGraph
} from '@sayari/trellis-utils'
import { Layout as SugiyamaLayout } from '@sayari/trellis-sugiyama'
import { Layout as HierarchyLayout } from '@sayari/trellis-hierarchy'
import { Layout as ForceLayout } from '@sayari/trellis-force'
import { forceSimulation, forceManyBody, forceLink, forceCollide, forceCenter, forceX, forceY } from 'd3-force'
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'
import { Control as ZoomControl, clampZoom } from '@sayari/trellis-controls/zoom'
import { Control as DownloadControl } from '@sayari/trellis-controls/download'
import { Control as SelectionControl } from '@sayari/trellis-controls/selection'

// node/link datum types for the d3-force comparison tab (d3 mutates these with x/y/vx/vy/index)
type D3Node = SimulationNodeDatum & { id: Id; radius: number }
type D3Link = SimulationLinkDatum<D3Node>

const app = document.querySelector<HTMLDivElement>('#app')
if (app === null) throw new Error('Could not find #app container')
const canvas = document.createElement('canvas')
app.appendChild(canvas)

/************************************
 * define styles
 ************************************/
const nodeLabel: NodeLabelStyle = {
  fontSize: 8,
  textColor: 0x222222,
  textPosition: 'bottom',
  textOutlineWidth: 0.5,
  textOutlineColor: 0xffffff
}
const edgeLabel: EdgeLabelStyle = { fontSize: 6, textColor: 0xaaaaaa, textOutlineWidth: 0.5, textOutlineColor: 0xffffff }
const icon: NodeIcon = { type: 'textIcon', content: 'T', fontSize: 10, color: 0xffffff }
const arrow = 'forward' as const

const NODE_STYLE = 0
const NODE_HOVER_STYLE = 1
const NODE_SELECTED_STYLE = 2
const ORANGE = 0xffa500
const ORANGE_FILL = 0xffcc80

// per-branch lane colors for the git-tree (sugiyama) view: index 0 is "main". Both a node style (filled
// dot) and an edge style (lane line) are generated for each, so commits and their lanes share a color.
const BRANCH_COLORS: { fill: number; stroke: number }[] = [
  { fill: 0x7a5dc5, stroke: 0xccaadd }, // purple (main)
  { fill: 0x2ca02c, stroke: 0xb5e0b5 }, // green
  { fill: 0xff7f0e, stroke: 0xffd1a3 }, // orange
  { fill: 0x1f77b4, stroke: 0xb0d4ea }, // blue
  { fill: 0xd62728, stroke: 0xf3aeae }, // red
  { fill: 0x17becf, stroke: 0xaee8ef }, // teal
  { fill: 0xe377c2, stroke: 0xf6cce9 }, // pink
  { fill: 0x8c564b, stroke: 0xd5b6b1 } // brown
]

// base node styles (grid view + interaction states), then one filled-dot style per branch color
const BRANCH_NODE_STYLE_OFFSET = 3
const nodeStyles: NodeStyle[] = [
  { fillColor: 0x7a5dc5, strokeWidth: 4, strokeColor: 0xccaadd, label: nodeLabel, icon }, // PURPLE / LIGHT_PURPLE
  { fillColor: 0xff6666, strokeWidth: 4, strokeColor: 0xffcccc, label: nodeLabel, icon }, // hover
  { fillColor: ORANGE_FILL, strokeWidth: 4, strokeColor: ORANGE, label: nodeLabel, icon }, // selected (orange fill + stroke)
  ...BRANCH_COLORS.map((c): NodeStyle => ({ fillColor: c.fill, strokeWidth: 3, strokeColor: c.stroke, label: nodeLabel }))
]

// base edge styles (grid + hover), then one lane-line style per branch color (no arrowheads — git lines)
const EDGE_STYLE = 0
const EDGE_HOVER_STYLE = 1
const BRANCH_EDGE_STYLE_OFFSET = 2
const edgeStyles: EdgeStyle[] = [
  { fillColor: 0xaaaaaa, label: edgeLabel, arrow },
  { fillColor: 0xff6666, label: edgeLabel, arrow }, // hover
  ...BRANCH_COLORS.map((c): EdgeStyle => ({ fillColor: c.fill }))
]

// Switching layout or size regenerates a graph and positions it. 'none' keeps native positions.
type LayoutKind = 'none' | 'force' | 'd3force' | 'sugiyama' | 'hierarchy'
type SizeKind = 'S' | 'M' | 'L'

// Node counts per layout; synchronous layouts stay below their practical demo limits.
const COUNTS: Record<LayoutKind, Record<SizeKind, number>> = {
  none: { S: 1_000, M: 10_000, L: 100_000 },
  force: { S: 500, M: 1_500, L: 3_000 },
  d3force: { S: 200, M: 500, L: 1_000 },
  sugiyama: { S: 60, M: 300, L: 1_200 },
  hierarchy: { S: 200, M: 1_000, L: 3_000 }
}

const sugiyama = SugiyamaLayout()
const hierarchy = HierarchyLayout()
const forceOptions = {
  ticks: 300,
  collidePadding: 8,
  params: {
    chargeStrength: -400,
    theta: 1.1,
    distanceMax: 3000,
    linkDistance: 140,
    gravityStrength: 0.02,
    centerStrength: 1
  }
}

const EDGE_WIDTH = 5
const rnd = (n: number) => Math.floor(Math.random() * n)
const shortSha = (n: number) => (((n + 1) * 2654435761) >>> 0).toString(16).padStart(8, '0').slice(0, 7)

/**
 * Simulate a git DAG with colored branch lanes and merge commits.
 */
const gitGraph = (nodeCount: number): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let id = 0
  let eid = 0

  const commit = (color: number): number => {
    const nid = id++
    nodes.push({ id: nid, x: 0, y: 0, radius: 11, style: BRANCH_NODE_STYLE_OFFSET + color, label: shortSha(nid) })
    return nid
  }
  const connect = (parent: number, child: number, color: number) => {
    edges.push({ id: `e${eid++}`, source: parent, target: child, width: EDGE_WIDTH, style: BRANCH_EDGE_STYLE_OFFSET + color })
  }

  type Branch = { color: number; tip: number }
  const main: Branch = { color: 0, tip: commit(0) }
  const branches: Branch[] = [main]
  const freeColors: number[] = BRANCH_COLORS.map((_, i) => i).slice(1) // every color but main's

  while (id < nodeCount) {
    const r = Math.random()
    const canFork = freeColors.length > 0 && id < nodeCount - 1

    if (canFork && r < 0.26) {
      const from = branches[rnd(branches.length)]
      const color = freeColors.shift()!
      const child = commit(color)
      connect(from.tip, child, color)
      branches.push({ color, tip: child })
    } else if (branches.length > 1 && r < 0.42) {
      const branchIndex = 1 + rnd(branches.length - 1)
      const branch = branches[branchIndex]
      const merge = commit(main.color)
      connect(main.tip, merge, main.color)
      connect(branch.tip, merge, branch.color) // spans layers -> curve
      main.tip = merge
      freeColors.push(branch.color)
      branches.splice(branchIndex, 1)
    } else {
      const branch = branches[rnd(branches.length)]
      const child = commit(branch.color)
      connect(branch.tip, child, branch.color)
      branch.tip = child
    }
  }

  return { nodes, edges }
}

const state = new GraphState({ minZoom: 0.025, maxZoom: 4, nodeStyles, edgeStyles })

const pixelRatio = 2
const resize = () => {
  canvas.width = Math.round(window.innerWidth * pixelRatio)
  canvas.height = Math.round(window.innerHeight * pixelRatio)
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
}
window.addEventListener('resize', resize)
resize()
new FPSOverlay()
const renderer = new Renderer({ canvas, state, pixelRatio })

/************************************
 * live graph data (swapped by the navbar; interaction handlers read these bindings)
 ************************************/
let nodes: Node[] = []
let edges: Edge[] = []
let nodesById = new Map<Id, Node>()
let edgesByNode = new Map<Id, Id[]>()
// each node/edge's resting style (its branch color in the git view); restored after hover/deselect
let baseNodeStyleById = new Map<Id, number>()
let baseEdgeStyleById = new Map<Id, number>()
// edge shaping state for the sugiyama view: whether edges currently carry a path, and (for curved mode)
// each edge's routing waypoints. `shapeEdges` rebuilds all paths from current node positions using these.
let edgesShaped = false
let edgeWaypoints = new Map<Id, PathPoint[]>()
// each node's generator-native position, restored by the 'none' layout
let nativePositions = new Map<Id, { x: number; y: number }>()
// monotonic id allocators for incrementally added nodes/edges (never collide with the generator's ids)
let nextNodeId = 0
let nextEdgeSeq = 0
const selected = new Set<Id>()

// fit the camera to a set of points' bounding box (defaults to the current graph; pass layout targets to frame
// the result while nodes animate toward it)
const fitViewport = (points: { x: number; y: number }[] = nodes) => {
  if (points.length === 0) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of points) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x)
    maxY = Math.max(maxY, n.y)
  }
  const worldW = maxX - minX || 1
  const worldH = maxY - minY || 1
  const zoom = clampZoom(state.minZoom, state.maxZoom, 0.9 * Math.min(window.innerWidth / worldW, window.innerHeight / worldH))
  state.updateViewport({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom })
}

let stopNodePositionTransition: (() => void) | undefined

const afterNextPaint = (callback: () => void) => {
  let frame = requestAnimationFrame(() => {
    frame = 0
    callback()
  })
  return () => {
    if (frame !== 0) cancelAnimationFrame(frame)
  }
}

/************************************
 * graph generation — each layout gets graph topology suited to it
 ************************************/
const generate = (layout: LayoutKind, size: SizeKind): { nodes: Node[]; edges: Edge[] } => {
  const count = COUNTS[layout][size]
  if (layout === 'none') {
    const graph = gridGraph({ size: count, step: 100, sample: 0.5, radius: 18, nodeStyle: NODE_STYLE, edgeStyle: EDGE_STYLE })
    for (const node of graph.nodes) node.label = `${Math.round(node.x)}|${Math.round(node.y)}`
    return graph
  }
  if (layout === 'sugiyama') return gitGraph(count) // DAG with branch-colored lanes (pairs with the sugiyama layout)
  if (layout === 'hierarchy') {
    return treeGraph({ size: count, maxChildren: 4, seed: 42, radius: 14, nodeStyle: NODE_STYLE, edgeStyle: EDGE_STYLE })
  }
  if (layout === 'd3force') {
    const clusters = Math.min(12, Math.max(4, Math.round(count / 100)))
    const clusterSize = Math.round(count / clusters)
    return clusteredGraph({ clusters, clusterSize, intra: 0.15, seed: 42, radius: 14, nodeStyle: NODE_STYLE, edgeStyle: EDGE_STYLE })
  }
  return egoForestGraph({
    size: count,
    hubs: Math.max(3, Math.round(Math.sqrt(count) / 3)),
    subHubProbability: 0.04,
    bridges: Math.max(2, Math.round(Math.sqrt(count) / 4)),
    seed: 42,
    radius: 14,
    nodeStyle: NODE_STYLE,
    edgeStyle: EDGE_STYLE
  })
}

const rebuildIndexes = () => {
  nodesById = new Map()
  edgesByNode = new Map()
  baseNodeStyleById = new Map()
  baseEdgeStyleById = new Map()
  for (const node of nodes) {
    nodesById.set(node.id, node)
    edgesByNode.set(node.id, [])
    baseNodeStyleById.set(node.id, node.style)
  }
  for (const edge of edges) {
    edgesByNode.get(edge.source)?.push(edge.id)
    edgesByNode.get(edge.target)?.push(edge.id)
    baseEdgeStyleById.set(edge.id, edge.style)
  }
}

const setGraph = (newNodes: Node[], newEdges: Edge[]) => {
  stopNodePositionTransition?.()
  state.clearGraph()
  selected.clear()
  edgesShaped = false
  edgeWaypoints = new Map()
  nodes = newNodes
  edges = newEdges
  nextNodeId = 0
  for (const n of nodes) if (typeof n.id === 'number' && n.id >= nextNodeId) nextNodeId = n.id + 1
  nextEdgeSeq = 0
  nativePositions = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
  rebuildIndexes()
  state.addNodes(nodes)
  state.addEdges(edges)
}

type Position = { id: Id; x: number; y: number }

// Rebuild sugiyama edge paths from current node positions.
const shapeEdges = () => {
  if (edgesShaped && currentEdges === 'orthogonal') {
    const routed = routeOrthogonal(
      edges.map((e) => ({ id: e.id, source: nodesById.get(e.source)!, target: nodesById.get(e.target)! })),
      { flow: 'vertical', radius: 0, spacing: 10 }
    )
    for (const e of edges) e.path = routed.get(e.id)
  } else if (edgesShaped && currentEdges === 'curved') {
    for (const e of edges) {
      const source = nodesById.get(e.source)!
      const target = nodesById.get(e.target)!
      const waypoints = edgeWaypoints.get(e.id)
      e.path = waypoints && waypoints.length > 0 ? smoothPath([source, ...waypoints, target]) : undefined
    }
  } else {
    for (const e of edges) e.path = undefined
  }
  state.updateEdgePaths(edges.map((e) => ({ id: e.id, path: e.path })))
}

type RelayoutOptions = {
  fit?: boolean
  forceAnchor?: Id | 'centroid'
}

const forceTargets = (anchor?: Id | 'centroid'): Position[] => {
  const starts = nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }))
  const layoutState = state.clone()
  ForceLayout(layoutState, forceOptions).run()
  const byId = new Map<Id, Position>()
  for (let slot = 0; slot < layoutState.nodeSlotCount; slot++) {
    const id = layoutState.nodeIds[slot]
    byId.set(id, { id, x: layoutState.nodePositions[slot * 2], y: layoutState.nodePositions[slot * 2 + 1] })
  }

  let targets = nodes.map((node) => byId.get(node.id) ?? { id: node.id, x: node.x, y: node.y })
  if (anchor === undefined) return targets

  let dx = 0
  let dy = 0
  if (anchor === 'centroid') {
    for (let i = 0; i < starts.length; i++) {
      dx += targets[i].x - starts[i].x
      dy += targets[i].y - starts[i].y
    }
    dx /= starts.length || 1
    dy /= starts.length || 1
  } else {
    const start = starts.find((position) => position.id === anchor)
    const target = targets.find((position) => position.id === anchor)
    if (start !== undefined && target !== undefined) {
      dx = target.x - start.x
      dy = target.y - start.y
    }
  }
  if (dx !== 0 || dy !== 0) targets = targets.map((target) => ({ ...target, x: target.x - dx, y: target.y - dy }))
  return targets
}

// Re-position the current nodes; sugiyama also shapes edges per `currentEdges`.
const applyLayout = (layout: LayoutKind, withAnimation: boolean, options: RelayoutOptions = {}) => {
  const { fit = true, forceAnchor } = options
  stopNodePositionTransition?.()
  stopNodePositionTransition = undefined
  edgeWaypoints = new Map()

  let targets: Position[]
  if (layout === 'none') {
    targets = nodes.map((n) => {
      const p = nativePositions.get(n.id)
      return { id: n.id, x: p?.x ?? n.x, y: p?.y ?? n.y }
    })
  } else if (layout === 'force') {
    targets = forceTargets(fit ? undefined : forceAnchor)
  } else if (layout === 'd3force') {
    const d3nodes: D3Node[] = nodes.map((n) => ({ id: n.id, radius: n.radius, x: n.x, y: n.y }))
    const d3edges: D3Link[] = edges.map((e) => ({ source: e.source, target: e.target }))
    const simulation = forceSimulation<D3Node, D3Link>(d3nodes)
      .velocityDecay(0.6)
      .force('charge', forceManyBody<D3Node>().distanceMax(4000).theta(0.9).strength(-600))
      .force(
        'link',
        forceLink<D3Node, D3Link>(d3edges)
          .id((d) => d.id)
          .distance(180)
      )
      .force(
        'collide',
        forceCollide<D3Node>().radius((d) => d.radius + 8)
      )
      .force('center', forceCenter<D3Node>())
      .force('x', forceX<D3Node>(0).strength(0.02))
      .force('y', forceY<D3Node>(0).strength(0.02))
      .stop()
    for (let i = 0; i < 300; i++) simulation.tick()
    targets = d3nodes.map((d) => ({ id: d.id, x: d.x ?? 0, y: d.y ?? 0 }))
  } else if (layout === 'sugiyama') {
    // sugiyama (DAG). On a cyclic / non-DAG graph it may fail; fall back to the current positions.
    try {
      const { nodes: positioned } = sugiyama({
        nodes,
        edges,
        options: {
          anchor: 'top',
          nodeSize: [64, 56],
          // Capture routing waypoints; shapeEdges rebuilds paths from live node positions.
          applyEdge: (edge, edgeLayout) => {
            if (edgeLayout.controlPoints.length > 0)
              edgeWaypoints.set(
                edge.id,
                edgeLayout.controlPoints.map((p) => ({ x: p.x, y: p.y }))
              )
            return edge
          }
        }
      })
      const byId = new Map(positioned.map((p) => [p.id, p]))
      targets = nodes.map((n) => {
        const p = byId.get(n.id)
        return { id: n.id, x: p?.x ?? n.x, y: p?.y ?? n.y }
      })
    } catch (error) {
      console.warn('sugiyama layout failed (likely a non-DAG); keeping current positions', error) // eslint-disable-line no-console
      edgeWaypoints = new Map()
      targets = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))
    }
  } else {
    const root = nodes[0]
    if (root === undefined) {
      targets = []
    } else {
      const { nodes: positioned } = hierarchy(root.id, {
        nodes,
        edges,
        options: {
          anchor: 'top',
          nodeSize: [80, 140],
          alignment: 'mid'
        }
      })
      const byId = new Map(positioned.map((p) => [p.id, p]))
      targets = nodes.map((n) => {
        const p = byId.get(n.id)
        return { id: n.id, x: p?.x ?? n.x, y: p?.y ?? n.y }
      })
    }
  }

  edgesShaped = layout === 'sugiyama' && currentEdges !== 'straight'
  for (const edge of edges) edge.path = undefined
  state.updateEdgePaths(edges.map((edge) => ({ id: edge.id, path: undefined })))

  const commit = (positions: Position[]) => {
    state.updateNodePositions(positions)
    for (const { id, x, y } of positions) {
      const node = nodesById.get(id)
      if (node !== undefined) {
        node.x = x
        node.y = y
      }
    }
  }

  if (fit) fitViewport(targets)
  if (withAnimation) {
    const at = interpolatePosition(nodes, targets)
    let stopAnimation: (() => void) | undefined
    commit(at(0))
    if (edgesShaped) shapeEdges()
    const stopDelay = afterNextPaint(() => {
      stopAnimation = animate(1600, (t) => {
        const eased = smootherstep(t)
        commit(at(eased))
        if (edgesShaped) shapeEdges()
      })
    })
    stopNodePositionTransition = () => {
      stopDelay()
      stopAnimation?.()
    }
  } else {
    commit(targets)
    shapeEdges()
  }
}

// Generate a graph for the selected layout + size, then lay it out.
const loadGraph = (layout: LayoutKind, size: SizeKind) => {
  const graph = generate(layout, size)
  setGraph(graph.nodes, graph.edges)
  applyLayout(layout, false)
  console.log(`${layout} ${size}: ${nodes.length} nodes, ${edges.length} edges`) // eslint-disable-line no-console
}

// re-run the current layout on the current graph (Layout / Edges buttons, and after add/remove)
const relayout = (withAnimation = true, options: RelayoutOptions = {}) => applyLayout(currentLayout, withAnimation, options)

/************************************
 * incremental add / remove
 ************************************/
// delete the selected nodes (state cascades their edges) and recompute the layout
const deleteSelected = () => {
  if (selected.size === 0) return
  const remove = new Set(selected)
  let remainingNodes = nodes.filter((n) => !remove.has(n.id))
  let remainingEdges = edges.filter((e) => !remove.has(e.source) && !remove.has(e.target))

  // Deleting a hub should not leave behind one-edge leaves that are now disconnected.
  const degree = new Map<Id, number>(remainingNodes.map((node) => [node.id, 0]))
  for (const edge of remainingEdges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  for (const edge of edges) {
    if (remove.has(edge.source) && degree.get(edge.target) === 0) remove.add(edge.target)
    if (remove.has(edge.target) && degree.get(edge.source) === 0) remove.add(edge.source)
  }
  if (remove.size > selected.size) {
    remainingNodes = remainingNodes.filter((n) => !remove.has(n.id))
    remainingEdges = remainingEdges.filter((e) => !remove.has(e.source) && !remove.has(e.target))
  }

  state.deleteNodes([...remove])
  nodes = remainingNodes
  edges = remainingEdges
  for (const id of remove) nativePositions.delete(id)
  selected.clear()
  rebuildIndexes()
  relayout(true, { fit: false, forceAnchor: 'centroid' })
}

const expandedNodeStyle = (source: Node) => (currentLayout === 'sugiyama' ? source.style : NODE_STYLE)
const expandedEdgeStyle = (source: Node) => {
  if (currentLayout !== 'sugiyama') return EDGE_STYLE
  const branch = Math.max(0, source.style - BRANCH_NODE_STYLE_OFFSET)
  return BRANCH_EDGE_STYLE_OFFSET + (branch % BRANCH_COLORS.length)
}

// add a handful of new leaf nodes linked to `id`, then recompute the layout
const addNeighbors = (id: Id) => {
  const center = nodesById.get(id)
  if (center === undefined) return
  const newNodes: Node[] = []
  const newEdges: Edge[] = []
  const count = 4
  const nodeStyle = expandedNodeStyle(center)
  const edgeStyle = expandedEdgeStyle(center)
  const edgeWidth = currentLayout === 'sugiyama' ? EDGE_WIDTH : 2
  for (let i = 0; i < count; i++) {
    const nodeId = nextNodeId++
    const angle = (i / count) * 2 * Math.PI
    const targetX = center.x + Math.cos(angle) * 80 // seed near the parent so 'none' shows them sensibly
    const targetY = center.y + Math.sin(angle) * 80
    newNodes.push({ id: nodeId, x: center.x, y: center.y, radius: center.radius, style: nodeStyle })
    nativePositions.set(nodeId, { x: targetX, y: targetY })
    newEdges.push({ id: `add-${nextEdgeSeq++}`, source: id, target: nodeId, width: edgeWidth, style: edgeStyle })
  }
  nodes = nodes.concat(newNodes)
  edges = edges.concat(newEdges)
  state.addNodes(newNodes)
  state.addEdges(newEdges)
  rebuildIndexes()
  relayout(true, { fit: false, forceAnchor: id })
}

/************************************
 * navbar: pick a layout + graph size
 ************************************/
const style = document.createElement('style')
style.textContent = `
  .navbar { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 18px;
    align-items: center; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 8px 14px;
    font: 13px system-ui, sans-serif; box-shadow: 0 1px 6px rgba(0,0,0,.15); z-index: 10; }
  .navbar .group { display: flex; gap: 4px; align-items: center; }
  .navbar .group > .label { color: #999; margin-right: 6px; }
  .navbar button { border: 1px solid #ccc; background: #f7f7f7; border-radius: 5px; padding: 4px 10px;
    cursor: pointer; color: #333; }
  .navbar button.active { background: #7a5dc5; border-color: #7a5dc5; color: #fff; }
`
document.head.appendChild(style)

type EdgeKind = 'curved' | 'orthogonal' | 'straight'
let currentSize: SizeKind = 'M'
let currentLayout: LayoutKind = 'force'
let currentEdges: EdgeKind = 'curved'

const navbar = document.createElement('div')
navbar.className = 'navbar'
document.body.appendChild(navbar)

const refreshers: (() => void)[] = []
const buildGroup = <T extends string>(
  label: string,
  options: [T, string][],
  get: () => T,
  set: (value: T) => void,
  visible?: () => boolean
) => {
  const group = document.createElement('div')
  group.className = 'group'
  const labelEl = document.createElement('span')
  labelEl.className = 'label'
  labelEl.textContent = label
  group.appendChild(labelEl)
  const buttons = new Map<T, HTMLButtonElement>()
  for (const [value, text] of options) {
    const button = document.createElement('button')
    button.textContent = text
    button.onclick = () => {
      set(value)
      for (const refresh of refreshers) refresh()
    }
    buttons.set(value, button)
    group.appendChild(button)
  }
  refreshers.push(() => {
    if (visible !== undefined) group.style.display = visible() ? 'flex' : 'none'
    buttons.forEach((button, value) => button.classList.toggle('active', get() === value))
  })
  navbar.appendChild(group)
}

// Layout and node count regenerate together; edge mode only reshapes sugiyama edges.
buildGroup<SizeKind>(
  'Nodes',
  [
    ['S', 'Small'],
    ['M', 'Medium'],
    ['L', 'Large']
  ],
  () => currentSize,
  (value) => {
    currentSize = value
    loadGraph(currentLayout, currentSize)
  }
)
buildGroup<LayoutKind>(
  'Layout',
  [
    ['none', 'Native'],
    ['force', 'Force'],
    ['d3force', 'D3 Force'],
    ['sugiyama', 'Sugiyama'],
    ['hierarchy', 'Hierarchy']
  ],
  () => currentLayout,
  (value) => {
    currentLayout = value
    loadGraph(currentLayout, currentSize)
  }
)
buildGroup<EdgeKind>(
  'Edges',
  [
    ['curved', 'Curved'],
    ['orthogonal', 'Orthogonal'],
    ['straight', 'Straight']
  ],
  () => currentEdges,
  (value) => {
    currentEdges = value
    edgesShaped = currentLayout === 'sugiyama' && currentEdges !== 'straight'
    shapeEdges()
  },
  () => currentLayout === 'sugiyama'
)
const syncNavbar = () => {
  for (const refresh of refreshers) refresh()
}

const baseStyle = (id: Id) => baseNodeStyleById.get(id) ?? NODE_STYLE
const restingStyle = (id: Id) => (selected.has(id) ? NODE_SELECTED_STYLE : baseStyle(id))
const selectNodes = (ids: Iterable<Id>) => {
  const updates: { id: Id; style: number }[] = []
  for (const id of ids) {
    if (selected.has(id)) continue
    selected.add(id)
    updates.push({ id, style: NODE_SELECTED_STYLE })
  }
  if (updates.length > 0) state.updateNodeStyles(updates)
}
const deselectAll = () => {
  if (selected.size === 0) return
  const updates = [...selected].map((id) => ({ id, style: baseStyle(id) }))
  selected.clear()
  state.updateNodeStyles(updates)
}
const setSelection = (desired: Set<Id>) => {
  const updates: { id: Id; style: number }[] = []
  for (const id of selected) if (!desired.has(id)) updates.push({ id, style: baseStyle(id) })
  for (const id of desired) if (!selected.has(id)) updates.push({ id, style: NODE_SELECTED_STYLE })
  if (updates.length === 0) return
  selected.clear()
  for (const id of desired) selected.add(id)
  state.updateNodeStyles(updates)
}

const SELECTION_STROKE_CSS_PX = 4
const selectionStrokeWidth = () => (SELECTION_STROKE_CSS_PX * pixelRatio) / state.viewport[VIEWPORT_ZOOM]

let marqueeStart: { x: number; y: number } | undefined
let marqueeBase: Set<Id> = new Set()

let selecting = false

const interaction = new DOMInteractionHandler({
  canvas,
  state,
  onNodePointerEnter: ({ id }) => {
    state.updateNodeStyles([{ id, style: NODE_HOVER_STYLE }])
    state.updateEdgeStyles((edgesByNode.get(id) ?? []).map((edgeId) => ({ id: edgeId, style: EDGE_HOVER_STYLE })))
  },
  onNodePointerLeave: ({ id }) => {
    state.updateNodeStyles([{ id, style: restingStyle(id) }])
    state.updateEdgeStyles(
      (edgesByNode.get(id) ?? []).map((edgeId) => ({ id: edgeId, style: baseEdgeStyleById.get(edgeId) ?? EDGE_STYLE }))
    )
  },
  // hovering an edge directly (the line itself) highlights it; works for straight and shaped (curved /
  // orthogonal) edges alike — the handler hit-tests each edge's path
  onEdgePointerEnter: ({ id }) => state.updateEdgeStyles([{ id, style: EDGE_HOVER_STYLE }]),
  onEdgePointerLeave: ({ id }) => state.updateEdgeStyles([{ id, style: baseEdgeStyleById.get(id) ?? EDGE_STYLE }]),
  onNodeDragStart: () => stopNodePositionTransition?.(),
  onNodeDrag: ({ id, x, y, dx, dy }) => {
    if (selected.has(id)) {
      const updates: { id: Id; x: number; y: number }[] = []
      for (const selectedId of selected) {
        const node = nodesById.get(selectedId)
        if (node === undefined) continue
        node.x += dx
        node.y += dy
        updates.push({ id: selectedId, x: node.x, y: node.y })
      }
      state.updateNodePositions(updates)
      shapeEdges()
    } else {
      state.updateNodePositions([{ id, x, y }])
      const node = nodesById.get(id)
      if (node !== undefined) {
        node.x = x
        node.y = y
      }
      shapeEdges()
    }
  },
  onNodeClick: ({ id, metaKey }) => {
    if (metaKey) {
      if (selected.has(id)) {
        selected.delete(id)
        state.updateNodeStyles([{ id, style: baseStyle(id) }])
      } else {
        selectNodes([id])
      }
    } else {
      deselectAll()
      selectNodes([id])
    }
  },
  onViewportDragStart: ({ x, y }) => {
    if (!selecting) return
    marqueeStart = { x, y }
    marqueeBase = new Set(selected)
  },
  onViewportDrag: (event) => {
    if (marqueeStart === undefined || event.type !== 'viewportDrag') return
    const minX = Math.min(marqueeStart.x, event.x)
    const maxX = Math.max(marqueeStart.x, event.x)
    const minY = Math.min(marqueeStart.y, event.y)
    const maxY = Math.max(marqueeStart.y, event.y)
    const desired = new Set(marqueeBase)
    for (const n of nodes) if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) desired.add(n.id)
    setSelection(desired)
    state.setAnnotations([
      {
        type: 'rectangle',
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
        style: { fillColor: 0x18ffa500, strokeColor: ORANGE, strokeWidth: selectionStrokeWidth() }
      }
    ])
  },
  onViewportDragEnd: () => {
    if (marqueeStart === undefined) return
    marqueeStart = undefined
    state.setAnnotations([])
  },
  onViewportClick: () => deselectAll(),
  onNodeDoubleClick: ({ id }) => addNeighbors(id)
})

const ZOOM_STEP = 1.6
let stopZoom: (() => void) | undefined
const zoomBy = (factor: number) => {
  stopZoom?.()
  const from: Viewport = { x: state.viewport[VIEWPORT_X], y: state.viewport[VIEWPORT_Y], zoom: state.viewport[VIEWPORT_ZOOM] }
  const zoom = clampZoom(state.minZoom, state.maxZoom, from.zoom * factor)
  if (zoom === from.zoom) return
  const view = interpolateViewport(from, { ...from, zoom })
  stopZoom = animate(800, (t) => state.updateViewport(view(smootherstep(t))))
}

const zoom = ZoomControl({ container: app })
zoom({ onZoomIn: () => zoomBy(ZOOM_STEP), onZoomOut: () => zoomBy(1 / ZOOM_STEP) })

const download = DownloadControl({ container: app })
download({ top: 90, fileName: 'graph.png', onDownload: () => renderer.exportImage() })

const selection = SelectionControl({ container: app })
selection({
  top: 130,
  onChange: (mode) => {
    selecting = mode
    interaction.selectionMode = mode
  }
})

window.addEventListener('keydown', (event) => {
  if ((event.key === 'Delete' || event.key === 'Backspace') && selected.size > 0) {
    event.preventDefault()
    deleteSelected()
  }
})

syncNavbar()
loadGraph(currentLayout, currentSize)
