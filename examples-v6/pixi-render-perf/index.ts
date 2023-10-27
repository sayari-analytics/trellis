import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as Zoom from '../../src/bindings/native/zoom'
import * as Graph from '../../src'
import * as WebGL from '../../src/renderers/webgl'
import graphData from '../../data/tmp-data'
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
const COMPANY = {
  color: '#ffaf1d',
  stroke: [{ color: '#F7CA4D', width: 2 }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'person',
    color: '#fff',
    size: 32 * 0.6
  }
}
const PERSON = {
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 2 }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'person',
    color: '#fff',
    size: 32 * 0.6
  }
}
let nodes = Object.values(graphData.nodes)
  .map((node, idx) => ({
    ...node,
    label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel : node.label
  }))
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
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_21` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_22` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_23` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_24` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_25` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_26` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_27` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_28` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_29` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_30` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_31` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_32` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_33` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_34` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_35` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_36` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_37` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_38` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_39` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_40` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_41` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_42` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_43` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_44` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_45` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_46` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_47` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_48` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_49` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_50` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_51` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_52` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_53` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_54` })))
  .map<Node>(({ id, type }) => ({
    id,
    // label,
    radius: 16,
    type,
    style: type === 'person' ? PERSON : COMPANY
  }))

let edges = Object.entries<{ field: string; source: string; target: string }>(graphData.edges)
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_5`, { ...edge, source: `${edge.source}_5`, target: `${edge.target}_5` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_6`, { ...edge, source: `${edge.source}_6`, target: `${edge.target}_6` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_7`, { ...edge, source: `${edge.source}_7`, target: `${edge.target}_7` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_8`, { ...edge, source: `${edge.source}_8`, target: `${edge.target}_8` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_9`, { ...edge, source: `${edge.source}_9`, target: `${edge.target}_9` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_10`, { ...edge, source: `${edge.source}_10`, target: `${edge.target}_10` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_11`, { ...edge, source: `${edge.source}_11`, target: `${edge.target}_11` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_12`, { ...edge, source: `${edge.source}_12`, target: `${edge.target}_12` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_13`, { ...edge, source: `${edge.source}_13`, target: `${edge.target}_13` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_14`, { ...edge, source: `${edge.source}_14`, target: `${edge.target}_14` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_15`, { ...edge, source: `${edge.source}_15`, target: `${edge.target}_15` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_16`, { ...edge, source: `${edge.source}_16`, target: `${edge.target}_16` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_17`, { ...edge, source: `${edge.source}_17`, target: `${edge.target}_17` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_18`, { ...edge, source: `${edge.source}_18`, target: `${edge.target}_18` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_19`, { ...edge, source: `${edge.source}_19`, target: `${edge.target}_19` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_20`, { ...edge, source: `${edge.source}_20`, target: `${edge.target}_20` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_21`, { ...edge, source: `${edge.source}_21`, target: `${edge.target}_21` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_22`, { ...edge, source: `${edge.source}_22`, target: `${edge.target}_22` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_23`, { ...edge, source: `${edge.source}_23`, target: `${edge.target}_23` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_24`, { ...edge, source: `${edge.source}_24`, target: `${edge.target}_24` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_25`, { ...edge, source: `${edge.source}_25`, target: `${edge.target}_25` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_26`, { ...edge, source: `${edge.source}_26`, target: `${edge.target}_26` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_27`, { ...edge, source: `${edge.source}_27`, target: `${edge.target}_27` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_28`, { ...edge, source: `${edge.source}_28`, target: `${edge.target}_28` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_29`, { ...edge, source: `${edge.source}_29`, target: `${edge.target}_29` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_30`, { ...edge, source: `${edge.source}_30`, target: `${edge.target}_30` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_31`, { ...edge, source: `${edge.source}_31`, target: `${edge.target}_31` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_32`, { ...edge, source: `${edge.source}_32`, target: `${edge.target}_32` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_33`, { ...edge, source: `${edge.source}_33`, target: `${edge.target}_33` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_34`, { ...edge, source: `${edge.source}_34`, target: `${edge.target}_34` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_35`, { ...edge, source: `${edge.source}_35`, target: `${edge.target}_35` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_36`, { ...edge, source: `${edge.source}_36`, target: `${edge.target}_36` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_37`, { ...edge, source: `${edge.source}_37`, target: `${edge.target}_37` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_38`, { ...edge, source: `${edge.source}_38`, target: `${edge.target}_38` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_39`, { ...edge, source: `${edge.source}_39`, target: `${edge.target}_39` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_40`, { ...edge, source: `${edge.source}_40`, target: `${edge.target}_40` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_41`, { ...edge, source: `${edge.source}_41`, target: `${edge.target}_41` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_42`, { ...edge, source: `${edge.source}_42`, target: `${edge.target}_42` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_43`, { ...edge, source: `${edge.source}_43`, target: `${edge.target}_43` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_44`, { ...edge, source: `${edge.source}_44`, target: `${edge.target}_44` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_45`, { ...edge, source: `${edge.source}_45`, target: `${edge.target}_45` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_46`, { ...edge, source: `${edge.source}_46`, target: `${edge.target}_46` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_47`, { ...edge, source: `${edge.source}_47`, target: `${edge.target}_47` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_48`, { ...edge, source: `${edge.source}_48`, target: `${edge.target}_48` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_49`, { ...edge, source: `${edge.source}_49`, target: `${edge.target}_49` }])
  )
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
  .map<Graph.Edge>(([id, { source, target }]) => ({
    id,
    source,
    target
    // label: field.replace(/_/g, ' '),
  }))

let nodesById: Record<string, Node>
// let edgesById: Record<string, Graph.Edge>

/**
 * Initialize Layout and Renderer
 */
const container = document.querySelector('#graph') as HTMLDivElement
const layout = Force.Layout()
const zoomControl = Zoom.Control({ container })
const render = throttleAnimationFrame(
  WebGL.Renderer({
    container,
    debug: { stats, logPerformance: false }
    // debug: { stats, logPerformance: true }
  })
)
// const render = WebGL.Renderer({
//   container,
//   debug: { stats, logPerformance: false }
//   // debug: { stats, logPerformance: true }
// })

/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Force.Options = {
  nodeStrength: -600,
  tick: 50
}
const renderOptions: WebGL.Options<Node, Graph.Edge> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 0.1,
  minZoom: 0.05,
  maxZoom: 2.5,
  /**
   * throttling both onNodeDrag and render breaks node position interpolation...
   * dragging a node will interpolate it's new position unnecessarily on large graphs
   */
  // onNodeDrag: throttleAnimationFrame((_, { id }, x, y) => {
  //   nodesById[id].x = x
  //   nodesById[id].y = y
  //   renderOptions.nodesEqual = () => false
  //   renderOptions.edgesEqual = () => true
  //   renderOptions.nodeIsEqual = (_: Node, next: Node) => next.id !== id
  //   render({ nodes, edges, options: renderOptions })
  // }),
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodesById[id].x = x
    nodesById[id].y = y
    renderOptions.nodesEqual = () => false
    renderOptions.edgesEqual = () => true
    renderOptions.nodeIsEqual = (_: Node, next: Node) => next.id !== id
    render({ nodes, edges, options: renderOptions })
  },
  onViewportDrag: ({ viewportX, viewportY }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.nodesEqual = () => true
    renderOptions.edgesEqual = () => true
    // renderOptions.nodeIsEqual = () => true
    render({ nodes, edges, options: renderOptions })
  },
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    renderOptions.nodesEqual = () => true
    renderOptions.edgesEqual = () => true
    // renderOptions.nodeIsEqual = () => true
    render({ nodes, edges, options: renderOptions })
  }
}

/**
 * Layout and Render Graph
 */
console.log(`node count: ${nodes.length} \nedge count ${edges.length}`)
zoomControl({
  top: 80,
  onZoomIn: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! / 0.6)
    render({ nodes, edges, options: renderOptions })
  },
  onZoomOut: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! * 0.6)
    render({ nodes, edges, options: renderOptions })
  }
})

layout({
  nodes,
  edges,
  options: layoutOptions
}).then((graph) => {
  nodes = graph.nodes
  edges = graph.edges
  nodesById = nodes.reduce<Record<string, Node>>((nodesById, node) => ((nodesById[node.id] = node), nodesById), {})
  // edgesById = edges.reduce<Record<string, Graph.Edge>>((edgesById, edge) => (edgesById[edge.id] = edge, edgesById), {})
  render({ nodes, edges, options: renderOptions })
})
;(window as any).render = render
