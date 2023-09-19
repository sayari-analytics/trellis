import type { Node, Edge, Placement } from '../../trellis'
import { findAncestor, hierarchyToGraph, graphToBFSHierarchy, graphToDFSHierarchy, Hierarchy } from './utils'
import { HierarchyPointNode, hierarchy } from 'd3-hierarchy'
import tree from './tree'

export type Options = Partial<{
  x: number
  y: number
  nodeSize: [number, number]
  size: [number, number]
  separation: (a: HierarchyPointNode<Hierarchy>, b: HierarchyPointNode<Hierarchy>) => number
  bfs: boolean
  anchor: Placement
  alignment: 'min' | 'mid' | 'max'
}>

export const DEFAULT_NODE_SIZE: [number, number] = [120, 240]

export const Layout = () => {
  return <N extends Node, E extends Edge>(_root: string, graph: { nodes: N[]; edges: E[]; options?: Options }) => {
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

    if (edgeIndex[rootId] === undefined) {
      return { nodes: graph.nodes, edges: graph.edges }
    }

    const root = hierarchy(graph.options?.bfs !== false ? graphToBFSHierarchy(edgeIndex, rootId) : graphToDFSHierarchy(edgeIndex, rootId))
    const layout = tree<Hierarchy>()

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

    const { x = 0, y = 0 } = graph.nodes.find((node) => node.id === _root) ?? {}

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
