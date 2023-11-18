import Stats from 'stats.js'
import * as Hierarchy from '../../../src/layout/hierarchy'
import * as Graph from '../../../src'
import * as Zoom from '../../../src/bindings/native/zoom'
import * as WebGL from '../../src/renderers/webgl'
import data from './data'

export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

type Node = Graph.Node & { type: string }
type Edge = Graph.Edge & { field: string }

const VIEWPORT_PADDING = 100
const NODE_RADIUS = 8

/**
 * Initialize Layout and Renderer
 */
const container = document.querySelector('#graph') as HTMLDivElement
const hierarchy = Hierarchy.Layout()
const zoomControl = Zoom.Control({ container })
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})

/**
 * Initialize Layout and Renderer Options
 */

const size = { width: container.offsetWidth, height: container.offsetHeight }
const nodeSize: [number, number] = [NODE_RADIUS * 2 + 8, 250]
const options: Hierarchy.Options<Node, Edge> = {
  nodeSize,
  anchor: 'left',
  alignment: 'min',
  sort: [
    (a, b) => b.height - a.height,
    ({ data: a }, { data: b }) => (a.node.type === 'company' ? 1 : 0) - (b.node.type === 'company' ? 1 : 0)
  ]
}

/**
 * Initialize Data
 */

const createNodeStyle = (type: string, hover = false): Graph.NodeStyle => {
  if (type === 'company') {
    return {
      color: '#FFB71B',
      stroke: [{ color: '#FFF', width: 1 }, { color: hover ? '#FFB71B' : '#FFF' }],
      label: { placement: 'right', fontSize: 8 }
    }
  } else {
    return {
      color: '#0A85FF',
      stroke: [{ color: '#FFF', width: 1 }, { color: hover ? '#0A85FF' : '#FFF' }],
      label: { placement: 'right', fontSize: 8 }
    }
  }
}

const createNode = (id: string, label: string, type: string): Node => ({
  id,
  type,
  label,
  radius: NODE_RADIUS,
  style: createNodeStyle(type)
})

const createEdge = (id: string, source: string, target: string, field: string): Edge => ({
  id,
  source,
  target,
  field,
  style: { arrow: 'none' }
})

const getTreeViewport = (nodes: Node[]) => {
  const bounds = Graph.getSelectionBounds(nodes, VIEWPORT_PADDING)
  const right = bounds.right + nodeSize[1]
  const treeWidth = right - bounds.left
  return {
    zoom: size.width / treeWidth,
    x: treeWidth / 2 - right,
    y: bounds.top - size.height / 2
  }
}

const root = '875yxpVvxV2RsweKMRiu7g'
const graph = data.reduce<{ nodes: Record<string, Node>; edges: Record<string, Edge> }>(
  (accu, { source, source_label, source_type, target, target_label, target_type, field }) => {
    const edge = `${source}-${field}-${target}`
    if (accu.edges[edge] === undefined) {
      accu.edges[edge] = createEdge(edge, source, target, field)
    }
    if (accu.nodes[source] === undefined) {
      accu.nodes[source] = createNode(source, source_label, source_type)
    }
    if (accu.nodes[target] === undefined) {
      accu.nodes[target] = createNode(target, target_label, target_type)
    }
    return accu
  },
  { nodes: {}, edges: {} }
)

let edges = Object.values(graph.edges)
let nodes = Object.values(graph.nodes)

const renderOptions: WebGL.Options<Node, Graph.Edge> = {
  ...size,
  x: Math.floor(size.width / 2),
  y: Math.floor(size.width / 2),
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 2.5,
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, style: createNodeStyle(node.type, true) } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, style: createNodeStyle(node.type) } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerEnter: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerLeave: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onViewportDrag: ({ viewportX, viewportY }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    render({ nodes, edges, options: renderOptions })
  },
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    render({ nodes, edges, options: renderOptions })
  }
}

/**
 * Layout and Render Graph
 */
zoomControl({
  top: 80,
  onZoomIn: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! / 0.6)
    render({ nodes, edges, options: renderOptions })
  },
  onZoomOut: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! * 0.6)
    render({ nodes, edges, options: renderOptions })
  }
})

const layout = hierarchy(root, { nodes, edges, options })
nodes = layout.nodes
edges = layout.edges

const viewport = getTreeViewport(nodes)
renderOptions.zoom = viewport.zoom
renderOptions.x = viewport.x
renderOptions.y = viewport.y

render({ nodes, edges, options: renderOptions })
