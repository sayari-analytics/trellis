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
      // TODO: not sure if I should use fx/fy when mapping nodes here. The only case I am thinking where this would likely cause wonkiness
      // is if there are 2 fixed nodes in a component that are rather far apart, causing the component's radius to be VERY large
      // likely making the graph less readable?
      const { x, y, r } = packEnclose(nodes.map(({ x = 0, y = 0, fx, fy, radius: r }) => ({ x: fx ?? x, y: fy ?? y, r })))
      return { x0: x, y0: y, r: r + padding, nodes, edges }
    })

    return packSiblings(components).reduce<{ nodes: N[], edges: E[] }>((graph, { x0, y0, x, y, nodes, edges }) => {
      const xOffset = x0 - x
      const yOffset = y0 - y

      nodes.forEach((node) => {
        graph.nodes.push({ ...node, x: node.fx ?? ((node.x ?? 0) - xOffset), y: node.fy ?? ((node.y ?? 0) - yOffset) })
      })
      edges.forEach((edge) => {
        graph.edges.push(edge)
      })

      return graph
    }, { nodes: [], edges: [] })
  }
}
