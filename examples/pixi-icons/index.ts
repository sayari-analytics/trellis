import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as SubGraph from '../../src/layout/subGraph'
import { Node, Edge } from '../../src/'
import { NodeStyle, Renderer, RendererOptions } from '../../src/renderers/pixi'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const createCompanyStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 6 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius / 1.6 }
})

const createPersonStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 6 }],
  icon: radius > 60 ?
    { type: 'textIcon' as const, family: 'Arial, Helvetica, monospace', text: 'P', color: '#cbedff', size: radius / 1.6 } :
    { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: radius / 1.6 }
})

let nodes = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
  { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
  { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map<Node>(({ id, label }, idx) => ({
    id,
    label,
    radius: id === 'a' ? 62 : (20 - idx) * 4,
    style: id === 'a' ? createCompanyStyle(62) : createPersonStyle((20 - idx) * 4)
  }))

let edges: Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'Related To' }, { id: 'ca', source: 'a', target: 'c', label: 'Related To' }, { id: 'da', source: 'a', target: 'd', label: 'Related To' }, { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
  { id: 'fa', source: 'a', target: 'f', label: 'Related To' }, { id: 'ga', source: 'a', target: 'g', label: 'Related To' }, { id: 'ha', source: 'a', target: 'h', label: 'Related To' }, { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
  { id: 'ja', source: 'b', target: 'j', label: 'Related To' }, { id: 'ka', source: 'b', target: 'k', label: 'Related To' }, { id: 'la', source: 'b', target: 'l', label: 'Related To' }, { id: 'ma', source: 'l', target: 'm', label: 'Related To' },
  { id: 'na', source: 'c', target: 'n', label: 'Related To' }, { id: 'oa', source: 'c', target: 'o', label: 'Related To' }, { id: 'pa', source: 'c', target: 'p', label: 'Related To' }, { id: 'qa', source: 'c', target: 'q', label: 'Related To' },
]


/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Partial<Force.LayoutOptions> = {
  nodeStrength: -500,
}

const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderOptions: Partial<RendererOptions> = {
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
  onNodeDoubleClick: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      radius: 160,
      style: { ...node.style, color: '#efefef', icon: undefined },
      subGraph: {
        nodes: (node.subGraph?.nodes ?? []).concat([
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 1}`, style: createCompanyStyle(21) },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 2}`, style: createCompanyStyle(21) },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 3}`, style: createCompanyStyle(21) },
        ])
          .map<Node>((subNode, idx) => ({ ...subNode, id: `${node.id}_${idx}` })),
        edges: []
      },
    } : node))

    subGraph({ nodes, edges }).then((graph) => {
      nodes = graph.nodes
      renderer({ nodes, edges, options: renderOptions })
    })
  },
  onContainerPointerUp: () => {
    nodes = nodes.map((node, idx) => (node.subGraph ? {
      ...node,
      radius: node.id === 'a' ? 62 : (20 - idx) * 4,
      style: node.id === 'a' ? createCompanyStyle(62) : createPersonStyle((20 - idx) * 4),
      subGraph: undefined,
    } : node))

    subGraph({ nodes, edges }).then((graph) => {
      nodes = graph.nodes
      renderer({ nodes, edges, options: renderOptions })
    })
  },
}


/**
 * Initialize Layout and Renderer
 */
const force = Force.Layout()
const subGraph = SubGraph.Layout()
const renderer = Renderer({
  container,
  // debug: { stats, logPerformance: true }
})


/**
 * Layout and Render Graph
 */
force({ nodes, edges, options: layoutOptions }).then((graph) => {
  nodes = graph.nodes
  renderer({ nodes, edges, options: renderOptions })
})
