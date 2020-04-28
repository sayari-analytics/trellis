import { Component, ReactNode } from 'react'
import { Node, Edge, PositionedNode } from '../../../types'
import { ForceLayout, LayoutOptions } from '..'


type Props<
  NodeProps extends object = {},
  EdgeProps extends object = {},
  NodeStyle extends object = {},
  EdgeStyle extends object = {},
> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: Node<NodeProps, NodeStyle>[]
  edges: Edge<EdgeProps, EdgeStyle>[]
  options?: Partial<LayoutOptions>
  children: (graph: {
    nodes: PositionedNode<NodeProps, NodeStyle>[],
    edges: Edge<EdgeProps, EdgeStyle>[],
  }) => ReactNode
}


export class Layout<NodeProps extends object = {}, EdgeProps extends object = {}, NodeStyle extends object = {}, EdgeStyle extends object = {}>
  extends Component<Props<NodeProps, EdgeProps, NodeStyle, EdgeStyle>, { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge<EdgeProps, EdgeStyle>[] }> {

  state: { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge<EdgeProps, EdgeStyle>[] } = { nodes: [], edges: [] }

  private layout = new ForceLayout((graph: { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge<EdgeProps, EdgeStyle>[] }) => {
    this.setState(graph)
  })
  private nodes: PositionedNode<NodeProps, NodeStyle>[] = []
  private edges: Edge<EdgeProps, EdgeStyle>[] = []

  componentDidUpdate() {
    this.layout!.apply({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  render() {
    return this.props.children({ nodes: this.nodes, edges: this.edges })
  }
}
