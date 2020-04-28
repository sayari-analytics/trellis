import { color } from 'd3-color'
import { PIXIRenderer as Renderer, EdgeDatum, NodeDatum } from '.'
import { Node } from './node'


export const colorToNumber = (colorString: string): number => {
  const c = color(colorString)
  if (c === null) {
    return 0x000000
  }

  return parseInt(c.hex().slice(1), 16)
}


export const parentInFront = <N extends NodeDatum, E extends EdgeDatum>(renderer: Renderer<N, E>, parent: Node<N, E> | undefined) => {
  while (parent) {
    if (renderer.hoveredNode === parent) {
      return true
    }
    parent = parent.parent
  }

  return false
}
