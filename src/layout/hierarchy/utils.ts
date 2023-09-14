import { HierarchyPointNode } from 'd3-hierarchy'
import type { Node } from '../../trellis'

// types
export type Hierarchy = { id: string; children: Hierarchy[] }

// utils
const _graphToDFSHierarchy = (edgeIndex: Record<string, string[]>, id: string, visited: Set<string>): Hierarchy => {
  visited.add(id)

  const children: Hierarchy[] = []

  for (const child of edgeIndex[id]) {
    if (!visited.has(child)) {
      children.push(_graphToDFSHierarchy(edgeIndex, child, visited))
    }
  }

  return { id, children }
}

export const graphToDFSHierarchy = (edgeIndex: Record<string, string[]>, id: string): Hierarchy =>
  _graphToDFSHierarchy(edgeIndex, id, new Set())

export const graphToBFSHierarchy = (edgeIndex: Record<string, string[]>, id: string): Hierarchy => {
  const children: Hierarchy['children'] = []

  const queue: (readonly [string, Hierarchy['children']])[] = [[id, children]]

  const visited = new Set<string>([id])

  while (queue.length > 0) {
    const [id, children] = queue.shift()!

    for (const child of edgeIndex[id]) {
      if (!visited.has(child)) {
        visited.add(child)
        const grandChildren: Hierarchy['children'] = []
        children.push({ id: child, children: grandChildren })
        queue.push([child, grandChildren] as const)
      }
    }
  }

  return {
    id,
    children
  }
}

const _hierarchyToGraph = (
  hierarchy: HierarchyPointNode<Hierarchy>,
  nodesById: Record<string, HierarchyPointNode<Hierarchy> | undefined>
) => {
  nodesById[hierarchy.data.id] = hierarchy

  if (hierarchy.children !== undefined) {
    for (const child of hierarchy.children) {
      _hierarchyToGraph(child, nodesById)
    }
  }

  return nodesById
}

export const hierarchyToGraph = (hierarchy: HierarchyPointNode<Hierarchy>) => _hierarchyToGraph(hierarchy, {})

export const containsSubgraphNode = (nodes: Node[], id: string): boolean => {
  for (const node of nodes) {
    if (node.id === id) return true

    if (node.subgraph !== undefined) {
      const exists = containsSubgraphNode(node.subgraph.nodes, id)
      if (exists) return true
    }
  }

  return false
}

export const findAncestor = (nodes: Node[], id: string): string | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node.id

    if (node.subgraph !== undefined) {
      const exists = containsSubgraphNode(node.subgraph.nodes, id)
      if (exists) return node.id
    }
  }

  return undefined
}
