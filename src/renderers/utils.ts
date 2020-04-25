import { NodeStyle, EdgeStyle } from './options'
import { PositionedNode, Edge as PositionedEdge } from '../layout/force'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'


export type NodeStyleSelector = <T extends keyof NodeStyle>(node: PositionedNode, attribute: T) => NodeStyle[T]
export const nodeStyleSelector = (nodeStyles: NodeStyle): NodeStyleSelector => <T extends keyof NodeStyle>(node: PositionedNode, attribute: T) => {
  if (node.style === undefined || node.style![attribute] === undefined) {
    return nodeStyles[attribute]
  }

  return node.style[attribute] as NodeStyle[T]
}


export type EdgeStyleSelector = <T extends keyof EdgeStyle>(edge: PositionedEdge, attribute: T) => EdgeStyle[T]
export const edgeStyleSelector = (edgeStyles: EdgeStyle): EdgeStyleSelector => <T extends keyof EdgeStyle>(edge: PositionedEdge, attribute: T) => {
  if (edge.style === undefined || edge.style![attribute] === undefined) {
    return edgeStyles[attribute]
  }

  return edge.style[attribute] as EdgeStyle[T]
}


export const interpolatePosition = (start: number, end: number, percent: number) => {
  const interpolate = interpolateNumber(start, end)
  return interpolateBasis([interpolate(0), interpolate(0.1), interpolate(0.8), interpolate(0.95), interpolate(1)])(percent)
}
