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

type State<
  NodeProps extends object = {},
  EdgeProps extends object = {},
  NodeStyle extends object = {},
  EdgeStyle extends object = {},
> = {
  nodes: PositionedNode<NodeProps, NodeStyle>[],
  edges: Edge<EdgeProps, EdgeStyle>[]
}


export class Layout<NodeProps extends object = {}, EdgeProps extends object = {}, NodeStyle extends object = {}, EdgeStyle extends object = {}>
  extends Component<Props<NodeProps, EdgeProps, NodeStyle, EdgeStyle>, State<NodeProps, EdgeProps, NodeStyle, EdgeStyle>> {

  state: State<NodeProps, EdgeProps, NodeStyle, EdgeStyle> = { nodes: [], edges: [] }

  private layout = new ForceLayout((graph: State<NodeProps, EdgeProps, NodeStyle, EdgeStyle>) => {
    this.setState(graph)
  })

  // shouldComponentUpdate(_: Props<NodeProps, EdgeProps, NodeStyle, EdgeStyle>, prevState: State<NodeProps, EdgeProps, NodeStyle, EdgeStyle>) {
  //   return this.state !== prevState
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
