import type { Node, Edge, Placement } from '../../trellis'
import { hierarchyToGraph, createGraphIndex, graphToHierarchy, HierarchyData } from './utils'
import { HierarchyNode } from 'd3-hierarchy'
import tree from './tree'

type CompareFn<N extends Node, E extends Edge> = (a: HierarchyNode<HierarchyData<N, E>>, b: HierarchyNode<HierarchyData<N, E>>) => number

export type Options<N extends Node, E extends Edge> = Partial<{
  x: number
  y: number
  bfs: boolean
  anchor: Placement
  alignment: 'min' | 'mid' | 'max'
  size: [number, number]
  nodeSize: [number, number]
  separation: CompareFn<N, E>
  sort: CompareFn<N, E> | CompareFn<N, E>[]
}>

const DEFAULT_NODE_SIZE: [number, number] = [120, 240]

export const Layout = () => {
  return <N extends Node, E extends Edge>(
    rootId: string,
    { options = {}, ...graph }: { nodes: N[]; edges: E[]; options?: Options<N, E> }
  ) => {
    const index = createGraphIndex(graph)

    if (index[rootId] === undefined) {
      return { nodes: graph.nodes, edges: graph.edges }
    }

    const hierarchy = graphToHierarchy(index, rootId, options?.bfs)

    if (Array.isArray(options.sort)) {
      options.sort.forEach((sort) => {
        hierarchy.sort(sort)
      })
    } else if (options.sort !== undefined) {
      hierarchy.sort(options.sort)
    }

    const layout = tree<HierarchyData<N, E>>()
    const nodeSize = options.nodeSize ?? DEFAULT_NODE_SIZE

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

    const xOffset = (options.x ?? 0) + (index[rootId].node.x ?? 0)
    const yOffset = (options.y ?? 0) - (index[rootId].node.y ?? 0)

    return {
      edges: graph.edges,
      nodes: graph.nodes.map((node) => {
        const position = positionedDataById[node.id]

        if (position === undefined) {
          return node
        }

        const x = position.x + xOffset
        const y = position.y - yOffset

        switch (options.anchor) {
          case 'left':
            // rotate tree 90 degrees by replacing x and y
            return { ...node, y: x, x: y }
          case 'right':
            // rotate tree 90 degrees and flip on x axis by offsetting with tree width
            return { ...node, y: x, x: width - y }
          case 'bottom':
            // flip on y axis by offsetting with tree height
            return { ...node, x, y: height - y }
          default:
            // default to top
            return { ...node, x, y }
        }
      })
    }
  }
}
