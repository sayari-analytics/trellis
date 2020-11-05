import Stats from 'stats.js'
import * as Cluster from '../../src/layout/cluster'
import * as Subgraph from '../../src/layout/subgraph'
import * as WebGL from '../../src/renderers/webgl'
import * as Graph from '../../src/'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const STYLE: Partial<WebGL.NodeStyle> = {
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
 * Initialize Layout and Renderer
 */
const container: HTMLDivElement = document.querySelector('#graph')
const subgraph = Subgraph.Layout()
const cluster = Cluster.Layout()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Initialize Layout and Renderer Options
 */
const renderOptions: WebGL.Options = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodeDoubleClick: (_, clickedNode) => {
    const subgraphNodes = cluster((clickedNode.subgraph?.nodes ?? []).concat([
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 1}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 1}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 2}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 2}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 3}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 3}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 4}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 4}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 5}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 5}`, style: STYLE },
      { id: `${clickedNode.id}_${(clickedNode.subgraph?.nodes.length ?? 0) + 6}`, radius: 18, label: `${clickedNode.id.toUpperCase()} ${clickedNode.subgraph?.nodes.length ?? 0 + 6}`, style: STYLE },
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

    render({ nodes, edges, options: renderOptions })
  },
  onContainerPointerUp: () => {
    nodes = subgraph(
      nodes,
      nodes.map((node) => ({
        ...node,
        radius: 18,
        style: STYLE,
        subgraph: undefined,
      }))
    )

    render({ nodes, edges, options: renderOptions })
  },
}


/**
 * Layout and Render Graph
 */
render({ nodes, edges, options: renderOptions })

;(window as any).render = render
