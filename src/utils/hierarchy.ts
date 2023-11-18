import { hierarchy, HierarchyPointNode } from 'd3-hierarchy'
import { Node, Edge } from '@/types'

// types
export type TreePath<N extends Node, E extends Edge> = { edge: E; node: N }

export type GraphIndex<N extends Node, E extends Edge> = Record<string, { node: N; paths: { edge: E; node: N }[] }>

export type HierarchyData<N extends Node, E extends Edge> = ({ root: true; node: N; edge: null } | { root: false; node: N; edge: E }) & {
  children: HierarchyData<N, E>[]
}

// utils
export const createNodeIndex = <N extends Node>(nodes: N[], lookup: Record<string, N> = {}) => {
  nodes.forEach((node) => {
    lookup[node.id] = node
    if (node.subgraph !== undefined) {
      createNodeIndex(node.subgraph.nodes, lookup)
    }
  })

  return lookup
}

export const createGraphIndex = <N extends Node, E extends Edge>(graph: { nodes: N[]; edges: E[] }) => {
  const nodes = createNodeIndex(graph.nodes)

  return graph.edges.reduce<GraphIndex<N, E>>((index, edge) => {
    if (nodes[edge.source] !== undefined && nodes[edge.target] !== undefined) {
      if (index[edge.source] === undefined) {
        index[edge.source] = { node: nodes[edge.source], paths: [] }
      }
      index[edge.source].paths.push({ edge, node: nodes[edge.target] })

      if (index[edge.target] === undefined) {
        index[edge.target] = { node: nodes[edge.target], paths: [] }
      }
      index[edge.target].paths.push({ edge, node: nodes[edge.source] })
    }

    return index
  }, {})
}

export const graphToBFSHierarchy = <N extends Node, E extends Edge>(index: GraphIndex<N, E>, rootId: string): HierarchyData<N, E> => {
  const children: HierarchyData<N, E>[] = []

  const queue: [string, HierarchyData<N, E>[]][] = [[rootId, children]]
  const visited = new Set<string>([rootId])

  while (queue.length > 0) {
    const [id, children] = queue.shift()!
    for (const { node, edge } of index[id].paths) {
      if (!visited.has(node.id)) {
        visited.add(node.id)
        const grandChildren: HierarchyData<N, E>[] = []
        children.push({ root: false, edge, node, children: grandChildren })
        queue.push([node.id, grandChildren])
      }
    }
  }

  return { node: index[rootId].node, root: true, edge: null, children }
}

export const graphToDFSHierarchy = <N extends Node, E extends Edge>(
  index: GraphIndex<N, E>,
  node: N,
  edge: E | null,
  visited = new Set<string>()
): HierarchyData<N, E> => {
  visited.add(node.id)

  const children: HierarchyData<N, E>[] = []

  for (const path of index[node.id].paths) {
    if (!visited.has(path.node.id)) {
      children.push(graphToDFSHierarchy(index, path.node, path.edge, visited))
    }
  }

  return edge === null ? { root: true, node, edge, children } : { root: false, node, edge, children }
}

export const graphToHierarchy = <N extends Node, E extends Edge>(index: GraphIndex<N, E>, rootId: string, bfs = true) => {
  return hierarchy(bfs ? graphToBFSHierarchy(index, rootId) : graphToDFSHierarchy(index, index[rootId].node, null))
}

export const hierarchyToGraph = <N extends Node, E extends Edge>(
  hierarchy: HierarchyPointNode<HierarchyData<N, E>>,
  nodesById: Record<string, HierarchyPointNode<HierarchyData<N, E>>> = {}
) => {
  nodesById[hierarchy.data.node.id] = hierarchy

  if (hierarchy.children !== undefined) {
    for (const child of hierarchy.children) {
      hierarchyToGraph(child, nodesById)
    }
  }

  return nodesById
}

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
