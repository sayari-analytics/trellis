import { createElement, useRef, useEffect } from 'react'
import PixiRenderer, { Options } from '../../renderers/webgl'
import { Node, Edge, Annotation } from '../../trellis'
import Stats from 'stats.js'

export type Props<N extends Node = Node, E extends Edge = Edge> = Partial<Options<N, E>> & {
  nodes: N[]
  edges: E[]
  annotations?: Annotation[]
  debug?: { logPerformance?: boolean; stats?: Stats }
}

const defaultNodesEqual = <N extends Node>(prev: N[], current: N[]) => prev === current
const defaultEdgesEqual = <E extends Edge>(prev: E[], current: E[]) => prev === current

const Renderer = <N extends Node = Node, E extends Edge = Edge>(props: Props<N, E>) => {
  const ref = useRef<HTMLDivElement>(null)
  const renderer = useRef<(graph: { nodes: N[]; edges: E[]; annotations?: Annotation[]; options?: Partial<Options<N, E>> }) => void>()

  useEffect(() => {
    const _renderer = PixiRenderer({ container: ref.current!, debug: props.debug })
    renderer.current = _renderer

    const { nodes, edges, annotations, ...options } = props
    options.nodesEqual = options.nodesEqual ?? defaultNodesEqual
    options.edgesEqual = options.edgesEqual ?? defaultEdgesEqual

    renderer.current({ nodes, edges, annotations, options })

    return () => _renderer.delete()
  }, [])

  if (renderer.current) {
    const { nodes, edges, annotations, ...options } = props
    options.nodesEqual = options.nodesEqual ?? defaultNodesEqual
    options.edgesEqual = options.edgesEqual ?? defaultEdgesEqual

    renderer.current({ nodes, edges, annotations, options })
  }

  return createElement('div', { ref: ref })
}

export default Renderer
