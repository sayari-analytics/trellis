import { packEnclose, packSiblings } from 'd3-hierarchy'
import { Node, Edge, connectedComponents } from '../../'


export type Options = Partial<{
  padding: number
}>


const DEFAULT_PADDING = 18


export const Layout = () => {
  return <N extends Node, E extends Edge>(graph: { nodes: N[], edges: E[], options?: Options }) => {
    const padding = graph.options?.padding ?? DEFAULT_PADDING

    const components = connectedComponents(graph).map(({ nodes, edges }) => {
      const { x, y, r } = packEnclose(nodes.map(({ x = 0, y = 0, radius: r }) => ({ x, y, r })))
      return { x0: x, y0: y, r: r + padding, nodes, edges }
    })

    return packSiblings(components).reduce<{ nodes: N[], edges: E[] }>((graph, { x0, y0, x, y, nodes, edges }) => {
      const xOffset = x0 - x
      const yOffset = y0 - y

      nodes.forEach((node) => {
        graph.nodes.push({ ...node, x: (node.x ?? 0) - xOffset, y: (node.y ?? 0) - yOffset })
      })
      edges.forEach((edge) => {
        graph.edges.push(edge)
      })

      return graph
    }, { nodes: [], edges: [] })
  }
}
