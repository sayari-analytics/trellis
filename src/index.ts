import { NodeStyle, EdgeStyle } from './renderers/pixi'


export type Node<E extends Edge = Edge, Style = Partial<NodeStyle>> = {
  id: string
  radius?: number
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: Style
  subGraph?: {
    nodes: Node<E>[],
    edges: E[],
    options?: {}
  } | undefined
}

export type Edge<Style = Partial<EdgeStyle>> = {
  id: string
  source: string
  target: string
  label?: string
  style?: Style
}
