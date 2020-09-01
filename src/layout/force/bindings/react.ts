import { Component, ReactNode } from 'react'
import { Node, Edge } from '../../../types'
import * as ForceLayout from '..'


export type Props<N extends Node<E>, E extends Edge> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: N[]
  edges: E[]
  options?: Partial<ForceLayout.LayoutOptions>
  children: (graph: {
    nodes: N[],
    edges: E[],
  }) => ReactNode
}

type State<N extends Node<E>, E extends Edge> = {
  nodes: N[],
  edges: E[]
}



export class Layout<N extends Node<E>, E extends Edge> extends Component<Props<N, E>, State<N, E>> {

  state: State<N, E> = { nodes: [], edges: [] }

  private layout = ForceLayout.Layout()

  componentDidMount() {
    this.layout({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props<N, E>) {
    this.layout({
      nodes: nextProps.nodes,
      edges: nextProps.edges,
      options: nextProps.options,
    })
  }

  render() {
    return this.props.children({ nodes: this.state.nodes, edges: this.state.edges })
  }
}
