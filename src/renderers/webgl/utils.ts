/* eslint-disable no-console */
import * as Graph from '../..'

export const HALF_PI = Math.PI / 2

export const TWO_PI = Math.PI * 2

export const THREE_HALF_PI = HALF_PI * 3

export const RADIANS_PER_DEGREE = Math.PI / 180

export const logUnknownEdgeError = (source: Graph.Node | undefined, target: Graph.Node | undefined) => {
  if (source === undefined && target === undefined) {
    console.error(`Error: Cannot render edge between unknown nodes ${source} and ${target}`)
  } else if (source === undefined) {
    console.error(`Error: Cannot render edge from unknown node ${source}`)
  } else if (target === undefined) {
    console.error(`Error: Cannot render edge to unknown node ${target}`)
  }
}

export const movePoint = (x: number, y: number, angle: number, distance: number) =>
  [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance] as const

export const midPoint = (x0: number, y0: number, x1: number, y1: number) => [(x0 + x1) / 2, (y0 + y1) / 2] as const

export const length = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0)
