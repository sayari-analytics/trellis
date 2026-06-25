import type { Id, Node, Edge } from '@sayari/trellis'
import { HierarchyNode } from './hierarchy'
import { hierarchyToGraph, createGraphIndex, graphToHierarchy, HierarchyData } from './utils'
import tree from './tree'

/**
 * Hierarchy (tree) layout for trellis graphs.
 *
 * Given a flat node/edge graph and a `rootId`, it builds a rooted spanning tree out from that node
 * (breadth- or depth-first), runs the Reingold–Tilford "tidy" tree algorithm (see ./tree), and returns
 * the graph with the reachable nodes repositioned. Nodes not reachable from the root keep their current
 * position. The tree is offset so the root stays at its current world position.
 */

type CompareFn<N extends Node, E extends Edge> = (a: HierarchyNode<HierarchyData<N, E>>, b: HierarchyNode<HierarchyData<N, E>>) => number

export type Options<N extends Node, E extends Edge> = {
  rootId: Id // node to use as the root of the spanning tree
} & Partial<{
  x: number // additional x offset applied on top of the root's current position
  y: number // additional y offset applied on top of the root's current position
  bfs: boolean // breadth-first spanning tree (default) vs depth-first
  orientation: 'bottom' | 'left' | 'top' | 'right' // direction the tree grows from the root
  alignment: 'min' | 'mid' | 'max' // how a parent aligns over its children
  size: [number, number] // scale the whole tree to fit this [width, height] (overrides siblingGap/levelGap)
  siblingGap: number // spacing between adjacent sibling/subtree nodes along the breadth axis
  levelGap: number // spacing between parent/child levels along the growth axis
  separation: CompareFn<N, E> // spacing between adjacent subtrees
  sort: CompareFn<N, E> | CompareFn<N, E>[] // child ordering
}>

const DEFAULT_SIBLING_GAP = 120
const DEFAULT_LEVEL_GAP = 240

export const layout = <N extends Node, E extends Edge>(nodes: N[], edges: E[], options: Options<N, E>): { nodes: N[]; edges: E[] } => {
  const graph = { nodes, edges }
  const index = createGraphIndex(graph)

  if (index[options.rootId] === undefined) {
    return { nodes: graph.nodes, edges: graph.edges }
  }

  const hierarchy = graphToHierarchy(index, options.rootId, options.bfs)

  if (Array.isArray(options.sort)) {
    options.sort.forEach((sort) => {
      hierarchy.sort(sort)
    })
  } else if (options.sort !== undefined) {
    hierarchy.sort(options.sort)
  }

  const layout = tree<HierarchyData<N, E>>()
  const nodeSize: [number, number] = [options.siblingGap ?? DEFAULT_SIBLING_GAP, options.levelGap ?? DEFAULT_LEVEL_GAP]

  if (options.size !== undefined) {
    layout.size(options.size)
  } else {
    layout.nodeSize(nodeSize)
  }

  if (options.separation !== undefined) {
    layout.separation(options.separation)
  }

  if (options.alignment !== undefined) {
    layout.alignment(options.alignment)
  }

  const positionedDataById = hierarchyToGraph(layout(hierarchy))

  const width = options.size?.[0] ?? hierarchy.height * nodeSize[1]
  const height = options.size?.[1] ?? hierarchy.height * nodeSize[0]

  const xOffset = (options.x ?? 0) + index[options.rootId].node.x
  const yOffset = (options.y ?? 0) - index[options.rootId].node.y

  return {
    edges: graph.edges,
    nodes: graph.nodes.map((node) => {
      const position = positionedDataById[node.id]

      if (position === undefined) {
        return node
      }

      const x = position.x + xOffset
      const y = position.y - yOffset

      switch (options.orientation) {
        case 'left':
          // rotate tree 90 degrees by replacing x and y
          return { ...node, y: x, x: y }
        case 'right':
          // rotate tree 90 degrees and flip on x axis by offsetting with tree width
          return { ...node, y: x, x: width - y }
        case 'bottom':
          // root at the bottom, tree grows up (+y is up in the trellis renderer)
          return { ...node, x, y }
        default:
          // default to top: root at the top, tree grows down (flip on y axis)
          return { ...node, x, y: height - y }
      }
    })
  }
}
