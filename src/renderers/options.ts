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
  container: HTMLCanvasElement
  width?: number
  height?: number
  onNodePointerEnter?: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodePointerDown?: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodeDrag?: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodePointerUp?: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodePointerLeave?: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodeDoubleClick?: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onEdgePointerEnter?: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerDown?: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerUp?: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerLeave?: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onContainerPointerEnter?: (event: PointerEvent) => void
  onContainerPointerDown?: (event: PointerEvent) => void
  onContainerPointerMove?: (event: PointerEvent) => void
  onContainerPointerUp?: (event: PointerEvent) => void
  onContainerPointerLeave?: (event: PointerEvent) => void
  debug?: { logUpdateTime?: boolean, logRenderTime?: boolean, stats?: Stats }
}

export type RendererLayoutOptions = {
  width?: number
  height?: number
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
