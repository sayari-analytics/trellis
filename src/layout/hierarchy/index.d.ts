import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy'
import type { Node, Edge, Placement } from '../../trellis'
import type { HierarchyData } from './utils'
import type { Extend } from '../../types'

export type Options<N extends Node, E extends Edge> = Partial<{
  x: number
  y: number
  bfs: boolean
  anchor: Placement
  alignment: 'min' | 'mid' | 'max'
  size: [number, number]
  nodeSize: [number, number]
  separation: (a: HierarchyPointNode<HierarchyData<N, E>>, b: HierarchyPointNode<HierarchyData<N, E>>) => number
  sort: (a: HierarchyNode<HierarchyData<N, E>>, b: HierarchyNode<HierarchyData<N, E>>) => number
}>

export function Layout(): <N extends Node, E extends Edge>(
  root: string,
  graph: { nodes: N[]; edges: E[]; options?: Options<N, E> }
) => { edges: E[]; nodes: Extend<N, { x: number; y: number }>[] }
