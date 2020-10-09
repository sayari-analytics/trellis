import Stats from 'stats.js'
import * as SubGraph from '../../src/layout/subGraph'
import * as Graph from '../../src/'
import { NodeStyle, Renderer, RendererOptions } from '../../src/renderers/pixi'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const STYLE: Partial<NodeStyle> = {
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: 32 }
}
let nodes: Graph.Node[] = [{
  id: 'a',
  radius: 40,
  x: 0,
  y: 85,
  label: 'A',
  style: STYLE
}, {
  id: 'b',
  radius: 40,
  x: -100,
  y: -85,
  label: 'B',
  style: STYLE
}, {
  id: 'c',
  radius: 40,
  x: 100,
  y: -85,
  label: 'C',
  style: STYLE
}]
let edges: Graph.Edge[] = []


/**
 * Initialize Layout and Renderer Options
 */
const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderOptions: Partial<RendererOptions> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodeDrag: (_, { id }, x, y) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: { ...node.style, stroke: [{ color: '#CCC', width: 4 }] }
    } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: { ...node.style, stroke: STYLE.stroke }
    } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerEnter: (_, { id }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerLeave: (_, { id }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onNodeDoubleClick: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: { ...node.style, color: '#efefef', icon: undefined },
      subGraph: {
        nodes: (node.subGraph?.nodes ?? []).concat([
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 1}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 2}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 3}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 1}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 2}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 3}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 1}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 2}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 3}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 1}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 2}`, style: STYLE },
          { id: '', radius: 21, label: `${node.id.toUpperCase()} ${node.subGraph?.nodes.length ?? 0 + 3}`, style: STYLE },
        ])
          .map<Graph.Node>((subNode, idx) => ({ ...subNode, id: `${node.id}_${idx}` })),
        edges: []
      },
    } : node))

    subGraph({ nodes, edges }).then((graph) => {
      nodes = graph.nodes
      render({ nodes, edges, options: renderOptions })
    })
  },
  onContainerPointerUp: () => {
    nodes = nodes.map((node) => (node.subGraph ? {
      ...node,
      radius: 40,
      style: STYLE,
      subGraph: undefined,
    } : node))

    subGraph({ nodes, edges }).then((graph) => {
      nodes = graph.nodes
      render({ nodes, edges, options: renderOptions })
    })
  },
}


/**
 * Initialize Layout and Renderer
 */
const subGraph = SubGraph.Layout()
const render = Renderer({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Layout and Render Graph
 */
render({ nodes, edges, options: renderOptions })

;(window as any).render = render
