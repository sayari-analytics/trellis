import Stats from 'stats.js'
import { Layout, LayoutOptions } from '../../src/layout/force'
import * as Graph from '../../src'
import { Renderer, RendererOptions } from '../../src/renderers/pixi'
import graphData from '../../tmp-data'
import { throttleAnimationFrame } from '../../src/utils'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


type Node = Graph.Node & { type: string }


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
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_9` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_10` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_11` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_12` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_13` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_14` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_15` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_16` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_17` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_18` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_19` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_20` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_21` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_22` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_23` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_24` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_25` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_26` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_27` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_28` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_29` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_30` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_31` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_32` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_33` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_34` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_35` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_36` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_37` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_38` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_39` })))
  .map<Node>(({ id, label, type }) => ({
    id,
    // label,
    radius: 32,
    type,
    style: {
      color: type === 'company' ? '#ffaf1d' : '#7CBBF3',
      stroke: type === 'company' ?
        [{ color: '#F7CA4D', width: 4 }] :
        [{ color: '#90D7FB', width: 4 }],
      // icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: 32 * 0.6 },
    }
  }))

let edges = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_5`, { ...edge, source: `${edge.source}_5`, target: `${edge.target}_5` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_6`, { ...edge, source: `${edge.source}_6`, target: `${edge.target}_6` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_7`, { ...edge, source: `${edge.source}_7`, target: `${edge.target}_7` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_8`, { ...edge, source: `${edge.source}_8`, target: `${edge.target}_8` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_9`, { ...edge, source: `${edge.source}_9`, target: `${edge.target}_9` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_10`, { ...edge, source: `${edge.source}_10`, target: `${edge.target}_10` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_11`, { ...edge, source: `${edge.source}_11`, target: `${edge.target}_11` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_12`, { ...edge, source: `${edge.source}_12`, target: `${edge.target}_12` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_13`, { ...edge, source: `${edge.source}_13`, target: `${edge.target}_13` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_14`, { ...edge, source: `${edge.source}_14`, target: `${edge.target}_14` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_15`, { ...edge, source: `${edge.source}_15`, target: `${edge.target}_15` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_16`, { ...edge, source: `${edge.source}_16`, target: `${edge.target}_16` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_17`, { ...edge, source: `${edge.source}_17`, target: `${edge.target}_17` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_18`, { ...edge, source: `${edge.source}_18`, target: `${edge.target}_18` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_19`, { ...edge, source: `${edge.source}_19`, target: `${edge.target}_19` }]))
  // .concat([
  //   ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
  //   ['connect_d', { field: 'related_to', source: `${Object.values(graphData.nodes)[15].id}`, target: `${Object.values(graphData.nodes)[15].id}_2` }],
  //   ['connect_g', { field: 'related_to', source: `${Object.values(graphData.nodes)[30].id}`, target: `${Object.values(graphData.nodes)[30].id}_2` }],
  //   ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[5].id}_2`, target: `${Object.values(graphData.nodes)[5].id}_3` }],
  //   ['connect_e', { field: 'related_to', source: `${Object.values(graphData.nodes)[20].id}_2`, target: `${Object.values(graphData.nodes)[20].id}_3` }],
  //   ['connect_h', { field: 'related_to', source: `${Object.values(graphData.nodes)[35].id}_2`, target: `${Object.values(graphData.nodes)[35].id}_3` }],
  //   ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[10].id}_3`, target: `${Object.values(graphData.nodes)[10].id}_4` }],
  //   ['connect_f', { field: 'related_to', source: `${Object.values(graphData.nodes)[25].id}_3`, target: `${Object.values(graphData.nodes)[25].id}_4` }],
  //   ['connect_i', { field: 'related_to', source: `${Object.values(graphData.nodes)[40].id}_3`, target: `${Object.values(graphData.nodes)[40].id}_4` }],
  // ])
  .map<Graph.Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    // label: field.replace(/_/g, ' '),
  }))

let nodesById: Record<string, Node>
let edgesById: Record<string, Graph.Edge>


/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Partial<LayoutOptions> = {
  nodeStrength: -600,
  tick: 50,
}

const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderOptions: Partial<RendererOptions> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodeDrag: throttleAnimationFrame((_, { id }, x, y) => {
    nodesById[id].x = x
    nodesById[id].y = y
    render({ nodes, edges, options: renderOptions })
  }),
  // onNodePointerEnter: throttleAnimationFrame((_, { id }) => {
  //   nodesById[id].radius = 100
  //   nodesById[id].style.stroke = [{ color: '#CCC', width: 4 }]
  //   render({ nodes, edges, options: renderOptions })
  // }),
  // onNodePointerLeave: throttleAnimationFrame((_, { id }) => {
  //   nodesById[id].radius = 32
  //   nodesById[id].style.stroke = nodesById[id].type === 'company' ?
  //     [{ color: '#F7CA4D', width: 4 }] :
  //     [{ color: '#90D7FB', width: 4 }]
  //   render({ nodes, edges, options: renderOptions })
  // }),
  // onEdgePointerEnter: throttleAnimationFrame((_, { id }) => {
  //   if (edgesById[id].style === undefined) edgesById[id].style = {}
  //   edgesById[id].style.width = 3
  //   render({ nodes, edges, options: renderOptions })
  // }),
  // onEdgePointerLeave: throttleAnimationFrame((_, { id }) => {
  //   if (edgesById[id].style === undefined) edgesById[id].style = {}
  //   edgesById[id].style.width = 1
  //   render({ nodes, edges, options: renderOptions })
  // }),
}


/**
 * Initialize Layout and Renderer
 */
const layout = Layout()

const render = throttleAnimationFrame(Renderer({
  container,
  debug: { stats, logPerformance: true }
}))


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
  nodesById = nodes.reduce<Record<string, Node>>((nodesById, node) => (nodesById[node.id] = node, nodesById), {})
  edgesById = edges.reduce<Record<string, Graph.Edge>>((edgesById, edge) => (edgesById[edge.id] = edge, edgesById), {})
  render({ nodes, edges, options: renderOptions })
})


;(window as any).render = render
