import { NodeStyle, EdgeStyle } from './renderers/webgl'


export type Node<E extends Edge = Edge> = {
  id: string
  radius: number
  x?: number | undefined // TODO - add prop for fixed position
  y?: number | undefined
  label?: string | undefined
  style?: NodeStyle
  subgraph?: {
    nodes: Node<E>[],
    edges: E[],
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


export const getBounds = (nodes: Node[], padding: number = 0): [left: number, top: number, right: number, bottom: number] => {
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

  return [left - padding, top - padding, right + padding, bottom + padding]
}


export const zoomToBounds = ([left, top, right, bottom]: [left: number, top: number, right: number, bottom: number], width: number, height: number) => {
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
