import type { Node, Edge } from '../../trellis'
import { findAncestor, hierarchyToGraph, graphToBFSHierarchy, graphToDFSHierarchy, SeparationFn, Hierarchy } from './utils'
import { hierarchy } from 'd3-hierarchy'
import tree from './tree'

export type Options = Partial<{
  x: number
  y: number
  nodeSize: [number, number]
  size: [number, number]
  separation: SeparationFn
  bfs: boolean
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

    const positionedDataById = hierarchyToGraph(
      layout(hierarchy(graph.options?.bfs !== false ? graphToBFSHierarchy(edgeIndex, root) : graphToDFSHierarchy(edgeIndex, root)))
    )

    const { x, y } = graph.nodes.find((node) => node.id === rootId) ?? {
      x: undefined,
      y: undefined
    }
    const xOffset = (graph.options?.x ?? 0) + (x ?? 0)
    const yOffset = (graph.options?.y ?? 0) - (y ?? 0)

    return {
      edges: graph.edges,
      nodes: graph.nodes.map((node) => {
        const positionedNode = positionedDataById[node.id]

        return positionedNode === undefined
          ? node
          : {
              ...node,
              x: positionedNode.x + xOffset,
              y: positionedNode.y - yOffset
            }
      })
    }
  }
}
