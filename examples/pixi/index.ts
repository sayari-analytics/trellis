import { interval } from 'rxjs'
import { map, take } from 'rxjs/operators'
import { Node, Edge } from '../../src/index'
import { PixiRenderer } from '../../src/renderers/pixi'
import { data, large, mediumLg, mediumSm } from '../data'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'


const render = PixiRenderer({ id: 'graph', nodeStyles: { stroke: '#fff' } })

const NODES_PER_TICK = 20

const colorScale = scaleOrdinal(schemeCategory10)

const nodes: Node[] = data.nodes.map<Node>(({ id, group }) => ({
  id,
  label: id,
  style: {
    width: (group + 3) * 3,
    fill: colorScale(group.toString()),
  }
}))

const edges: Edge[] = data.links.map<Edge>(({ source, target, value }) => ({
  id: `${source}|${target}`,
  source,
  target,
  style: {
    width: Math.max(1, value * 0.2),
  }
}))


interval(800).pipe(
  // take(3),
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
  next: ({ nodes, edges }) => render(nodes, edges)
})

// render(
//   nodes.reduce<{ [id: string]: Node }>((nodeMap, node) => {
//     nodeMap[node.id] = node
//     return nodeMap
//   }, {}),
//   edges.reduce<{ [id: string]: Edge }>((edgeMap, edge) => {
//     edgeMap[edge.id] = edge
//     return edgeMap
//   }, {})
// )
