import { Graph, Node, Edge, Options } from '../index'
import { Observable } from 'rxjs'
import { switchMap } from 'rxjs/operators'


// export const observable = (graph: Graph) => {
//   return (props$: Observable<{
//     nodes?: { [key: string]: Node },
//     edges?: { [key: string]: Edge },
//     options?: Partial<Options>
//   }>) => props$.pipe(switchMap(graph.layout))
// }
