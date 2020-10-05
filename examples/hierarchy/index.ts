import Stats from 'stats.js'
import * as Hierarchy from '../../src/layout/hierarchy'
import * as Graph from '../../src/'
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
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius * 1.25 },
  badge: [{
    position: 45,
    color: '#FFAF1D',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 18,
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
      size: 18,
      color: '#FFF',
      text: '!',
    }
  }],
})

const createPersonStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB' }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: radius * 1.25 },
  badge: [{
    position: 45,
    color: '#7CBBF3',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 18,
      color: '#FFF',
      text: '8',
    }
  }],
})


let nodes = Object.values(graphData.nodes)
  .map((node, idx) => ({ ...node, label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel: node.label }))
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    radius: 32,
    type,
    style: type === 'company' ?
      createCompanyStyle(32) :
      createPersonStyle(32)
  }))

let edges = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
  .map<Graph.Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
  }))


/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Partial<Hierarchy.LayoutOptions> = {}

const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderOptions: Partial<RendererOptions<Node, Graph.Edge>> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
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
        createCompanyStyle(32) :
        createPersonStyle(32)
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
}


/**
 * Initialize Layout and Renderer
 */
const hierarchy = Hierarchy.Layout()
const renderer = Renderer<Node, Graph.Edge>({
  container,
  debug: { stats, logPerformance: true }
})


/**
 * Layout and Render Graph
 */
const positionedGraph = hierarchy(nodes[0].id, { nodes, edges, options: layoutOptions })
nodes = positionedGraph.nodes
edges = positionedGraph.edges
renderer({ nodes, edges, options: renderOptions })
