import { createElement, createRef, Component, RefObject } from 'react'
import { PIXIRenderer, RendererOptions, NodeStyle, EdgeStyle } from '..'
import { PositionedNode, Edge } from '../../../types'


type Props<NodeProps extends object = {}, EdgeProps extends object = {}> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: PositionedNode<NodeProps, NodeStyle>[]
  edges: Edge<EdgeProps, EdgeStyle>[]
  options?: Partial<RendererOptions>
}


export class Renderer extends Component<Props> {

  private container: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>()
  private renderer: PIXIRenderer | undefined

  componentDidMount() {
    this.renderer = new PIXIRenderer({ container: this.container.current!, debug: this.props.debug })
  }

  componentDidUpdate() {
    this.renderer!.apply({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  render() {
    return (
      createElement('canvas', { ref: this.container })
    )
  }
}
