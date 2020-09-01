import { color } from 'd3-color'
import { PIXIRenderer as Renderer } from '.'
import { NodeRenderer } from './node'
import { Node, Edge } from '../../types'


export const colorToNumber = (colorString: string): number => {
  const c = color(colorString)
  if (c === null) {
    return 0x000000
  }

  return parseInt(c.hex().slice(1), 16)
}


export const parentInFront = <N extends Node, E extends Edge>(renderer: Renderer<N, E>, parent: NodeRenderer<N, E> | undefined) => {
  while (parent) {
    if (renderer.hoveredNode === parent) {
      return true
    }
    parent = parent.parent
  }

  return false
}
