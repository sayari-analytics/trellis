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

export const angle = (x0: number, y0: number, x1: number, y1: number) => {
  const angle = Math.atan2(y0 - y1, x0 - x1)
  return angle < 0 ? angle + TWO_PI : angle
}

export const movePoint = (
  x: number, y: number, angle: number, distance: number
) => [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance] as const

export const midPoint = (
  x0: number, y0: number, x1: number, y1: number
) => [(x0 + x1) / 2, (y0 + y1) / 2] as const

export const length = (
  x0: number, y0: number, x1: number, y1: number
) => Math.hypot(x1 - x0, y1 - y0)

export const positionNodeLabel = (
  x: number, y: number, label: string, radius: number, position: Graph.LabelPosition = 'bottom'
): [x: number, y: number] => {
  if (isASCII(label)) {
    // BitmapText shifts text down 2px
    switch (position) {
    case 'bottom':
      return [x, y + radius]
    case 'left':
      return [x - radius - 2, y - 2]
    case 'top':
      return [x, y - radius - 4]
    case 'right':
      return [x + radius + 2, y - 2]
    }
  } else {
    switch (position) {
    case 'bottom':
      return [x, y + radius]
    case 'left':
      return [x - radius - 2, y + 1]
    case 'top':
      return [x, y - radius + 2]
    case 'right':
      return [x + radius + 2, y + 1]
    }
  }
}

export const isASCII = (str: string) => {
  for (const char of str) {
    if (char.codePointAt(0)! > 126) {
      return false
    }
  }

  return true
}
