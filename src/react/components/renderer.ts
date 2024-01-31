import { createElement, useRef, useEffect } from 'react'
import { Renderer as WebGLRenderer, OptionsV1 } from './../../webgl'
import { Node, Edge, Annotation } from './../../types'

export type RendererProps<N extends Node = Node, E extends Edge = Edge> = OptionsV1 & {
  nodes: N[]
  edges: E[]
  annotations?: Annotation[]
  debug?: boolean
}

// const defaultNodesEqual = <N extends Node>(prev: N[], current: N[]) => prev === current
// const defaultEdgesEqual = <E extends Edge>(prev: E[], current: E[]) => prev === current

export const Renderer = <N extends Node = Node, E extends Edge = Edge>(props: RendererProps<N, E>) => {
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

export default Renderer
