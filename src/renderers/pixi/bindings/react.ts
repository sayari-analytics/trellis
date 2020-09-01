import { createElement, createRef, Component, RefObject } from 'react'
import { PIXIRenderer, RendererOptions } from '..'
import { Node, Edge } from '../../../types'


export type Props<N extends Node, E extends Edge> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: N[]
  edges: E[]
  options?: Partial<RendererOptions<N, E>>
}


export class Renderer<N extends Node, E extends Edge> extends Component<Props<N, E>> {

  private container: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>()
  private renderer: PIXIRenderer<N, E> | undefined

  componentDidMount() {
    this.renderer = new PIXIRenderer<N, E>({ container: this.container.current!, debug: this.props.debug })
      .apply({
        nodes: this.props.nodes,
        edges: this.props.edges,
        options: this.props.options,
      })
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
