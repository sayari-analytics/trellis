import { NodeStyle, EdgeStyle } from './renderers/pixi'


export type Node<E extends Edge = Edge> = {
  id: string
  radius: number // if radius is ignored for nodes with a subGraph, should node be a typed union?
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: Partial<NodeStyle>
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
  style?: Partial<EdgeStyle>
}

export type Extend<T, R> = {
  [K in Exclude<keyof T, keyof R>]: T[K];
} & R
