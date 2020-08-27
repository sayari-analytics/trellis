import Stats from 'stats.js'
import { Layout, LayoutOptions } from '../../src/layout/force'
import { Node, Edge, PositionedNode } from '../../src/types'
import { Renderer, RendererOptions, NodeStyle } from '../../src/renderers/pixi'
import graphData from '../../tmp-data'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
type NodeDatum = Exclude<Node, 'style'> & { style: Partial<NodeStyle> }


const COMPANY_STYLE = { fill: '#FFAF1D', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
const PERSON_STYLE = { fill: '#7CBBF3', stroke: '#90D7FB', strokeWidth: 4, icon: 'person' }
const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'
const data = {
  nodes: Object.values(graphData.nodes)
    .map((node, idx) => ({ ...node, label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel: node.label }))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_5` })))
    .map<NodeDatum>(({ id, label, type }) => ({
      id,
      label,
      radius: 32,
      style: {
        fill: type === 'company' ? '#ffaf1d' : '#7CBBF3',
        stroke: type === 'company' ? '#F7CA4D' : '#90D7FB',
        strokeWidth: 4,
        icon: type === 'company' ? 'business' : 'person',
      }
    })),
  edges: Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
    .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
    .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
    .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
    .concat([
      ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
      ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[5].id}_2`, target: `${Object.values(graphData.nodes)[5].id}_3` }],
      ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[10].id}_3`, target: `${Object.values(graphData.nodes)[10].id}_4` }],
      ['connect_d', { field: 'related_to', source: `${Object.values(graphData.nodes)[15].id}`, target: `${Object.values(graphData.nodes)[15].id}_2` }],
      ['connect_e', { field: 'related_to', source: `${Object.values(graphData.nodes)[20].id}_2`, target: `${Object.values(graphData.nodes)[20].id}_3` }],
      ['connect_f', { field: 'related_to', source: `${Object.values(graphData.nodes)[25].id}_3`, target: `${Object.values(graphData.nodes)[25].id}_4` }],
      ['connect_g', { field: 'related_to', source: `${Object.values(graphData.nodes)[30].id}`, target: `${Object.values(graphData.nodes)[30].id}_2` }],
      ['connect_h', { field: 'related_to', source: `${Object.values(graphData.nodes)[35].id}_2`, target: `${Object.values(graphData.nodes)[35].id}_3` }],
      ['connect_i', { field: 'related_to', source: `${Object.values(graphData.nodes)[40].id}_3`, target: `${Object.values(graphData.nodes)[40].id}_4` }],
    ])
    .map<Edge>(([id, { field, source, target }]) => ({
      id,
      source,
      target,
      label: field.replace(/_/g, ' '),
    }))
}

let nodes: NodeDatum[] = []
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
  onNodePointerDown: (_: PIXI.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodeDrag: (_: PIXI.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodePointerUp: (_: PIXI.InteractionEvent, { id }: PositionedNode) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x: undefined, y: undefined } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodePointerEnter: (_: PIXI.InteractionEvent, { id }: PositionedNode) => {
    // nodes = nodes.map((node) => (node.id === id ? { ...node, style: { ...node.style, stroke: '#CCC' } } : node))
    nodes = nodes.map((node) => (node.id === id ? { ...node, radius: node.radius * 4, style: { ...node.style, stroke: '#CCC' } } : node))
    layout({ nodes, edges, options: layoutOptions })
  },
  onNodePointerLeave: (_: PIXI.InteractionEvent, { id }: PositionedNode) => {
    nodes = nodes.map((node) => (node.id === id ?
      // { ...node, style: { ...node.style, stroke: node.style.fill === PERSON_STYLE.fill ? PERSON_STYLE.stroke : COMPANY_STYLE.stroke } } :
      { ...node, radius: node.radius / 4, style: { ...node.style, stroke: node.style.fill === PERSON_STYLE.fill ? PERSON_STYLE.stroke : COMPANY_STYLE.stroke } } :
      node
    ))
    layout({ nodes, edges, options: layoutOptions })
  },
  onEdgePointerEnter: (_: PIXI.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    layout({ nodes, edges, options: layoutOptions })
  },
  onEdgePointerLeave: (_: PIXI.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    layout({ nodes, edges, options: layoutOptions })
  },
}


/**
 * Initialize Layout and Renderer
 */
const layout = Layout(({ nodes, edges }) => { renderer({ nodes, edges, options: renderOptions }) })

const renderer = Renderer({
  container,
  debug: { stats, logPerformance: true }
})


/**
 * Layout and Render Graph
 */
const NODES_PER_TICK = 40
const INTERVAL = 1400
const COUNT = Math.ceil(data.nodes.length / NODES_PER_TICK)
let idx = 0


console.log(`Rendering ${NODES_PER_TICK} nodes every ${INTERVAL}ms ${COUNT} times \nnode count: ${data.nodes.length} \nedge count ${data.edges.length}`)


const interval = setInterval(() => {
  updateData(idx++)
  layout({ nodes, edges, options: layoutOptions })
  if (idx === COUNT) clearInterval(interval)
}, INTERVAL)

layout({ nodes, edges, options: layoutOptions })


;(window as any).renderer = renderer
