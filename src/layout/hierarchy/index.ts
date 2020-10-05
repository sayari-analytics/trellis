import { hierarchy, HierarchyPointNode, tree } from 'd3-hierarchy'
import { Node, Edge } from '../../'


export type LayoutOptions = {
}

type Hierarchy = {
  id: string,
  children: Hierarchy[]
}



const graphToHierarchy = (edgeIndex: Record<string, string[]>, visited: Set<string>, id: string): Hierarchy => {
  visited.add(id)

  const children: Hierarchy[] = []

  for (const child of edgeIndex[id]) {
    if (!visited.has(child)) {
      children.push(graphToHierarchy(edgeIndex, visited, child))
    }
  }

  return { id, children }
}

const hierarchyToGraph = (hierarchy: HierarchyPointNode<Hierarchy>, nodesById: Record<string, HierarchyPointNode<Hierarchy> | undefined>) => {
  nodesById[hierarchy.data.id] = hierarchy

  if (hierarchy.children !== undefined) {
    for (const child of hierarchy.children) {
      hierarchyToGraph(child, nodesById)
    }
  }

  return nodesById
}


export const Layout = () => {
  return <N extends Node<E>, E extends Edge>(root: string, graph: { nodes: N[], edges: E[], options?: Partial<LayoutOptions> }) => {
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

    const layout = tree<Hierarchy>() // .size([1000, 1000])

    const data = graphToHierarchy(edgeIndex, new Set(), root)

    const hierarchicalData = hierarchy(data)

    const positionedData = layout.nodeSize([120, 240])(hierarchicalData)

    const positionedDataById = hierarchyToGraph(positionedData, {})

    // const data2 = hierarchyToGraph(tree<Hierarchy>()(hierarchy(graphToHierarchy(edgeIndex, new Set(), root))), {})

    // const data3 = compose(
    //   graphToHierarchy,
    //   tree<Hierarchy>(),
    //   hierarchy,
    //   graphToHierarchy(edgeIndex, new Set(), root)
    // )

    return {
      ...graph,
      nodes: graph.nodes.map((node) => {
        const positionedNode = positionedDataById[node.id]

        return {
          ...node,
          x: (positionedNode?.x ?? 0),
          y: (positionedNode?.y ?? 0) - (window.innerHeight / 2),
        }
      })
    }
  }
}
