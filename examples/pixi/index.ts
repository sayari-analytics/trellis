import { interval, combineLatest, Subject } from 'rxjs'
import { map, take, scan, startWith } from 'rxjs/operators'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'
import Stats from 'stats.js'
import { Node, Edge, Graph } from '../../src/index'
import { PixiRenderer } from '../../src/renderers/pixi'
import { data, large, mediumLg, mediumSm } from '../data'
import graphData from '../../tmp-data'
import { SimulationOptions } from '../../src/simulation'



export const stats = new Stats()
stats.showPanel(1) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const nodeClick$ = new Subject<string | null>()
const nodeHover$ = new Subject<string | null>()

const graph = new Graph()
const renderer = PixiRenderer({
  id: 'graph',
  onNodeMouseEnter: ({ id }) => {
    nodeHover$.next(id)
  },
  onNodeMouseLeave: () => {
    nodeHover$.next(null)
  },
  onNodeMouseDown: (({ id }, { x, y }) => graph.dragStart(id, x, y)),
  onNodeDrag: (({ id }, { x, y }) => graph.drag(id, x, y)),
  onNodeMouseUp: (({ id }) => {
    graph.dragEnd(id)
    nodeClick$.next(id)
  }),
  onContainerMouseUp: () => {
    nodeClick$.next(null)
  },
  stats
})
graph.onLayout(renderer.layout)


const nodes: Node[] = Object.values(graphData.nodes)
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    style: {
      width: 62,
      fill: type === 'company' ? '#ffaf1d' : '#7CBBF3',
      stroke: type === 'company' ? '#F7CA4D' : '#90D7FB',
      strokeWidth: 4,
      icon: type === 'company' ? 'business' : 'person',
    }
  }))

const edges: Edge[] = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
  // .concat([
  //   ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
  //   ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[5].id}_2`, target: `${Object.values(graphData.nodes)[5].id}_3` }],
  //   ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[10].id}_3`, target: `${Object.values(graphData.nodes)[10].id}_4` }],
  //   ['connect_d', { field: 'related_to', source: `${Object.values(graphData.nodes)[15].id}`, target: `${Object.values(graphData.nodes)[15].id}_2` }],
  //   ['connect_e', { field: 'related_to', source: `${Object.values(graphData.nodes)[20].id}_2`, target: `${Object.values(graphData.nodes)[20].id}_3` }],
  //   ['connect_f', { field: 'related_to', source: `${Object.values(graphData.nodes)[25].id}_3`, target: `${Object.values(graphData.nodes)[25].id}_4` }],
  //   ['connect_g', { field: 'related_to', source: `${Object.values(graphData.nodes)[30].id}`, target: `${Object.values(graphData.nodes)[30].id}_2` }],
  //   ['connect_h', { field: 'related_to', source: `${Object.values(graphData.nodes)[35].id}_2`, target: `${Object.values(graphData.nodes)[35].id}_3` }],
  //   ['connect_i', { field: 'related_to', source: `${Object.values(graphData.nodes)[40].id}_3`, target: `${Object.values(graphData.nodes)[40].id}_4` }],
  // ])
  .map<Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
  }))


// const colorScale = scaleOrdinal(schemeCategory10)

// const nodes: Node[] = mediumSm.nodes.map<Node>(({ id, group }) => ({
//   id,
//   label: id,
//   style: {
//     width: (group + 3) * 5,
//     fill: colorScale(group.toString()),
//     stroke: '#fff',
//     icon: 'person'
//     // width: 62,
//     // fill: group > 3 ? '#ffaf1d' : '#7CBBF3',
//     // stroke: group > 3 ? '#F7CA4D' : '#90D7FB',
//     // strokeWidth: 4,
//   }
// }))

// const edges: Edge[] = mediumSm.links.map<Edge>(({ source, target, value }) => ({
//   id: `${source}|${target}`,
//   source,
//   target,
//   label: `${source.replace(/[0-9]/g, '')}-${target.replace(/[0-9]/g, '')}`,
//   style: {
//     width: Math.max(1, value * 0.2),
//   }
// }))


const NODES_PER_TICK = 200
const INTERVAL = 1200
const COUNT = Math.ceil(nodes.length / NODES_PER_TICK)

console.log(`Rendering ${NODES_PER_TICK} every ${INTERVAL}ms ${COUNT} times \nnode count: ${nodes.length} \nedge count ${edges.length}`)


combineLatest(
  interval(INTERVAL).pipe(take(COUNT)),
  // nodeClick$.pipe(
  //   scan((clickedNodes, nodeId) => {
  //     clickedNodes.add(nodeId)
  //     return clickedNodes
  //   }, new Set<string>()),
  //   startWith(new Set<string>()),
  // ),
  nodeClick$.pipe(startWith(null)),
  // nodeHover$.pipe(startWith(null))
).pipe(
  map(([idx, clickedNode, hoverNode]) => {
    const nodeIds = new Set()
    return {
      nodes: nodes
        .slice(0, (idx + 1) * NODES_PER_TICK)
        // .filter((node) => !clickedNode.has(node.id))
        // .map((node) => {
        //   if (node.id === hoverNode) {
        //     return { ...node, style: { ...node.style, width: 550, fill: '#efefef', fillOpacity: 0.8, stroke: '#ccc', strokeWidth: 1, icon: undefined } }
        //   }
        //   return node
        // })
        .map((node) => {
          if (node.id === clickedNode) {
            return {
              ...node,
              style: { ...node.style, fill: '#efefef', fillOpacity: 0.8, stroke: '#ccc', strokeWidth: 1, icon: undefined },
              subGraph: { nodes: [], edges: [] },
            }
          }
          return node
        })
        .map((node) => (nodeIds.add(node.id), node)),
      edges: edges
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
      options: { strength: -600, }
    }
  })
).subscribe({
  next: (graphData) => graph.layout(graphData),
  error: (err) => console.error(err),
  complete: () => console.log('complete'),
})
