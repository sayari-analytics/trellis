import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as Subgraph from '../../src/layout/subgraph'
import * as Zoom from '../../src/controls/zoom'
import * as Selection from '../../src/controls/selection'
import * as Download from '../../src/controls/download'
import * as Cluster from '../../src/layout/cluster'
import * as WebGL from '../../src/renderers/webgl'
import * as Png from '../../src/renderers/image'
import * as Graph from '../../src/'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const createCompanyStyle = (radius: number): WebGL.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#FFF', width: 4 }, { color: '#F7CA4D' }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius * 1.2 },
  badge: [{
    position: 45,
    color: '#FFAF1D',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 10,
      color: '#FFF',
      text: '15',
    }
  }, {
    position: 135,
    color: '#E4171B',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 10,
      color: '#FFF',
      text: '!',
    }
  }],
})

const createPersonStyle = (radius: number): WebGL.NodeStyle => ({
  color: '#7CBBF3',
  labelSize: 10,
  labelWordWrap: 260,
  stroke: [{ color: '#FFF', width: 2 }, { color: '#90D7FB', width: 1 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: radius * 1.2 },
  badge: [{
    position: 45,
    color: '#7CBBF3',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 10,
      color: '#FFF',
      text: '8',
    }
  }],
})

const createSubgraphStyle = (radius: number): WebGL.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 2 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius * 1.2 }
})

let nodes = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
  { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
  { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map<Graph.Node>(({ id, label }) => ({
    id,
    label,
    radius: 18,
    style: id === 'a' ? createCompanyStyle(18) : createPersonStyle(18)
  }))

let edges: Graph.Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'None' }, { id: 'ca', source: 'a', target: 'c', label: 'None' }, { id: 'da', source: 'a', target: 'd', label: 'None' },
  { id: 'ea', source: 'a', target: 'e', label: 'A to E', style: { arrow: 'forward' } }, { id: 'fa', source: 'a', target: 'f', label: 'A to F', style: { arrow: 'forward' } },
  { id: 'ga', source: 'a', target: 'g', label: 'A to G', style: { arrow: 'forward' } }, { id: 'ha', source: 'a', target: 'h', label: 'A to H', style: { arrow: 'forward' } },
  { id: 'ia', source: 'a', target: 'i', label: 'A to I', style: { arrow: 'forward' } }, { id: 'ja', source: 'b', target: 'j', label: 'B to J', style: { arrow: 'forward' } },
  { id: 'ka', source: 'b', target: 'k', label: 'K to B', style: { arrow: 'reverse' } }, { id: 'la', source: 'b', target: 'l', label: 'L to B', style: { arrow: 'reverse' } },
  { id: 'ma', source: 'l', target: 'm', label: 'M to L', style: { arrow: 'reverse' } }, { id: 'nc', source: 'n', target: 'c', label: 'N to C', style: { arrow: 'forward' } },
  { id: 'oa', source: 'c', target: 'o', label: 'Both', style: { arrow: 'both' } }, { id: 'pa', source: 'c', target: 'p', label: 'Both', style: { arrow: 'both' } },
  { id: 'qa', source: 'c', target: 'q', label: 'Both', style: { arrow: 'both' } },
]


/**
 * Create Renderer and Layout
 */
const container = document.querySelector('#graph') as HTMLDivElement
const imageRenderer = Png.Renderer()
const renderer = WebGL.Renderer({
  container,
  // debug: { stats, logPerformance: true }
})
const force = Force.Layout()
const subgraph = Subgraph.Layout()
const cluster = Cluster.Layout()


/**
 * Create Handlers
 */
// TODO


/**
 * Create Zoom Controls
 */
const zoomControl = Zoom.Control({ container })
zoomControl({
  top: 80,
  onZoomIn: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! / 0.5)
    renderer({ nodes, edges, options: renderOptions })
  },
  onZoomOut: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! * 0.5)
    renderer({ nodes, edges, options: renderOptions })
  },
})


/**
 * Create Selection Controls
 */
const selectionControl = Selection.Control({ container })
const { onContainerPointerDown, onContainerDrag, onContainerPointerUp } = selectionControl({
  top: 160,
  onContainerPointerUp: () => {
    nodes = subgraph(
      nodes,
      nodes.map((node) => (node.subgraph ? {
        ...node,
        radius: 18,
        style: node.id === 'a' ? createCompanyStyle(18) : createPersonStyle(18),
        subgraph: undefined,
      } : node))
    )

    renderer({ nodes, edges, options: renderOptions })
  },
  onContainerDrag: (_, x, y) => {
    renderOptions.x = x
    renderOptions.y = y
    renderer({ nodes, edges, options: renderOptions })
  },
})


/**
 * Create Download Controls
 */
const downloadControl = Download.Control({ container })
downloadControl({
  top: 210,
  onClick: () => {
    const bounds = Graph.getSelectionBounds(nodes, 40)
    const dimensions = Graph.boundsToDimenions(bounds, 1)
    const viewport = Graph.boundsToViewport(bounds, dimensions)

    return imageRenderer({
      nodes: nodes,
      edges: edges,
      options: {
        width: dimensions.width,
        height: dimensions.height,
        x: viewport.x,
        y: viewport.y,
        zoom: 1,
      }
    })
  }
})


/**
 * Layout and Render Graph
 */
const renderOptions: WebGL.Options = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 2.5,
  nodesEqual: (prev, current) => prev === current,
  edgesEqual: (prev, current) => prev === current,
  onNodePointerDown: (_, { id }, x, y) => {
    // renderOptions.x = -x
    // renderOptions.y = -y
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodeDrag: (_, { id }, x, y) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: {
        ...node.style,
        stroke: node.id === 'a' ?
          node.style?.stroke?.map((stroke, idx) => ({ ...stroke, color: idx % 2 === 0 ? '#FFF' : '#CCC' })) :
          node.style?.stroke?.map((stroke) => ({ ...stroke, color: '#CCC' }))
      }
    } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: {
        ...node.style,
        stroke: node.id === 'a' ?
          createCompanyStyle(48).stroke :
          createPersonStyle(48).stroke
      }
    } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onEdgePointerEnter: (_, { id }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    renderer({ nodes, edges, options: renderOptions })
  },
  onEdgePointerLeave: (_, { id }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodeDoubleClick: (_, clickedNode) => {
    const subgraphNodes = cluster((clickedNode.subgraph?.nodes ?? []).concat([
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 1}`, radius: 10, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 1}`, style: createSubgraphStyle(10) },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 2}`, radius: 10, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 2}`, style: createSubgraphStyle(10) },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 3}`, radius: 10, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 3}`, style: createSubgraphStyle(10) },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 4}`, radius: 10, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 4}`, style: createSubgraphStyle(10) },
    ]))
    const radius = Subgraph.subgraphRadius(clickedNode.radius, subgraphNodes) + 20

    nodes = subgraph(
      nodes,
      nodes.map((node) => (node.id === clickedNode.id ? {
        ...node,
        radius,
        style: { ...node.style, color: '#EFEFEF', icon: undefined },
        subgraph: {
          nodes: subgraphNodes,
          edges: []
        },
      } : node))
    )

    renderer({ nodes, edges, options: renderOptions })
  },
  onContainerPointerDown,
  onContainerDrag,
  onContainerPointerUp,
  onWheel: (_, x, y, zoom) => {
    renderOptions.x = x
    renderOptions.y = y
    renderOptions.zoom = zoom
    renderer({ nodes, edges, options: renderOptions })
  }
}

const layoutOptions: Force.Options = {
  nodeStrength: -500,
}


force({ nodes, edges, options: layoutOptions }).then((graph) => {
  nodes = graph.nodes

  const { x, y, zoom } = Graph.boundsToViewport(
    Graph.getSelectionBounds(nodes, 40),
    { width: renderOptions.width!, height: renderOptions.height! }
  )
  renderOptions.x = x
  renderOptions.y = y
  renderOptions.zoom = zoom

  renderer({ nodes, edges, options: renderOptions })
})
