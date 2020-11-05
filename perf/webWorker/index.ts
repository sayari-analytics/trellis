// import { Node, Edge, Graph } from '../../src/index'
// import graphData from '../../tmp-data'
// import { of, Observable, interval } from 'rxjs'
// import { map, mergeMap, tap, take } from 'rxjs/operators'
// import { LayoutOptions } from '../../src/simulation'


// const nodes = Object.values(graphData.nodes)
//   .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
//   .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
//   .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
//   .map<Node>(({ id, label }) => ({
//     id,
//     label,
//     style: { width: 62, fill: '#ffaf1d', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
//   }))

// const edges = Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
//   .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
//   .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
//   .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
//   .concat([
//     ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
//     ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[0].id}_2`, target: `${Object.values(graphData.nodes)[0].id}_3` }],
//     ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[0].id}_3`, target: `${Object.values(graphData.nodes)[0].id}_4` }],
//   ])
//   .map<Edge>(([id, { field, source, target }]) => ({
//     id,
//     source,
//     target,
//     label: field.replace(/_/g, ' '),
//   }))


// const layout = (graph: Graph) => (
//   graphData$: Observable<{ nodes: Node[], edges: Edge[], options?: Partial<LayoutOptions> }>
// ) => {
//   return graphData$.pipe(
//     mergeMap((graphData) => {
//       return new Observable((observer) => {
//         graph.layout(graphData)
//         graph.onLayout((graphLayout) => {
//           observer.next(graphLayout)
//           observer.complete()
//         })
//       })
//     })
//   )
// }


// const NODES_PER_TICK = 50
// const COUNT = Math.ceil(nodes.length / NODES_PER_TICK)


// console.time('Initialize Graph')
// const graph = new Graph()
// console.timeEnd('Initialize Graph')

// interval(1500).pipe(
//   take(COUNT + 5),
//   mergeMap((idx) => {
//     return of(idx).pipe(
//       map((idx) => {
//         const nodeIds = new Set<string>()

//         return {
//           nodes: nodes
//             .slice(0, (idx + 1) * NODES_PER_TICK)
//             .map((node) => (nodeIds.add(node.id), node)),
//           edges: edges
//             .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
//         }
//       }),
//       tap(() => console.time(idx.toString())),
//       layout(graph),
//       tap(() => console.timeEnd(idx.toString()))
//     )
//   })

//   // mapTo({ nodes, edges }),
//   // layout(graph),
//   // tap((result) => console.log(result))
// ).subscribe({
//   error: (err) => console.error(err),
//   complete: () => console.log('complete'),
// })
