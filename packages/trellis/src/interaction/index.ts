import type { Viewport, GraphState, Id } from '@sayari/trellis'

type Keys = { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }
type MousePosition = { x: number; y: number; clientX: number; clientY: number }
export type Position = 'nw' | 'ne' | 'se' | 'sw'
// node/edge events identify the element by its entity id (resolved from the picked slot via state.nodeIds)
export type NodePointerEvent = { type: 'nodePointer'; id: Id } & MousePosition & Keys
export type NodeDragEvent = { type: 'nodeDrag'; dx: number; dy: number; id: Id } & MousePosition & Keys
export type EdgePointerEvent = { type: 'edgePointer'; id: Id } & MousePosition & Keys
export type ViewportPointerEvent = { type: 'viewportPointer'; target: Viewport } & MousePosition & Keys
export type ViewportDragEvent = { type: 'viewportDrag'; dx: number; dy: number } & MousePosition & Keys
export type ViewportDragDecelerateEvent = { type: 'viewportDragDecelarate'; dx: number; dy: number } & Keys
type ViewportWheelEvent = { type: 'viewportWheel'; dx: number; dy: number; dz: number } & MousePosition & Keys

export type Options = {
  canvas: HTMLCanvasElement
  state: GraphState // viewport (live) + minZoom/maxZoom come from here
  onViewportPointerEnter?: (event: ViewportPointerEvent) => void
  onViewportPointerDown?: (event: ViewportPointerEvent) => void
  onViewportPointerMove?: (event: ViewportPointerEvent) => void
  onViewportDragStart?: (event: ViewportDragEvent) => void
  onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportDragEnd?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportPointerUp?: (event: ViewportPointerEvent) => void
  onViewportClick?: (event: ViewportPointerEvent) => void
  onViewportDoubleClick?: (event: ViewportPointerEvent) => void
  onViewportPointerLeave?: (event: ViewportPointerEvent) => void
  onViewportWheel?: (event: ViewportWheelEvent) => void
  onNodePointerEnter?: (event: NodePointerEvent) => void
  onNodePointerDown?: (event: NodePointerEvent) => void
  onNodeDragStart?: (event: NodeDragEvent) => void
  onNodeDrag?: (event: NodeDragEvent) => void
  onNodeDragEnd?: (event: NodeDragEvent) => void
  onNodePointerUp?: (event: NodePointerEvent) => void
  onNodeClick?: (event: NodePointerEvent) => void
  onNodeDoubleClick?: (event: NodePointerEvent) => void
  onNodePointerLeave?: (event: NodePointerEvent) => void
  onEdgePointerEnter?: (event: EdgePointerEvent) => void
  onEdgePointerDown?: (event: EdgePointerEvent) => void
  onEdgePointerUp?: (event: EdgePointerEvent) => void
  onEdgePointerLeave?: (event: EdgePointerEvent) => void
  onEdgeClick?: (event: EdgePointerEvent) => void
  onEdgeDoubleClick?: (event: EdgePointerEvent) => void
}
