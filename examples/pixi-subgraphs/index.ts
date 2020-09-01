import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as SubGraph from '../../src/layout/subGraph'
import { Node, Edge } from '../../src/types'
import { Renderer, RendererOptions } from '../../src/renderers/pixi'
import graphData from '../../tmp-data'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const COMPANY_STYLE = { fill: '#FFAF1D', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
const PERSON_STYLE = { fill: '#7CBBF3', stroke: '#90D7FB', strokeWidth: 4, icon: 'person' }
const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'
const data = {
  nodes: Object.values(graphData.nodes)
    .map((node, idx) => ({ ...node, label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel: node.label }))
    .map<Node>(({ id, label, type }) => ({
      id,
      label,
      radius: 32,
      style: {
        fill: type === 'company' ? '#ffaf1d' : '#7CBBF3',
        stroke: type === 'company' ? '#F7CA4D' : '#90D7FB',
        strokeWidth: 4,
        icon: type === 'company' ? 'business' : 'person',
      }
    }))
    .slice(0, 1),
  edges: Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
    .map<Edge>(([id, { field, source, target }]) => ({
      id,
      source,
      target,
      label: field.replace(/_/g, ' '),
    }))
}

let nodes: Node[] = []
let edges: Edge[] = []


/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Partial<Force.LayoutOptions> = {
  nodeStrength: -600,
}

const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderOptions: Partial<RendererOptions> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerDown: (_: PIXI.InteractionEvent, { id }: Node, x: number, y: number) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodeDrag: (_: PIXI.InteractionEvent, { id }: Node, x: number, y: number) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerUp: (_: PIXI.InteractionEvent, { id }: Node) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x: undefined, y: undefined } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: (_: PIXI.InteractionEvent, { id }: Node) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, style: { ...node.style, stroke: '#CCC' } } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: (_: PIXI.InteractionEvent, { id }: Node) => {
    nodes = nodes.map((node) => (node.id === id ?
      { ...node, style: { ...node.style, stroke: node.style.fill === PERSON_STYLE.fill ? PERSON_STYLE.stroke : COMPANY_STYLE.stroke } } :
      node
    ))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerEnter: (_: PIXI.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerLeave: (_: PIXI.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onNodeDoubleClick: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: { ...node.style, fill: '#efefef', fillOpacity: 0.8, icon: undefined },
      subGraph: {
        nodes: [
          { id: `${node.id}a`, radius: 21, label: 'A', type: 'company', style: { ...COMPANY_STYLE } },
          { id: `${node.id}b`, radius: 21, label: 'B', type: 'company', style: { ...COMPANY_STYLE } },
          { id: `${node.id}c`, radius: 21, label: 'C', type: 'company', style: { ...COMPANY_STYLE } },
        ],
        edges: []
      },
    } : node))

    subGraph({ nodes, edges }).then((graph) => {
      nodes = graph.nodes
      render({ nodes, edges, options: renderOptions })
    })
  },
  onContainerPointerUp: () => {
    nodes = nodes.map((node, idx) => (node.subGraph ? {
      ...node,
      style: node.id === 'a' ? COMPANY_STYLE : { ...PERSON_STYLE, width: (20 - idx) * 8 },
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
const layout = Force.Layout()
const subGraph = SubGraph.Layout()
const render = Renderer({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Layout and Render Graph
 */
const NODES_PER_TICK = 200
const INTERVAL = 1400
const COUNT = Math.ceil(data.nodes.length / NODES_PER_TICK)
let idx = 0

console.log(`Rendering ${NODES_PER_TICK} every ${INTERVAL}ms ${COUNT} times \nnode count: ${data.nodes.length} \nedge count ${data.edges.length}`)

const interval = setInterval(() => {
  idx++
  // TODO - why does preserving node position perform poorly
  // const newNodes = data.nodes.slice(0, (idx + 1) * NODES_PER_TICK).map((node) => nodes.find(({ id }) => id === node.id) ?? node)
  const newNodes = data.nodes.slice(0, (idx + 1) * NODES_PER_TICK)
  const nodeIds = newNodes.reduce<Set<string>>((ids, { id }) => ids.add(id), new Set())
  const newEdges = data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))

  layout({
    nodes: newNodes,
    edges: newEdges,
    options: layoutOptions
  }).then((graph) => {
    nodes = graph.nodes
    edges = graph.edges
    render({ nodes, edges, options: renderOptions })
  })
  if (idx === COUNT) clearInterval(interval)
}, INTERVAL)

layout({ nodes, edges, options: layoutOptions }).then((graph) => {
  nodes = graph.nodes
  edges = graph.edges
  render({ nodes, edges, options: renderOptions })
})

;(window as any).render = render
