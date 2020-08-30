export type Node<E extends Edge = Edge> = {
  id: string
  radius: number // if radius is ignored for nodes with a subGraph, should node be a typed union?
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: {}
  subGraph?: {
    nodes: Node<E>[],
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

// export type PositionedNode<E extends Edge = Edge, Props extends Record<string, unknown> = {}> = {
//   id: string
//   radius: number
//   x: number
//   y: number
//   label?: string
//   style?: {}
//   subGraph?: {
//     nodes: PositionedNode<E, Props>[],
//     edges: E[],
//     options?: {}
//   }
// } & Props

export type PositionedNode<E extends Edge = Edge> = {
  id: string
  radius: number
  x: number
  y: number
  label?: string
  style?: {}
  subGraph?: {
    nodes: PositionedNode<E>[],
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
