import { pack, hierarchy } from 'd3-hierarchy'
import { Node } from '../../trellis'

const Layout = () => {
  return <N extends Node>(nodes: N[]) => {
    const positions: Record<string, [number, number]> = {}

    // TODO - is packSiblings a better fit here?
    pack<{ id: string; radius: number; children: { id: string; radius: number }[] }>()
      .padding(20)
      .radius((node) => node.data.radius)(
        hierarchy({
          id: '_root_',
          radius: 200,
          children: nodes.map(({ id, radius }) => ({ id, radius }))
        })
      )
      .children?.forEach(({ x, y, data: { id } }) => {
        positions[id] = [x, y]
      })

    return nodes.map((node) => ({ ...node, x: positions[node.id][0], y: positions[node.id][1] }))
  }
}

export default { Layout }
