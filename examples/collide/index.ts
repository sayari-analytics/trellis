import Stats from 'stats.js'
import * as Collide from '../../src/layout/collide'
import * as Graph from '../../src/'
import * as WebGL from '../../src/renderers/webgl'
import graphData from './data'

export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

/**
 * Initialize Data
 */

type Node = Graph.Node & { type: string }

const createCompanyStyle = (radius: number): Graph.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#FFF' }, { color: '#F7CA4D' }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'business',
    color: '#fff',
    size: radius * 1.2
  },
  badge: [
    {
      position: 45,
      color: '#FFAF1D',
      stroke: '#FFF',
      icon: { type: 'textIcon', family: 'Helvetica', size: 10, color: '#FFF', text: '15' }
    },
    {
      position: 135,
      color: '#E4171B',
      stroke: '#FFF',
      icon: { type: 'textIcon', family: 'Helvetica', size: 10, color: '#FFF', text: '!' }
    }
  ]
})

const createPersonStyle = (radius: number): Graph.NodeStyle => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB' }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'person',
    color: '#fff',
    size: radius * 1.2
  },
  badge: [
    {
      position: 45,
      color: '#7CBBF3',
      stroke: '#FFF',
      icon: { type: 'textIcon', family: 'Helvetica', size: 10, color: '#FFF', text: '8' }
    }
  ]
})

let nodes: Node[] = Object.values(graphData.nodes).map((node) => ({
  ...node,
  style: node.type === 'company' ? createCompanyStyle(node.radius) : createPersonStyle(node.radius)
}))
let edges: Graph.Edge[] = Object.values(graphData.edges).map((edge) => edge)

/**
 * Initialize Layout and Renderer
 */
const container = document.querySelector('#graph') as HTMLDivElement
const collide = Collide.Layout()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})

/**
 * Initialize Layout and Renderer Options
 */
const renderOptions: WebGL.Options<Node, Graph.Edge> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 2.5
}

/**
 * Layout and Render Graph
 */
// show layout with overlapping nodes
render({ nodes, edges, options: renderOptions })

const data = collide({ nodes, edges, options: {} })
nodes = data.nodes
edges = data.edges
//wait and show updated layout
setTimeout(() => {
  render({ nodes, edges, options: renderOptions })
}, 5000)
