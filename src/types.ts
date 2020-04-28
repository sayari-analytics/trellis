export type Node<E extends Edge = Edge> = {
  id: string
  radius: number
  x?: number | undefined
  y?: number | undefined
  label?: string | undefined
  style?: {}
  subGraph?: {
    nodes: Node<E>[], // TODO - how to ensure that types that extend Node have their subgraph.nodes type also extended?
    edges: E[],
    options?: {}
  }
}

export type Edge = {
  id: string
  source: string
  target: string
  label?: string
  style?: {}
}

export type PositionedNode<E extends Edge = Edge> = {
  id: string
  radius: number
  x: number
  y: number
  label?: string
  style?: {}
  subGraph?: {
    nodes: PositionedNode<E>[], // TODO - how to ensure that types that extend Node have their subgraph.nodes type also extended?
    edges: E[],
    options?: {}
  }
}

export type PositionNode<N extends Node<E>, E extends Edge = Edge> = Omit<N, 'x' | 'y' | 'subGraph'> & {
  x: number,
  y: number,
  subGraph?: {
    nodes: PositionNode<N, E>[],
    edges: E[],
    options?: Exclude<N['subGraph'], undefined>['options']
  }
}
