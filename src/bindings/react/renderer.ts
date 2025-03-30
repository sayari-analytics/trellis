import { createElement, useRef, useEffect } from 'react'
import type { WebGLOptions, WebGPUOptions } from 'pixi.js'
import { Renderer as WebGLRenderer } from '../../renderers/webgl-next'
import { Node, Edge, Annotation } from '../../types/api'
import { ViewportOptions } from '../../renderers/webgl-next/components/viewportComponent'
import { EventOptions } from '../../renderers/webgl-next/components/eventsComponent'

export type Props<N extends Node = Node, E extends Edge = Edge> = {
  nodes: N[]
  edges: E[]
  annotations?: Annotation[]
  width: number
  height: number
  maxZoom?: number
  alpha?: number
  color?: string
  antialias?: boolean
  resolution?: number
  renderer?: { type: 'webgl'; options?: Partial<WebGLOptions> } | { type: 'webgpu'; options?: Partial<WebGPUOptions> }
  debug?: boolean | { stats?: boolean; grid?: boolean; gridText?: boolean }
} & ViewportOptions &
  EventOptions

export const Trellis = <N extends Node = Node, E extends Edge = Edge>(props: Props<N, E>) => {
  const ref = useRef<HTMLDivElement>(null)
  const renderer = useRef<WebGLRenderer>()
  const propsRef = useRef<Props<N, E>>(props)
  propsRef.current = props

  useEffect(() => {
    const {
      debug,
      nodes,
      edges,
      annotations,
      width,
      height,
      x,
      y,
      zoom,
      minZoom,
      maxZoom,
      animateViewport,
      animateNodePosition,
      animateNodeRadius,
      dragInertia,
      ...events
    } = propsRef.current
    renderer.current = new WebGLRenderer({ container: ref.current!, debug, width, height, maxZoom })
    renderer.current.update({
      nodes,
      edges,
      annotations,
      viewport: { width, height, x, y, zoom, minZoom, maxZoom, animateViewport, animateNodePosition, animateNodeRadius, dragInertia },
      events
    })

    return () => {
      if (renderer.current) {
        renderer.current.delete()
      }
    }
  }, [])

  if (renderer.current) {
    const {
      nodes,
      edges,
      annotations,
      width,
      height,
      x,
      y,
      zoom,
      minZoom,
      maxZoom,
      animateViewport,
      animateNodePosition,
      animateNodeRadius,
      dragInertia,
      ...events
    } = propsRef.current
    renderer.current.update({
      nodes,
      edges,
      annotations,
      viewport: { width, height, x, y, zoom, minZoom, maxZoom, animateViewport, animateNodePosition, animateNodeRadius, dragInertia },
      events
    })
  }

  return createElement('div', { ref })
}
