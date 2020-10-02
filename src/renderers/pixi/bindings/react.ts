import { createElement, useRef, useEffect } from 'react'
import { Renderer as PixiRenderer, RendererOptions } from '../'
import { Node, Edge } from '../../../'


export type Props<N extends Node, E extends Edge> =
  Partial<RendererOptions<N, E>> &
  {
    nodes: N[]
    edges: E[]
    debug?: { logPerformance?: boolean, stats?: Stats }
    renderer?: (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => void
  }


export const Renderer = <N extends Node, E extends Edge>(props: Props<N, E>) => {

  const ref = useRef<HTMLCanvasElement>(null)
  const renderer = useRef<(graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => void>()

  useEffect(() => {
    if (props.renderer !== undefined) {
      const _renderer = props.renderer
      renderer.current = _renderer

      return () => {}
    } else {
      const _renderer = PixiRenderer<N, E>({ container: ref.current!, debug: props.debug })
      renderer.current = _renderer

      return () => _renderer.delete()
    }
  }, [])

  useEffect(() => {
    const { nodes, edges, ...options } = props
    renderer.current!({ nodes, edges, options })
  }, [props])


  return (
    createElement('canvas', { ref: ref })
  )
}
