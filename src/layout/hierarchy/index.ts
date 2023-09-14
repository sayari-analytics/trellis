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
  return <N extends Node, E extends Edge>(rootId: string, graph: { nodes: N[]; edges: E[]; options?: Options }) => {
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

    const root = edgeIndex[rootId] === undefined ? findAncestor(graph.nodes, rootId) ?? rootId : rootId

    if (edgeIndex[root] === undefined) {
      return { nodes: graph.nodes, edges: graph.edges }
    }

    const layout =
      graph.options?.size !== undefined
        ? tree<Hierarchy>().size(graph.options.size)
        : tree<Hierarchy>().nodeSize(graph.options?.nodeSize ?? DEFAULT_NODE_SIZE)

    if (graph.options?.separation !== undefined) {
      layout.separation(graph.options.separation)
    }

    if (graph.options?.alignment !== undefined) {
      layout.alignment(graph.options.alignment)
    }

    const positionedDataById = hierarchyToGraph(
      layout(hierarchy(graph.options?.bfs !== false ? graphToBFSHierarchy(edgeIndex, root) : graphToDFSHierarchy(edgeIndex, root)))
    )

    const { x = 0, y = 0 } = graph.nodes.find((node) => node.id === rootId) ?? {}

    const xOffset = (graph.options?.x ?? 0) + x
    const yOffset = (graph.options?.y ?? 0) - y

    return {
      edges: graph.edges,
      nodes: graph.nodes.map((node) => {
        const positionedNode = positionedDataById[node.id]

        if (positionedNode !== undefined) {
          const x = positionedNode.x + xOffset
          const y = positionedNode.y - yOffset
          if (graph.options?.anchor === 'left') {
            return { ...node, y: x, x: y }
          } else {
            return { ...node, x, y }
          }
        }

        return node
      })
    }
  }
}
