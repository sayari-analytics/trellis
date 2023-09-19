import type { Node, Edge, Placement } from '../../trellis'
import { findAncestor, hierarchyToGraph, createGraphIndex, graphToHierarchy, HierarchyData } from './utils'
import { HierarchyNode, HierarchyPointNode, hierarchy } from 'd3-hierarchy'
import tree from './tree'

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

const DEFAULT_NODE_SIZE: [number, number] = [120, 240]

export const Layout = () => {
  return <N extends Node, E extends Edge>(_root: string, graph: { nodes: N[]; edges: E[]; options?: Options<N, E> }) => {
    const index = createGraphIndex(graph)

    const edgeIndex = graph.edges.reduce<Record<string, string[]>>((edgeIndex, edge) => {
      if (edgeIndex[edge.source] === undefined) {
        edgeIndex[edge.source] = []
      }
      edgeIndex[edge.source].push(edge.target)

      if (edgeIndex[edge.target] === undefined) {
        edgeIndex[edge.target] = []
      }
      edgeIndex[edge.target].push(edge.source)

      return edgeIndex
    }, {})

    const rootId = edgeIndex[_root] === undefined ? findAncestor(graph.nodes, _root) ?? _root : _root

    if (index[rootId] === undefined) {
      return { nodes: graph.nodes, edges: graph.edges }
    }

    const root = hierarchy(graphToHierarchy(index, rootId, graph.options?.bfs))

    if (graph.options?.sort !== undefined) {
      root.sort(graph.options.sort)
    }

    const layout = tree<HierarchyData<N, E>>()

    const nodeSize = graph.options?.nodeSize ?? DEFAULT_NODE_SIZE
    if (graph.options?.size !== undefined) {
      layout.size(graph.options.size)
    } else {
      layout.nodeSize(nodeSize)
    }

    if (graph.options?.separation !== undefined) {
      layout.separation(graph.options.separation)
    }

    if (graph.options?.alignment !== undefined) {
      layout.alignment(graph.options.alignment)
    }

    const positionedDataById = hierarchyToGraph(layout(root))

    const { x = 0, y = 0 } = index[rootId].node
    const xOffset = (graph.options?.x ?? 0) + x
    const yOffset = (graph.options?.y ?? 0) - y

    return {
      edges: graph.edges,
      nodes: graph.nodes.map((node) => {
        const positionedNode = positionedDataById[node.id]

        if (positionedNode !== undefined) {
          const x = positionedNode.x + xOffset
          const y = positionedNode.y - yOffset
          switch (graph.options?.anchor) {
            case 'left':
              // rotate tree 90 degrees by replacing x and y
              return { ...node, y: x, x: y }
            case 'right':
              // rotate tree 90 degrees and flip on x axis by offsetting with tree width
              return { ...node, y: x, x: root.height * nodeSize[1] - y }
            case 'bottom':
              // flip on y axis by offsetting with tree height
              return { ...node, x, y: root.height * nodeSize[0] - y }
            default:
              // default to top
              return { ...node, x, y }
          }
        }

        return node
      })
    }
  }
}
