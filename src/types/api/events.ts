import { Node, Edge, Annotation, Viewport } from './objects'

export type RectPoint = 'nw' | 'ne' | 'se' | 'sw'

interface EventBase<T extends string> {
  type: T
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

interface MouseEvent<T extends string> extends EventBase<T> {
  x: number
  y: number
  clientX: number
  clientY: number
}

interface DragEvent<T extends string> extends MouseEvent<T> {
  dx: number
  dy: number
}

export interface NodePointerEvent extends MouseEvent<'nodePointer'> {
  target: Node
  targetIndex: number
}

export interface NodeDragEvent extends DragEvent<'nodeDrag'> {
  target: Node
  targetIndex: number
}

export interface EdgePointerEvent extends MouseEvent<'edgePointer'> {
  target: Edge
  targetIndex: number
}

export interface AnnotationPointerEvent extends MouseEvent<'annotationPointer'> {
  target: Annotation
  targetIndex: number
  relatedPoint: RectPoint | null
}

export interface AnnotationDragEvent extends DragEvent<'annotationDrag'> {
  target: Annotation
  targetIndex: number
}

export interface AnnotationResizeEvent extends MouseEvent<'annotationResize'> {
  target: Annotation
  targetIndex: number
  relatedPoint: RectPoint
}

export interface ViewportPointerEvent extends MouseEvent<'viewportPointer'> {
  target: Viewport
}

export interface ViewportDragEvent extends DragEvent<'viewportDrag'> {
  target: Viewport
}

export interface ViewportDragDecelerateEvent extends EventBase<'viewportDragDecelerate'> {
  dx: number
  dy: number
}

export interface ViewportWheelEvent extends DragEvent<'viewportWheel'> {
  dz: number
}

export interface EventHandlers {
  onViewportPointerEnter?: (event: ViewportPointerEvent) => void
  onViewportPointerDown?: (event: ViewportPointerEvent) => void
  onViewportPointerMove?: (event: ViewportPointerEvent) => void
  onViewportDragStart?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
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
