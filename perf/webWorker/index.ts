import { Node, Edge, Graph } from '../../src/index'
import graphData from '../../tmp-data'
import { of, Observable, interval } from 'rxjs'
import { map, mergeMap, tap, take } from 'rxjs/operators'
import { SimulationOptions } from '../../src/simulation'


const nodes = Object.values(graphData.nodes)
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
  .map<Node>(({ id, label }) => ({
    id,
    label,
    style: { width: 62, fill: '#ffaf1d', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
  }))
  // .reduce<{ [id: string]: Node }>((nodes, node) => (nodes[node.id] = node, nodes), {})

const edges = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
  .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
  .concat([
    ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
    ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[0].id}_2`, target: `${Object.values(graphData.nodes)[0].id}_3` }],
    ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[0].id}_3`, target: `${Object.values(graphData.nodes)[0].id}_4` }],
  ])
  .map<Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
  }))
  // .reduce<{ [id: string]: Edge }>((edges, edge) => (edges[edge.id] = edge, edges), {})


const layout = (graph: Graph) => (
  graphData$: Observable<{ nodes: { [key: string]: Node }, edges: { [key: string]: Edge }, options?: Partial<SimulationOptions> }>
) => {
  return graphData$.pipe(
    mergeMap((graphData) => {
      return new Observable((observer) => {
        graph.layout(graphData)
        graph.onLayout((graphLayout) => {
          observer.next(graphLayout)
          observer.complete()
        })
      })
    })
  )
}


const NODES_PER_TICK = 50
const COUNT = Math.ceil(nodes.length / NODES_PER_TICK)


console.time('Initialize Graph')
const graph = new Graph()
console.timeEnd('Initialize Graph')

interval(1500).pipe(
  take(COUNT + 10),
  mergeMap((idx) => {
    return of(idx).pipe(
      map((idx) => {
        return nodes
          .slice(0, (idx + 1) * NODES_PER_TICK)
          .reduce<{ nodes: { [id: string]: Node }, edges: { [id: string]: Edge }, options?: Partial<SimulationOptions> }>((graph, node) => {
            graph.nodes[node.id] = node

            edges.forEach((edge) => {
              if (graph.nodes[edge.source] && graph.nodes[edge.target]) {
                graph.edges[edge.id] = edge
              }
            })

            return graph
          }, { nodes: {}, edges: {} })
      }),
      tap(() => console.time(idx.toString())),
      layout(graph),
      tap(() => console.timeEnd(idx.toString()))
    )
  })

  // mapTo({ nodes, edges }),
  // layout(graph),
  // tap((result) => console.log(result))
).subscribe({
  error: (err) => console.error(err),
  complete: () => console.log('complete'),
})
