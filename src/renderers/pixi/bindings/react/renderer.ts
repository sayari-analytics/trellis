import { createElement, useRef, useEffect } from 'react'
import { Renderer as PixiRenderer, RendererOptions } from '../../'
import { Node, Edge } from '../../../../'


export type Props<N extends Node = Node, E extends Edge = Edge> =
  Partial<RendererOptions<N, E>> &
  {
    nodes: N[]
    edges: E[]
    debug?: { logPerformance?: boolean, stats?: Stats }
  }


const defaultNodesEqual = <N extends Node>(prev: N[], current: N[]) => prev === current
const defaultEdgesEqual = <E extends Edge>(prev: E[], current: E[]) => prev === current


export const Renderer = <N extends Node = Node, E extends Edge = Edge>(props: Props<N, E>) => {

  const ref = useRef<HTMLDivElement>(null)
  const renderer = useRef<(graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => void>()

  useEffect(() => {
    const _renderer = PixiRenderer<N, E>({ container: ref.current!, debug: props.debug })
    renderer.current = _renderer

    return () => _renderer.delete()
  }, [])

  useEffect(() => {
    const { nodes, edges, ...options } = props
    options.nodesEqual = options.nodesEqual ?? defaultNodesEqual
    options.edgesEqual = options.edgesEqual ?? defaultEdgesEqual

    renderer.current!({ nodes, edges, options })
  }, [props])


  return (
    createElement('div', { ref: ref })
  )
}
