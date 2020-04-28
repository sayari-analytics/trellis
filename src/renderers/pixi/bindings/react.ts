import { createElement, createRef, Component, RefObject } from 'react'
import { PIXIRenderer, RendererOptions, NodeDatum, EdgeDatum } from '..'


type Props<N extends NodeDatum, E extends EdgeDatum> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: N[]
  edges: E[]
  options?: Partial<RendererOptions<N, E>>
}


export class Renderer<N extends NodeDatum, E extends EdgeDatum> extends Component<Props<N, E>> {

  private container: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>()
  private renderer: PIXIRenderer<N, E> | undefined

  componentDidMount() {
    this.renderer = new PIXIRenderer<N, E>({ container: this.container.current!, debug: this.props.debug })
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
