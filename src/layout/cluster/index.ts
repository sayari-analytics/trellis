import { pack, hierarchy } from 'd3-hierarchy'
import { Node } from '../../'


export const Layout = () => {
  return <N extends Node>(nodes: N[]) => {
    const positions: Record<string, [number, number]> = {}

    // TODO - is packSiblings a better fit here?
    pack<{ id: string, radius: number }>()
      .padding(20)
      .radius((node) => node.data.radius)(
        hierarchy({ id: '_root_', radius: 200, children: nodes.map(({ id, radius }) => ({ id, radius })) })
      )
      .children?.forEach(({ x, y, data: { id } }) => {
        positions[id] = [x, y]
      })

    // TODO: could also pass fx and fy to hierarchy and that should take care of it
    return nodes.map((node) => ({ ...node, x: node.fx ?? positions[node.id][0], y: node.fy ?? positions[node.id][1] }))
  }
}
