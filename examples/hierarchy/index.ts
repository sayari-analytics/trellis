import Stats from 'stats.js'
import * as Hierarchy from '../../src/layout/hierarchy'
import * as Force from '../../src/layout/force'
import * as Graph from '../../src/'
import * as Zoom from '../../src/controls/zoom'
import { NodeStyle, Renderer, RendererOptions } from '../../src/renderers/pixi'
import graphData from '../../tmp-data'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
type Node = Graph.Node & { type: string }


const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'

const createCompanyStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#FFAF1D',
  stroke: [{ color: '#FFF' }, { color: '#F7CA4D' }],
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

const createPersonStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB' }],
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


let nodes = Object.values(graphData.nodes)
  .map((node, idx) => ({ ...node, label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel: node.label }))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    radius: 18,
    type,
    style: type === 'company' ?
      createCompanyStyle(18) :
      createPersonStyle(18)
  }))

let edges = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
  .concat([
    ['connect_2', { field: 'related_to', source: Object.values(graphData.nodes)[77].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
    ['connect_3', { field: 'related_to', source: `${Object.values(graphData.nodes)[50].id}_2`, target: `${Object.values(graphData.nodes)[0].id}_3` }],
  ])
  .map<Graph.Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
    style: { arrow: 'forward' }
  }))

let hierarchyNodes: Node[] = []
let hierarchyEdges: Graph.Edge[] = []

let forceNodes: Node[] = []
let forceEdges: Graph.Edge[] = []


/**
 * Initialize Layout and Renderer Options
 */
const container: HTMLDivElement = document.querySelector('#graph')

const layoutOptions: Partial<Hierarchy.LayoutOptions> = {
  y: container.offsetHeight,
  x: 600,
}

const renderOptions: Partial<RendererOptions<Node, Graph.Edge>> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 2.5,
  onNodePointerDown: (_, { id }, x, y) => {
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
        stroke: node.type === 'company' ?
          [{ color: '#FFF' }, { color: '#CCC' }] :
          [{ color: '#CCC' }]
      }
    } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: node.type === 'company' ?
        createCompanyStyle(18) :
        createPersonStyle(18)
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
  onContainerPointerDown: () => {
    if (layout === 'hierarchy') {
      layout = 'force'
      nodes = forceNodes
      edges = forceEdges
      renderer({ nodes, edges, options: renderOptions })
    } else {
      layout = 'hierarchy'
      nodes = hierarchyNodes
      edges = hierarchyEdges

      renderer({ nodes, edges, options: renderOptions })
    }
  },
  onContainerDrag: (_, x, y) => {
    renderOptions.x = x
    renderOptions.y = y
    renderer({ nodes, edges, options: renderOptions })
  },
  onWheel: (_, x, y, zoom) => {
    renderOptions.x = x
    renderOptions.y = y
    renderOptions.zoom = zoom
    renderer({ nodes, edges, options: renderOptions })
  }
}


/**
 * Initialize Layout and Renderer
 */
const hierarchy = Hierarchy.Layout()
const force = Force.Layout()
const zoomControl = Zoom.Control({ container })
const renderer = Renderer<Node, Graph.Edge>({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Layout and Render Graph
 */
zoomControl({
  top: 80,
  onZoomIn: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom, renderOptions.maxZoom, renderOptions.zoom / 0.6)
    renderer({ nodes, edges, options: renderOptions })
  },
  onZoomOut: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom, renderOptions.maxZoom, renderOptions.zoom * 0.6)
    renderer({ nodes, edges, options: renderOptions })
  },
})

let layout = 'hierarchy'
const hierarchyData = hierarchy(nodes[0].id, { nodes, edges, options: layoutOptions })
nodes = hierarchyNodes = hierarchyData.nodes
edges = hierarchyEdges = hierarchyData.edges
force({ nodes, edges }).then((forceData) => {
  forceNodes = forceData.nodes
  forceEdges = forceData.edges

  renderer({ nodes, edges, options: renderOptions })
})
