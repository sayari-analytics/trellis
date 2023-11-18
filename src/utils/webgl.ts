import type { Node } from '@/types'
import { TWO_PI } from './constants'

export const logUnknownEdgeError = (source: Node | undefined, target: Node | undefined) => {
  if (source === undefined && target === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Error: Cannot render edge between unknown nodes ${source} and ${target}`)
  } else if (source === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Error: Cannot render edge from unknown node ${source}`)
  } else if (target === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Error: Cannot render edge to unknown node ${target}`)
  }
}

export const movePoint = (x: number, y: number, angle: number, distance: number) =>
  [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance] as const

export const midPoint = (x0: number, y0: number, x1: number, y1: number) => [(x0 + x1) / 2, (y0 + y1) / 2] as const

export const length = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0)

export const angle = (x0: number, y0: number, x1: number, y1: number) => {
  const angle = Math.atan2(y0 - y1, x0 - x1)
  return angle < 0 ? angle + TWO_PI : angle
}
