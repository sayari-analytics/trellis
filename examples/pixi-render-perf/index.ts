import Stats from 'stats.js'
import { Layout, LayoutOptions } from '../../src/layout/force'
import { Node, Edge } from '../../src/types'
import { Renderer, RendererOptions } from '../../src/renderers/pixi'
import graphData from '../../tmp-data'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'
let nodes = Object.values(graphData.nodes)
  .map((node, idx) => ({ ...node, label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel: node.label }))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_5` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_6` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_7` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_8` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_9` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_10` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_11` })))
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    radius: 32,
    style: {
      fill: type === 'company' ? '#ffaf1d' : '#7CBBF3',
      stroke: type === 'company' ? '#F7CA4D' : '#90D7FB',
      strokeWidth: 4,
      icon: {
        type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: 32 / 1.6
      },
    }
  }))

let edges = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_5`, { ...edge, source: `${edge.source}_5`, target: `${edge.target}_5` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_6`, { ...edge, source: `${edge.source}_6`, target: `${edge.target}_6` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_7`, { ...edge, source: `${edge.source}_7`, target: `${edge.target}_7` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_8`, { ...edge, source: `${edge.source}_8`, target: `${edge.target}_8` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_9`, { ...edge, source: `${edge.source}_9`, target: `${edge.target}_9` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_10`, { ...edge, source: `${edge.source}_10`, target: `${edge.target}_10` }]))
  .concat([
    ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
    ['connect_d', { field: 'related_to', source: `${Object.values(graphData.nodes)[15].id}`, target: `${Object.values(graphData.nodes)[15].id}_2` }],
    ['connect_g', { field: 'related_to', source: `${Object.values(graphData.nodes)[30].id}`, target: `${Object.values(graphData.nodes)[30].id}_2` }],
    ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[5].id}_2`, target: `${Object.values(graphData.nodes)[5].id}_3` }],
    ['connect_e', { field: 'related_to', source: `${Object.values(graphData.nodes)[20].id}_2`, target: `${Object.values(graphData.nodes)[20].id}_3` }],
    ['connect_h', { field: 'related_to', source: `${Object.values(graphData.nodes)[35].id}_2`, target: `${Object.values(graphData.nodes)[35].id}_3` }],
    ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[10].id}_3`, target: `${Object.values(graphData.nodes)[10].id}_4` }],
    ['connect_f', { field: 'related_to', source: `${Object.values(graphData.nodes)[25].id}_3`, target: `${Object.values(graphData.nodes)[25].id}_4` }],
    ['connect_i', { field: 'related_to', source: `${Object.values(graphData.nodes)[40].id}_3`, target: `${Object.values(graphData.nodes)[40].id}_4` }],
  ])
  .map<Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
  }))


/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Partial<LayoutOptions> = {
  nodeStrength: -600,
  tick: 10,
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
  onNodePointerEnter: (_: PIXI.InteractionEvent, { id }: Node) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, radius: node.radius * 4, style: { ...node.style, stroke: '#CCC' } } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: (_: PIXI.InteractionEvent, { id }: Node) => {
    nodes = nodes.map((node) => (node.id === id ?
      { ...node, radius: 32, style: { ...node.style, stroke: node.style.fill === '#7CBBF3' ? '#90D7FB' : '#F7CA4D' } } :
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
}


/**
 * Initialize Layout and Renderer
 */
const layout = Layout()

const render = Renderer({
  container,
  debug: { stats, logPerformance: true }
})


/**
 * Layout and Render Graph
 */
console.log(`node count: ${nodes.length} \nedge count ${edges.length}`)


layout({
  nodes,
  edges,
  options: layoutOptions
}).then((graph) => {
  nodes = graph.nodes
  edges = graph.edges
  render({ nodes, edges, options: renderOptions })
})


;(window as any).render = render
