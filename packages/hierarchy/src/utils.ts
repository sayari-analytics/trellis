import { hierarchy, HierarchyPointNode } from './hierarchy'
import type { Id, Node, Edge } from '@sayari/trellis'

/**
 * Graph -> hierarchy adapters. A trellis graph is a flat node/edge list with no inherent root; a tree
 * layout needs a rooted parent/child hierarchy. These build that hierarchy by walking the (undirected)
 * adjacency out from a chosen root, then map the laid-out hierarchy back to node ids.
 *
 */

type TreePath<N extends Node, E extends Edge> = { edge: E; node: N }

type GraphIndex<N extends Node, E extends Edge> = Record<Id, { node: N; paths: TreePath<N, E>[] }>

// Non-root nodes retain the inbound edge used to reach them.
export type HierarchyData<N extends Node, E extends Edge> = ({ root: true; node: N; edge: null } | { root: false; node: N; edge: E }) & {
  children: HierarchyData<N, E>[]
}

const createNodeIndex = <N extends Node>(nodes: N[], lookup: Record<Id, N> = {}) => {
  nodes.forEach((node) => {
    lookup[node.id] = node
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

// breadth-first spanning tree: places each node at its shortest-hop depth from the root (wide, shallow)
const graphToBFSHierarchy = <N extends Node, E extends Edge>(index: GraphIndex<N, E>, rootId: Id): HierarchyData<N, E> => {
  const children: HierarchyData<N, E>[] = []

  const queue: [Id, HierarchyData<N, E>[]][] = [[rootId, children]]
  const visited = new Set<Id>([rootId])

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

// depth-first spanning tree: follows each branch to its end before backtracking (narrow, deep)
const graphToDFSHierarchy = <N extends Node, E extends Edge>(
  index: GraphIndex<N, E>,
  node: N,
  edge: E | null,
  visited = new Set<Id>()
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

export const graphToHierarchy = <N extends Node, E extends Edge>(index: GraphIndex<N, E>, rootId: Id, bfs = true) => {
  return hierarchy(bfs ? graphToBFSHierarchy(index, rootId) : graphToDFSHierarchy(index, index[rootId].node, null))
}

// flatten the laid-out hierarchy back to a node id -> positioned-node lookup
export const hierarchyToGraph = <N extends Node, E extends Edge>(
  hierarchy: HierarchyPointNode<HierarchyData<N, E>>,
  nodesById: Record<Id, HierarchyPointNode<HierarchyData<N, E>>> = {}
) => {
  nodesById[hierarchy.data.node.id] = hierarchy

  if (hierarchy.children !== undefined) {
    for (const child of hierarchy.children) {
      hierarchyToGraph(child, nodesById)
    }
  }

  return nodesById
}
