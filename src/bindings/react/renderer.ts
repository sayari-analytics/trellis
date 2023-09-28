import { createElement, useRef, useEffect } from 'react'
import { Renderer as WebGLRenderer, Options } from '../../renderers/webgl'
import { Node, Edge, Annotation } from '../..'

export type Props<N extends Node = Node, E extends Edge = Edge> = Options & {
  nodes: N[]
  edges: E[]
  annotations?: Annotation[]
  debug?: boolean
}

// const defaultNodesEqual = <N extends Node>(prev: N[], current: N[]) => prev === current
// const defaultEdgesEqual = <E extends Edge>(prev: E[], current: E[]) => prev === current

export const Renderer = <N extends Node = Node, E extends Edge = Edge>(props: Props<N, E>) => {
  const ref = useRef<HTMLDivElement>(null)
  const renderer = useRef<WebGLRenderer>()

  useEffect(() => {
    const _renderer = new WebGLRenderer({ container: ref.current!, debug: props.debug, width: props.width, height: props.height })
    renderer.current = _renderer

    const { nodes, edges, annotations, ...options } = props
    // options.nodesEqual = options.nodesEqual ?? defaultNodesEqual
    // options.edgesEqual = options.edgesEqual ?? defaultEdgesEqual

    renderer.current.update({ nodes, edges, annotations, options })

    return () => _renderer.delete()
  }, [])

  if (renderer.current) {
    const { nodes, edges, annotations, ...options } = props
    // options.nodesEqual = options.nodesEqual ?? defaultNodesEqual
    // options.edgesEqual = options.edgesEqual ?? defaultEdgesEqual

    renderer.current.update({ nodes, edges, annotations, options })
  }

  return createElement('div', { ref: ref })
}
