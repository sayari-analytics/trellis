import { createElement, createRef, Component, RefObject } from 'react'
import * as PixiRenderer from '..'
import { Node, Edge } from '../../../types'


export type Props<N extends Node, E extends Edge> = {
  debug?: { logPerformance?: boolean, stats?: Stats }
  nodes: N[]
  edges: E[]
  options?: Partial<PixiRenderer.RendererOptions<N, E>>
}


export class Renderer<N extends Node, E extends Edge> extends Component<Props<N, E>> {

  private container: RefObject<HTMLCanvasElement> = createRef<HTMLCanvasElement>()
  private renderer: ((graph: { nodes: N[], edges: E[], options?: Partial<PixiRenderer.RendererOptions<N, E>> }) => void) | undefined

  componentDidMount() {
    this.renderer = PixiRenderer.Renderer<N, E>({ container: this.container.current!, debug: this.props.debug })
    this.renderer({
      nodes: this.props.nodes,
      edges: this.props.edges,
      options: this.props.options,
    })
  }

  componentDidUpdate() {
    this.renderer!({
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
