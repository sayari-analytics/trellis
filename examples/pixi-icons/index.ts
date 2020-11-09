import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as Subgraph from '../../src/layout/subgraph'
import * as Cluster from '../../src/layout/cluster'
import { Node, Edge } from '../../src/'
import * as WebGL from '../../src/renderers/webgl'
import { company } from '../assets/icons'
import person from '../assets/person.png'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const createCompanyStyle = (): WebGL.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 6 }],
  icon: { type: 'imageIcon', url: company }
})

const createPersonStyle = (radius: number): WebGL.NodeStyle => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 6 }],
  icon: radius > 30 ?
    { type: 'textIcon' as const, family: 'Arial, Helvetica, monospace', text: 'P', color: '#cbedff', size: radius } :
    { type: 'imageIcon' as const, url: person, scale: 0.05 }
})

let nodes = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
  { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
  { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map<Node>(({ id, label }, idx) => ({
    id,
    label,
    radius: id === 'a' ? 32 : (28 - idx) * 1.8,
    style: id === 'a' ? createCompanyStyle() : createPersonStyle((28 - idx) * 1.8)
  }))

let edges: Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'Related To' }, { id: 'ca', source: 'a', target: 'c', label: 'Related To' }, { id: 'da', source: 'a', target: 'd', label: 'Related To' }, { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
  { id: 'fa', source: 'a', target: 'f', label: 'Related To' }, { id: 'ga', source: 'a', target: 'g', label: 'Related To' }, { id: 'ha', source: 'a', target: 'h', label: 'Related To' }, { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
  { id: 'ja', source: 'b', target: 'j', label: 'Related To' }, { id: 'ka', source: 'b', target: 'k', label: 'Related To' }, { id: 'la', source: 'b', target: 'l', label: 'Related To' }, { id: 'ma', source: 'l', target: 'm', label: 'Related To' },
  { id: 'na', source: 'c', target: 'n', label: 'Related To' }, { id: 'oa', source: 'c', target: 'o', label: 'Related To' }, { id: 'pa', source: 'c', target: 'p', label: 'Related To' }, { id: 'qa', source: 'c', target: 'q', label: 'Related To' },
]


/**
 * Initialize Layout and Renderer
 */
const container: HTMLDivElement = document.querySelector('#graph')
const force = Force.Layout()
const subgraph = Subgraph.Layout()
const cluster = Cluster.Layout()
const renderer = WebGL.Renderer({
  container,
  // debug: { stats, logPerformance: true }
})


/**
 * Initialize Layout and Renderer Options
 */
const renderOptions: WebGL.Options = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  zoom: 0.8,
  onNodePointerDown: (_, { id }, x, y) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodeDrag: (_, { id }, x, y) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, style: { ...node.style, stroke: [{ color: '#ddd', width: 6 }] } } : node))
    renderer({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ?
      { ...node, style: { ...node.style, stroke: [{ color: id === 'a' ? '#F7CA4D' : '#90D7FB', width: 6 }] } } :
      node
    ))
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
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 1}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 1}`, style: createCompanyStyle() },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 2}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 2}`, style: createCompanyStyle() },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 3}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 3}`, style: createCompanyStyle() },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 4}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 4}`, style: createCompanyStyle() },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 5}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 5}`, style: createCompanyStyle() },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 6}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 6}`, style: createCompanyStyle() },
    ]))
    const radius = Subgraph.subgraphRadius(clickedNode.radius, subgraphNodes) + 20

    nodes = subgraph(
      nodes,
      nodes.map((node) => {
        if (node.id === clickedNode.id) {
          return {
            ...node,
            radius,
            style: { ...node.style, color: '#efefef', icon: undefined },
            subgraph: {
              nodes: subgraphNodes,
              edges: []
            },
          }
        }

        return node
      })
    )

    renderer({ nodes, edges, options: renderOptions })
  },
  onContainerPointerUp: () => {
    nodes = subgraph(
      nodes,
      nodes.map((node, idx) => ({
        ...node,
        radius: node.id === 'a' ? 32 : (28 - idx) * 1.8,
        style: node.id === 'a' ? createCompanyStyle() : createPersonStyle((28 - idx) * 1.8),
        subgraph: undefined,
      }))
    )

    renderer({ nodes, edges, options: renderOptions })
  },
}


/**
 * Layout and Render Graph
 */
force({ nodes, edges, options: { nodeStrength: -800 } }).then((graph) => {
  nodes = graph.nodes
  renderer({ nodes, edges, options: renderOptions })
})
