import { PositionedNode, PositionedEdge } from '../index'


export type NodeStyle = {
  width: number
  strokeWidth: number
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity: number
  icon?: string
}

export type EdgeStyle = {
  width: number
  stroke: string
  strokeOpacity: number
}

export type RendererOptions = {
  id: string
  strength?: number
  nodeStyle?: Partial<NodeStyle>
  edgeStyle?: Partial<EdgeStyle>
  onNodeMouseEnter?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseDown?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeDrag?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseUp?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseLeave?: (node: PositionedNode, details: { x: number, y: number }) => void
  onEdgeMouseEnter?: (edge: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseDown?: (edge: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeDrag?: (edge: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseUp?: (edge: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseLeave?: (edge: PositionedEdge, details: { x: number, y: number }) => void
  onContainerMouseEnter?: (details: { x: number, y: number }) => void
  onContainerMouseDown?: (details: { x: number, y: number }) => void
  onContainerDrag?: (details: { x: number, y: number }) => void
  onContainerMouseUp?: (details: { x: number, y: number }) => void
  onContainerMouseLeave?: (details: { x: number, y: number }) => void
  stats?: Stats
}

export const DEFAULT_NODE_STYLES: NodeStyle = {
  width: 62,
  strokeWidth: 2,
  fill: '#ff4b4b',
  stroke: '#bb0000',
  fillOpacity: 1,
  strokeOpacity: 1,
}

export const DEFAULT_EDGE_STYLES: EdgeStyle = {
  width: 1,
  stroke: '#ccc',
  strokeOpacity: 1,
}

export const DEFAULT_RENDERER_OPTIONS: Partial<RendererOptions> = {
  nodeStyle: {},
  edgeStyle: {},
}
