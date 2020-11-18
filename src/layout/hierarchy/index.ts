import { hierarchy, HierarchyPointNode, tree } from 'd3-hierarchy'
import { Node, Edge } from '../../'


export type Options = Partial<{
  x: number
  y: number
  nodeSize: [number, number]
  size: [number, number]
  separation: (a: HierarchyPointNode<Hierarchy>, b: HierarchyPointNode<Hierarchy>) => number
  bfs: boolean
}>

type Hierarchy = {
  id: string,
  children: Hierarchy[]
}


const DEFAULT_NODE_SIZE: [number, number] = [120, 240]


/**
 * utils
 */
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

const graphToDFSHierarchy = (edgeIndex: Record<string, string[]>, id: string): Hierarchy => _graphToDFSHierarchy(edgeIndex, id, new Set())

const graphToBFSHierarchy = (edgeIndex: Record<string, string[]>, id: string): Hierarchy => {
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

const _hierarchyToGraph = (hierarchy: HierarchyPointNode<Hierarchy>, nodesById: Record<string, HierarchyPointNode<Hierarchy> | undefined>) => {
  nodesById[hierarchy.data.id] = hierarchy

  if (hierarchy.children !== undefined) {
    for (const child of hierarchy.children) {
      _hierarchyToGraph(child, nodesById)
    }
  }

  return nodesById
}

const hierarchyToGraph = (hierarchy: HierarchyPointNode<Hierarchy>) => _hierarchyToGraph(hierarchy, {})



export const Layout = () => {
  return <N extends Node, E extends Edge>(root: string, graph: { nodes: N[], edges: E[], options?: Options }) => {
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

    if (edgeIndex[root] === undefined) {
      return graph
    }

    let layout = graph.options?.size !== undefined ?
      tree<Hierarchy>().size(graph.options.size) :
      tree<Hierarchy>().nodeSize(graph.options?.nodeSize ?? DEFAULT_NODE_SIZE)

    if (graph.options?.separation !== undefined) {
      layout.separation(graph.options.separation)
    }

    const positionedDataById = hierarchyToGraph(
      layout(
        hierarchy(
          graph.options?.bfs !== false ?
            graphToBFSHierarchy(edgeIndex, root) :
            graphToDFSHierarchy(edgeIndex, root)
        )
      )
    )

    // const positionedDataById = compose(
    //   hierarchyToGraph,
    //   tree<Hierarchy>().nodeSize(graph.options?.nodeSize ?? DEFAULT_NODE_SIZE),
    //   hierarchy,
    //   graph.options?.bfs !== false ?
    //     graphToBFSHierarchy(edgeIndex, root) :
    //     graphToDFSHierarchy(edgeIndex, root)
    // )

    return {
      ...graph,
      nodes: graph.nodes.map((node) => {
        const positionedNode = positionedDataById[node.id]

        return positionedNode === undefined ?
          node :
          {
            ...node,
            x: positionedNode.x + (graph.options?.x ?? 0),
            y: positionedNode.y - (graph.options?.y ?? 0),
          }
      })
    }
  }
}
