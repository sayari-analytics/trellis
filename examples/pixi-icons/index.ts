import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as Subgraph from '../../src/layout/subgraph'
import * as Cluster from '../../src/layout/cluster'
import * as Graph from '../../src/'
import * as WebGL from '../../src/renderers/webgl'
import { company } from '../assets/icons'
import person from '../assets/person.png'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const createCompanyStyle = (): Graph.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 5 }],
  icon: { type: 'imageIcon', url: company, scale: 1.8 },
  badge: [{
    position: 45,
    color: '#FFAF1D',
    stroke: '#FFF',
    strokeWidth: 3,
    radius: 12,
    icon: {
      type: 'textIcon',
      family: 'Roboto',
      size: 16,
      color: '#FFF',
      text: '15',
    }
  }, {
    position: 135,
    color: '#E4171B',
    stroke: '#FFF',
    strokeWidth: 3,
    radius: 12,
    icon: {
      type: 'textIcon',
      family: 'Roboto',
      size: 16,
      color: '#FFF',
      text: '!',
    }
  }],
})

const createPersonStyle = (radius: number): Graph.NodeStyle => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 5 }],
  labelFamily: 'Roboto',
  icon: radius > 30 ?
    { type: 'textIcon' as const, family: 'Arial, Helvetica, monospace', text: 'P', color: '#cbedff', size: radius } :
    { type: 'imageIcon' as const, url: person, scale: 0.05 },
  badge: [{
    position: 45,
    color: '#7CBBF3',
    stroke: '#FFF',
    strokeWidth: 3,
    radius: 12,
    icon: {
      type: 'textIcon',
      family: 'Roboto',
      size: 16,
      color: '#FFF',
      text: '8',
    }
  }],
})

let nodes = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
  { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
  { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map<Graph.Node>(({ id, label }, idx) => ({
    id,
    label,
    radius: id === 'a' ? 32 : (28 - idx) * 1.8,
    style: id === 'a' ? createCompanyStyle() : createPersonStyle((28 - idx) * 1.8)
  }))

let edges: Graph.Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'Related To' }, { id: 'ca', source: 'a', target: 'c', label: 'Related To' }, { id: 'da', source: 'a', target: 'd', label: 'Related To' }, { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
  { id: 'fa', source: 'a', target: 'f', label: 'Related To' }, { id: 'ga', source: 'a', target: 'g', label: 'Related To' }, { id: 'ha', source: 'a', target: 'h', label: 'Related To' }, { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
  { id: 'ja', source: 'b', target: 'j', label: 'Related To' }, { id: 'ka', source: 'b', target: 'k', label: 'Related To' }, { id: 'la', source: 'b', target: 'l', label: 'Related To' }, { id: 'ma', source: 'l', target: 'm', label: 'Related To' },
  { id: 'na', source: 'c', target: 'n', label: 'Related To' }, { id: 'oa', source: 'c', target: 'o', label: 'Related To' }, { id: 'pa', source: 'c', target: 'p', label: 'Related To' }, { id: 'qa', source: 'c', target: 'q', label: 'Related To' },
].map<Graph.Edge>((edge) => ({
  ...edge,
  style: {
    labelFamily: 'Roboto',
  }
}))


/**
 * Initialize Layout and Renderer
 */
const container = document.querySelector('#graph') as HTMLDivElement
const force = Force.Layout()
const subgraph = Subgraph.Layout()
const cluster = Cluster.Layout()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Initialize Renderer Options
 */
const renderOptions: WebGL.Options = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  animateNodePosition: false,
  animateNodeRadius: false,
  zoom: 0.8,
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, style: { ...node.style, stroke: [{ color: '#ddd', width: 6 }] } } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ?
      { ...node, style: { ...node.style, stroke: [{ color: id === 'a' ? '#F7CA4D' : '#90D7FB', width: 6 }] } } :
      node
    ))
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
  onNodeDoubleClick: ({ target }) => {
    const subgraphNodes = cluster((target.subgraph?.nodes ?? []).concat([
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 1}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 1}`, style: createCompanyStyle() },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 2}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 2}`, style: createCompanyStyle() },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 3}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 3}`, style: createCompanyStyle() },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 4}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 4}`, style: createCompanyStyle() },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 5}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 5}`, style: createCompanyStyle() },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 6}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 6}`, style: createCompanyStyle() },
    ]))
    const radius = Subgraph.subgraphRadius(target.radius, subgraphNodes) + 20

    nodes = subgraph(
      nodes,
      nodes.map((node) => {
        if (node.id === target.id) {
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
  onViewportPointerUp: () => {
    nodes = subgraph(
      nodes,
      nodes.map((node, idx) => ({
        ...node,
        radius: node.id === 'a' ? 32 : (28 - idx) * 1.8,
        style: node.id === 'a' ? createCompanyStyle() : createPersonStyle((28 - idx) * 1.8),
        subgraph: undefined,
      }))
    )

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
force({ nodes, edges, options: { nodeStrength: -800 } }).then((graph) => {
  nodes = graph.nodes
  render({ nodes, edges, options: renderOptions })
})
