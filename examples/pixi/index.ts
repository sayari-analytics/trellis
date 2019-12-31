import { interval } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'
import { Node, Edge, Graph } from '../../src/index'
import { PixiRenderer } from '../../src/renderers/pixi'
import { data, large, mediumLg, mediumSm } from '../data'
// import graph from '../../tmp-data'
import { stats } from '../../src/stats'


const graph = new Graph()
const renderer = PixiRenderer({
  id: 'graph',
  onNodeMouseDown: (({ id }, { x, y }) => graph.dragStart(id, x, y)),
  onNodeDrag: (({ id }, { x, y }) => graph.drag(id, x, y)),
  onNodeMouseUp: (({ id }) => graph.dragEnd(id)),
})
graph.onLayout(renderer.layout)

const NODES_PER_TICK = 20

const colorScale = scaleOrdinal(schemeCategory10)

// const nodes: Node[] = Object.values(graph.nodes).map<Node>(({ id, label, type }) => ({
//   id,
//   label,
//   style: {
//     width: 62,
//     fill: type === 'company' ? '#ffaf1d' : '#7CBBF3',
//     stroke: type === 'company' ? '#F7CA4D' : '#90D7FB',
//     strokeWidth: 4,
//   }
// }))

// const edges: Edge[] = Object.entries(graph.edges).map<Edge>(([id, { field, source, target }]) => ({
//   id,
//   source,
//   target,
//   label: field.replace(/_/g, ' '),
// }))

const nodes: Node[] = mediumSm.nodes.map<Node>(({ id, group }) => ({
  id,
  label: id,
  style: {
    width: (group + 3) * 5,
    fill: colorScale(group.toString()),
    stroke: '#fff',
    // width: 62,
    // fill: group > 3 ? '#ffaf1d' : '#7CBBF3',
    // stroke: group > 3 ? '#F7CA4D' : '#90D7FB',
    // strokeWidth: 4,
  }
}))

const edges: Edge[] = mediumSm.links.map<Edge>(({ source, target, value }) => ({
  id: `${source}|${target}`,
  source,
  target,
  label: `${source.replace(/[0-9]/g, '')}-${target.replace(/[0-9]/g, '')}`,
  style: {
    width: Math.max(1, value * 0.2),
  }
}))


interval(1400).pipe(
  take(Math.ceil(nodes.length / NODES_PER_TICK)),
  // take(4),
  map((idx) => {
    return nodes
      .slice(0, (idx + 1) * NODES_PER_TICK)
      .reduce<{ nodes: { [id: string]: Node }, edges: { [id: string]: Edge } }>((graph, node) => {
        graph.nodes[node.id] = node

        edges.forEach((edge) => {
          if (graph.nodes[edge.source] && graph.nodes[edge.target]) {
            graph.edges[edge.id] = edge
          }
        })

        return graph
      }, { nodes: {}, edges: {} })
  }),
).subscribe({
  next: (graphData) => graph.layout(graphData),
  error: (err) => console.error(err),
  complete: () => console.log('complete'),
})

// graph.layout({
//   nodes: nodes.reduce<{ [id: string]: Node }>((nodeMap, node) => {
//     nodeMap[node.id] = node
//     return nodeMap
//   }, {}),
//   edges: edges.reduce<{ [id: string]: Edge }>((edgeMap, edge) => {
//     edgeMap[edge.id] = edge
//     return edgeMap
//   }, {}),
// })
