import Stats from 'stats.js'
import * as Cluster from '../../src/layout/cluster'
import * as Expand from '../../src/layout/expand'
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
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: 22 }
}
let nodes: Graph.Node[] = [{
  id: 'a',
  radius: 18,
  x: 0,
  y: 85,
  label: 'A',
  style: STYLE
}, {
  id: 'b',
  radius: 18,
  x: -100,
  y: -85,
  label: 'B',
  style: STYLE
}, {
  id: 'c',
  radius: 18,
  x: 100,
  y: -85,
  label: 'C',
  style: STYLE
}]
let edges: Graph.Edge[] = []


/**
 * Initialize Layout and Renderer Options
 */
const container: HTMLDivElement = document.querySelector('#graph')
const renderOptions: Partial<RendererOptions> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  // onNodeDrag: (_, { id }, x, y) => {
  //   nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
  //   render({ nodes, edges, options: renderOptions })
  // },
  // onNodePointerEnter: (_, { id }) => {
  //   nodes = nodes.map((node) => (node.id === id ? {
  //     ...node,
  //     style: { ...node.style, stroke: [{ color: '#CCC', width: 4 }] }
  //   } : node))
  //   render({ nodes, edges, options: renderOptions })
  // },
  // onNodePointerLeave: (_, { id }) => {
  //   nodes = nodes.map((node) => (node.id === id ? {
  //     ...node,
  //     style: { ...node.style, stroke: STYLE.stroke }
  //   } : node))
  //   render({ nodes, edges, options: renderOptions })
  // },
  // onEdgePointerEnter: (_, { id }) => {
  //   edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
  //   render({ nodes, edges, options: renderOptions })
  // },
  // onEdgePointerLeave: (_, { id }) => {
  //   edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
  //   render({ nodes, edges, options: renderOptions })
  // },
  onNodeDoubleClick: (_, clickedNode) => {
    const subgraphNodes = cluster((clickedNode.subgraph?.nodes ?? []).concat([
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 1}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 1}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 2}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 2}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 3}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 3}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 4}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 4}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 5}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 5}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 6}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 6}`, style: STYLE },
    ]))
    const radius = Expand.subgraphRadius(clickedNode, subgraphNodes) + 20

    nodes
      .filter((node) => node.subgraph !== undefined)
      .map((node) => node.id)
      .reverse()
      .forEach((collapseId) => {
        nodes = collapse(nodes.find(({ id }) => id === collapseId), nodes)
      })

    nodes = nodes.map((node) => {
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

    nodes
      .filter((node) => node.subgraph !== undefined)
      .map((node) => node.id)
      .forEach((expandId) => {
        nodes = expand(nodes.find(({ id }) => id === expandId), nodes)
      })

    render({ nodes, edges, options: renderOptions })
  },
  onContainerPointerUp: () => {
    nodes
      .filter((node) => node.subgraph !== undefined)
      .map((node) => node.id)
      .reverse()
      .forEach((collapseId) => {
        nodes = collapse(nodes.find(({ id }) => id === collapseId), nodes)
      })

    nodes = nodes.map((node) => ({
      ...node,
      radius: 18,
      style: STYLE,
      subgraph: undefined,
    }))

    render({ nodes, edges, options: renderOptions })
  },
}


/**
 * Initialize Layout and Renderer
 */
const { expand, collapse } = Expand.Layout()
const cluster = Cluster.Layout()
const render = Renderer({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Layout and Render Graph
 */
render({ nodes, edges, options: renderOptions })

;(window as any).render = render
