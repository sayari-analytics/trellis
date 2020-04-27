import Stats from 'stats.js'
import { Layout, LayoutOptions } from '../../src/layout/force'
import { Node, Edge, PositionedNode } from '../../src/types'
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

const updateData = (idx: number) => {
  const nodeIds = new Set()
  nodes = data.nodes.slice(0, (idx + 1) * NODES_PER_TICK)
  nodes.forEach(({ id }) => nodeIds.add(id))
  edges = data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
}


/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Partial<LayoutOptions> = {
  nodeStrength: -600,
}

const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderOptions: Partial<RendererOptions> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerDown: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodeDrag: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodePointerUp: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x: undefined, y: undefined } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodePointerEnter: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, style: { ...node.style, stroke: '#CCC' } } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodePointerLeave: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    nodes = nodes.map((node) => (node.id === id ?
      { ...node, style: { ...node.style, stroke: node.style.fill === PERSON_STYLE.fill ? PERSON_STYLE.stroke : COMPANY_STYLE.stroke } } :
      node
    ))
    layout({ nodes, edges, options: layoutOptions })
  },
  onEdgePointerEnter: (_: PIXI.interaction.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    layout({ nodes, edges, options: layoutOptions })
  },
  onEdgePointerLeave: (_: PIXI.interaction.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    layout({ nodes, edges, options: layoutOptions })
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
    layout({ nodes, edges, options: layoutOptions })
  },
  onContainerPointerUp: () => {
    nodes = nodes.map((node, idx) => (node.subGraph ? {
      ...node,
      style: node.id === 'a' ? COMPANY_STYLE : { ...PERSON_STYLE, width: (20 - idx) * 8 },
      subGraph: undefined,
    } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
}


/**
 * Initialize Layout and Renderer
 */
const layout = Layout(({ nodes, edges }) => { renderer({ nodes, edges, options: renderOptions }) })

const renderer = Renderer({
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
  updateData(idx++)
  layout({ nodes, edges, options: layoutOptions })
  if (idx === COUNT) clearInterval(interval)
}, INTERVAL)

layout({ nodes, edges, options: layoutOptions })

;(window as any).renderer = renderer
