import { NodeStyle, EdgeStyle } from './renderers/webgl'


export type Node = {
  id: string
  radius: number
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: NodeStyle
  subgraph?: {
    nodes: Node[]
    edges: Edge[]
    options?: {}
  } | undefined
}


export type Edge = {
  id: string
  source: string
  target: string
  label?: string
  style?: EdgeStyle
}


export type CircleAnnotation = {
  type: 'circle'
  id: string
  x: number
  y: number
  radius: number
  style: {
    color: string
    stroke: {
      color: string
      width: number
    }
  }
}


export type Annotation = CircleAnnotation


export type Bounds = { left: number, top: number, right: number, bottom: number }


export type Dimensions = { width: number, height: number }


export type Viewport = { x: number, y: number, zoom: number }


export const getSelectionBounds = (nodes: Node[], padding: number = 0): Bounds => {
  let left = 0
  let top = 0
  let right = 0
  let bottom = 0

  for (const node of nodes) {
    const nodeLeft = (node.x ?? 0) - node.radius
    const nodeTop = (node.y ?? 0) - node.radius
    const nodeRight = (node.x ?? 0) + node.radius
    const nodeBottom = (node.y ?? 0) + node.radius
    if (nodeLeft < left) left = nodeLeft
    if (nodeTop < top) top = nodeTop
    if (nodeRight > right) right = nodeRight
    if (nodeBottom > bottom) bottom = nodeBottom
  }

  return { left: left - padding, top: top - padding, right: right + padding, bottom: bottom + padding }
}


export const mergeBounds = (a: Bounds, b: Bounds, padding: number = 0): Bounds => {
  return {
    left: Math.min(a.left, b.left) - padding,
    top: Math.min(a.top, b.top) - padding,
    right: Math.max(a.right, b.right) + padding,
    bottom: Math.max(a.bottom, b.bottom) + padding,
  }
}


export const viewportToBounds = ({ x, y, zoom }: Viewport, { width, height }: Dimensions): Bounds => {
  const xOffset = width / 2 / zoom
  const yOffset = height / 2 / zoom
  return {
    left: -(x + xOffset),
    top: -(y + yOffset),
    right: -(x - xOffset),
    bottom: -(y - yOffset),
  }
}


export const boundsToViewport = ({ left, top, right, bottom }: Bounds, { width, height }: Dimensions): Viewport => {
  const targetWidth = right - left
  const targetHeight = bottom - top
  const x = (targetWidth / 2) - right
  const y = (targetHeight / 2) - bottom

  if (targetWidth / targetHeight > width / height) {
    // fit to width
    return { x, y, zoom: width / targetWidth }
  } else {
    // fit to height
    return { x, y, zoom: height / targetHeight }
  }
}


export const boundsToDimenions = ({ left, top, right, bottom }: Bounds, zoom: number): Dimensions => {
  return {
    width: (right - left) / zoom,
    height: (bottom - top) / zoom,
  }
}


export const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value))
