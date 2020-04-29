import { Component, ReactNode } from 'react'
import { Node, Edge, PositionNode } from '../../../types'
import { ForceLayout, LayoutOptions } from '..'


export type Props<N extends Node<E>, E extends Edge> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: N[]
  edges: E[]
  options?: Partial<LayoutOptions>
  children: (graph: {
    nodes: PositionNode<N, E>[],
    edges: E[],
  }) => ReactNode
}

type State<N extends Node<E>, E extends Edge> = {
  nodes: PositionNode<N, E>[],
  edges: E[]
}



export class Layout<N extends Node<E>, E extends Edge> extends Component<Props<N, E>, State<N, E>> {

  state: State<N, E> = { nodes: [], edges: [] }

  private layout = new ForceLayout<N, E>((graph) => {
    this.setState(graph)
  })

  componentDidMount() {
    this.layout.apply({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props<N, E>) {
    this.layout.apply({
      nodes: nextProps.nodes,
      edges: nextProps.edges,
      options: nextProps.options,
    })
  }

  render() {
    return this.props.children({ nodes: this.state.nodes, edges: this.state.edges })
  }
}

// export const Layout2 = <N extends Node<E>, E extends Edge>(props: Props<N, E>) => {

//   const [graph, setGraph] = useState<State<N, E>>({ nodes: [], edges: [] })

//   const layout = useMemo(() => {
//     return new ForceLayout<N, E>((graph) => setGraph(graph))
//   }, [])

//   useLayoutEffect(() => {
//     layout.apply({
//       nodes: props.nodes,
//       edges: props.edges,
//       options: props.options,
//     })
//   })

//   return useMemo(() => props.children({ nodes: graph.nodes, edges: graph.edges }), [props.children, graph.nodes, graph.edges])
// }
