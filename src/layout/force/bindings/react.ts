import { Component, ReactNode } from 'react'
import { Node, Edge, PositionNode } from '../../../types'
import { ForceLayout, LayoutOptions } from '..'


type Props<N extends Node<E>, E extends Edge> = {
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

  private layout = new ForceLayout((graph: State<N, E>) => {
    this.setState(graph)
  })

  // shouldComponentUpdate(prevProps: Props<NodeProps, EdgeProps, NodeStyle, EdgeStyle>, prevState: State<N, E>) {
  //   return this.props.children !== prevProps.children && this.state !== prevState
  // }

  componentDidMount() {
    this.layout!.apply({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  // componentWillReceiveProps() {
  UNSAFE_componentWillReceiveProps() {
    this.layout!.apply({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  render() {
    return this.props.children({ nodes: this.state.nodes, edges: this.state.edges })
  }
}
