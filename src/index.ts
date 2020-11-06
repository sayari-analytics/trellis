import { NodeStyle, EdgeStyle } from './renderers/webgl'


export type Node<E extends Edge = Edge> = {
  id: string
  radius: number
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: NodeStyle
  subgraph?: {
    nodes: Node<E>[],
    edges: E[],
    options?: {}
  } | undefined
}

export type Edge = {
  id: string
  source: string
  target: string
  label?: string
  style?: EdgeStyle
}
