import { createElement, useRef, useEffect } from 'react'
import { Renderer as WebGLRenderer, Options } from '../../renderers/webgl'
import { Node, Edge, Annotation } from '../../types/api'

export type Props<N extends Node = Node, E extends Edge = Edge> = Options & {
  nodes: N[]
  edges: E[]
  annotations?: Annotation[]
  debug?: boolean
}

export const Trellis = <N extends Node = Node, E extends Edge = Edge>(props: Props<N, E>) => {
  const ref = useRef<HTMLDivElement>(null)
  const renderer = useRef<WebGLRenderer>()
  const propsRef = useRef<Props<N, E>>(props)
  propsRef.current = props

  useEffect(() => {
    const { debug, nodes, edges, annotations, ...options } = propsRef.current
    renderer.current = new WebGLRenderer({ container: ref.current!, debug: debug, width: options.width, height: options.height })
    renderer.current.update({ nodes, edges, annotations, options })

    return () => renderer.current!.delete()
  }, [])

  if (renderer.current) {
    const { nodes, edges, annotations, ...options } = props
    renderer.current.update({ nodes, edges, annotations, options })
  }

  return createElement('div', { ref })
}
