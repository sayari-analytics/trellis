import { createElement, useRef, useEffect } from 'react'
import * as PixiRenderer from '..'
import { Node, Edge } from '../../../types'


export type Props<N extends Node, E extends Edge> =
  Partial<PixiRenderer.RendererOptions<N, E>> &
  {
    debug?: { logPerformance?: boolean, stats?: Stats }
    nodes: N[]
    edges: E[]
  }


export const Renderer = <N extends Node, E extends Edge>(props: Props<N, E>) => {

  const ref = useRef<HTMLCanvasElement>(null)
  const renderer = useRef<(graph: { nodes: N[], edges: E[], options?: Partial<PixiRenderer.RendererOptions<N, E>> }) => void>()

  useEffect(() => {
    renderer.current = PixiRenderer.Renderer<N, E>({ container: ref.current!, debug: props.debug })
  }, [])

  useEffect(() => {
    const { nodes, edges, ...options } = props
    renderer.current!({ nodes, edges, options })
  }, [props])


  return (
    createElement('canvas', { ref: ref })
  )
}
