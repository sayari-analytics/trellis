import { interval } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { Node, Edge } from '../../src/index'
import { PixiRenderer, PixiRenderer2 } from '../../src/renderers/pixi'
import { data, large, mediumLg, mediumSm } from '../data'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'


const render = PixiRenderer2({ id: 'graph', nodeStyle: { stroke: '#fff' } })

const NODES_PER_TICK = 20

const colorScale = scaleOrdinal(schemeCategory10)

const nodes: Node[] = mediumLg.nodes.map<Node>(({ id, group }) => ({
  id,
  label: id,
  style: {
    width: (group + 3) * 3,
    fill: colorScale(group.toString()),
  }
}))

const edges: Edge[] = mediumLg.links.map<Edge>(({ source, target, value }) => ({
  id: `${source}|${target}`,
  source,
  target,
  style: {
    width: Math.max(1, value * 0.2),
  }
}))


interval(1000).pipe(
  take(Math.ceil(nodes.length / NODES_PER_TICK)),
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
  next: (graph) => render.layout(graph),
  error: (err) => console.error(err),
  complete: () => console.log('complete'),
})

// render.layout({
//   nodes: nodes.reduce<{ [id: string]: Node }>((nodeMap, node) => {
//     nodeMap[node.id] = node
//     return nodeMap
//   }, {}),
//   edges: edges.reduce<{ [id: string]: Edge }>((edgeMap, edge) => {
//     edgeMap[edge.id] = edge
//     return edgeMap
//   }, {})
// })
