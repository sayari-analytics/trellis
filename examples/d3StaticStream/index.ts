import { interval } from 'rxjs'
import { map } from 'rxjs/operators'
import { Node, Edge } from '../../src/index'
import { D3Renderer } from '../../src/renderers/d3'
import { data, large, mediumLg, mediumSm } from '../data'

const render = D3Renderer({ id: 'graph', synchronous: 300 })

const NODES_PER_TICK = 15

const nodes = mediumSm.nodes.map(({ id }) => ({ id }))

const edges = mediumSm.links.map(({ source, target }) => ({ id: `${source}|${target}`, source, target }))

interval(1000).pipe(
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
