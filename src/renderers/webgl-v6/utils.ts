import { color } from 'd3-color'
import { InternalRenderer } from '.'
import { NodeRenderer } from './node'
import { Node, Edge } from '../..'


export const colorToNumber = (colorString: string): number => {
  const c = color(colorString)
  if (c === null) {
    return 0x000000
  }

  return parseInt(c.hex().slice(1), 16)
}


export const parentInFront = <N extends Node, E extends Edge>(renderer: InternalRenderer<N, E>, parent: NodeRenderer<N, E> | undefined) => {
  while (parent) {
    if (renderer.hoveredNode === parent) {
      return true
    }
    parent = parent.parent
  }

  return false
}


export const movePoint = (x: number, y: number, angle: number, distance: number): [number, number] => [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]


export const midPoint = (x0: number, y0: number, x1: number, y1: number): [number, number] => [(x0 + x1) / 2, (y0 + y1) / 2]


export const length = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0)


export const angle = (x0: number, y0: number, x1: number, y1: number) => {
  const angle = Math.atan2(y0 - y1, x0 - x1)
  return angle < 0 ? angle + TWO_PI : angle
}


/**
 * Warning, TouchEvent does not exist in some browsers (e.g. Safari Version 14.0.2 (15610.3.7.1.10, 15610))
 * so don't reference it directly
 */
export const clientPositionFromEvent = (event: MouseEvent | PointerEvent | TouchEvent) => (
  event instanceof MouseEvent || event instanceof PointerEvent ?
    { x: event.clientX, y: event.clientY } :
    event.type === 'touchend' ?
      { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY } :
      { x: event.touches[0].clientX, y: event.touches[0].clientY }
)


export const pointerKeysFromEvent = (event: MouseEvent | PointerEvent | TouchEvent) => (
  event instanceof MouseEvent || event instanceof PointerEvent ?
    { altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey } :
    {}
)


export const HALF_PI = Math.PI / 2


export const TWO_PI = Math.PI * 2


export const THREE_HALF_PI = HALF_PI * 3


export const RADIANS_PER_DEGREE = Math.PI / 180
