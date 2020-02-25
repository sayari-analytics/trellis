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
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const nodeClick$ = new Subject<string>()

const graph = new Graph()
const renderer = PixiRenderer({
  id: 'graph',
  // onNodeMouseEnter: ({ id }) => console.log('mouse enter', id),
  // onNodeMouseLeave: ({ id }) => console.log('mouse leave', id),
  onNodeMouseDown: (({ id }, { x, y }) => graph.dragStart(id, x, y)),
  onNodeDrag: (({ id }, { x, y }) => graph.drag(id, x, y)),
  onNodeMouseUp: (({ id }) => {
    // console.log('clicked', id)
    graph.dragEnd(id)
    nodeClick$.next(id)
  }),
  stats
})
graph.onLayout(renderer.layout)


const nodes: Node[] = Object.values(graphData.nodes).map<Node>(({ id, label, type }) => ({
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

const edges: Edge[] = Object.entries(graphData.edges).map<Edge>(([id, { field, source, target }]) => ({
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
const INTERVAL = 2000
const COUNT = Math.ceil(nodes.length / NODES_PER_TICK)

console.log(`Rendering ${NODES_PER_TICK} every ${INTERVAL}ms ${COUNT} times \nnode count: ${nodes.length} \nedge count ${edges.length}`)


combineLatest(
  interval(INTERVAL).pipe(take(COUNT)),
  nodeClick$.pipe(
    scan((clickedNodes, nodeId) => {
      clickedNodes.add(nodeId)
      return clickedNodes
    }, new Set<string>()),
    startWith(new Set<string>()),
  )
).pipe(
  map(([idx, clickedNodes]) => {
    return nodes
      .slice(0, (idx + 1) * NODES_PER_TICK)
      // .filter((node) => !clickedNodes.has(node.id))
      .map((node) => {
        return clickedNodes.has(node.id) && node.style.width !== 220 ?
          { ...node, style: { ...node.style, width: 220 } } :
          node
      })
      .reduce<{ nodes: { [id: string]: Node }, edges: { [id: string]: Edge }, options?: Partial<SimulationOptions> }>((graph, node) => {
        graph.nodes[node.id] = node

        edges.forEach((edge) => {
          if (graph.nodes[edge.source] && graph.nodes[edge.target]) {
            graph.edges[edge.id] = edge
          }
        })

        return graph
      }, { nodes: {}, edges: {}, options: { tick: 1000 } })
  })
).subscribe({
  next: (graphData) => graph.layout(graphData),
  error: (err) => console.error(err),
  complete: () => console.log('complete'),
})
