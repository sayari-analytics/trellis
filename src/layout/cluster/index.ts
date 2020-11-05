import { pack, hierarchy } from 'd3-hierarchy'
import { Node, Edge } from '../../'


export const Layout = <N extends Node<E>, E extends Edge>() => {
  return (nodes: N[]) => {
    const positions: Record<string, [number, number]> = {}

    pack<{ id: string, radius: number }>()
      .padding(20)
      .radius((node) => node.data.radius)
      (hierarchy({ id: '_root_', radius: 200, children: nodes.map(({ id, radius }) => ({ id, radius })) }))
      .children?.forEach(({ x, y, data: { id } }) => {
        positions[id] = [x, y]
      })

    return nodes.map((node) => ({
      ...node, x: positions[node.id][0], y: positions[node.id][1]
    }))
  }
}
