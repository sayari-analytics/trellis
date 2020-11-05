import { NodeStyle, EdgeStyle } from './renderers/webgl'


export type Node<E extends Edge = Edge, Style = NodeStyle> = {
  id: string
  radius: number
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: Style
  subgraph?: {
    nodes: Node<E>[],
    edges: E[],
    options?: {}
  } | undefined
}

export type Edge<Style = EdgeStyle> = {
  id: string
  source: string
  target: string
  label?: string
  style?: Style
}
