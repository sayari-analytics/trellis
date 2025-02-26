import { EventSystem, FederatedPointerEvent } from 'pixi.js'
import type { Node, Edge, Annotation, Viewport } from '../../..'
import type { Renderer } from '..'

export type Keys = { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }
export type MousePosition = { x: number; y: number; clientX: number; clientY: number }
export type Position = 'nw' | 'ne' | 'se' | 'sw'
export type NodePointerEvent = { type: 'nodePointer'; target: Node; targetIdx: number } & MousePosition & Keys
export type NodeDragEvent = { type: 'nodeDrag'; dx: number; dy: number; target: Node; targetIdx: number } & MousePosition & Keys
export type EdgePointerEvent = { type: 'edgePointer'; target: Edge; targetIdx: number } & MousePosition & Keys
export type AnnotationPointerEvent = {
  type: 'annotationPointer'
  position?: Position
  target: Annotation
  targetIdx: number
} & MousePosition &
  Keys
export type AnnotationDragEvent = {
  type: 'annotationDrag'
  dx: number
  dy: number
  target: Annotation
  targetIdx: number
} & MousePosition &
  Keys
export type AnnotationResizeEvent = {
  type: 'annotationResize'
  position: Position
  target: Annotation
  targetIdx: number
} & MousePosition &
  Keys
export type ViewportPointerEvent = { type: 'viewportPointer'; target: Viewport } & MousePosition & Keys
export type ViewportDragEvent = { type: 'viewportDrag'; dx: number; dy: number } & MousePosition & Keys
export type ViewportDragDecelerateEvent = { type: 'viewportDragDecelarate'; dx: number; dy: number } & Keys
export type ViewportWheelEvent = { type: 'viewportWheel'; dx: number; dy: number; dz: number } & MousePosition & Keys

export type EventOptions = {
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

export class EventsComponent {
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

  eventSystem!: EventSystem

  private doubleClick = false
  private doubleClickTimeout?: NodeJS.Timeout
  private pointerIsDown = false
  private minX?: number
  private minY?: number
  private maxX?: number
  private maxY?: number

  constructor(
    private renderer: Renderer,
    canvas: HTMLCanvasElement
  ) {
    this.eventSystem = new EventSystem(this.renderer.app.renderer)
    this.eventSystem.domElement = canvas
    this.renderer.containers.root.eventMode = 'static'
    this.renderer.containers.edges.eventMode = 'none'
    this.renderer.containers.nodes.eventMode = 'none'
    this.renderer.containers.labels.eventMode = 'none'
    this.renderer.containers.interaction.eventMode = 'passive'
    this.renderer.containers.root.addChild(this.renderer.containers.edges)
    this.renderer.containers.root.addChild(this.renderer.containers.nodes)
    this.renderer.containers.root.addChild(this.renderer.containers.labels)
    this.renderer.containers.root.addChild(this.renderer.containers.interaction)
    this.renderer.containers.root.addEventListener('pointerenter', this.pointerEnter)
    this.renderer.containers.root.addEventListener('pointerdown', this.pointerDown)
    this.renderer.containers.root.addEventListener('pointermove', this.pointerMove)
    this.renderer.containers.root.addEventListener('pointerup', this.pointerUp)
    this.renderer.containers.root.addEventListener('pointercancel', this.pointerUp)
    this.renderer.containers.root.addEventListener('pointerupoutside', this.pointerUp)
    this.renderer.containers.root.addEventListener('pointerleave', this.pointerLeave)
    canvas.addEventListener!('wheel', this.renderer.interactions.zoom.wheel, { passive: false })
  }

  render(nextEvents?: EventOptions) {
    this.renderer.containers.root.hitArea = this.renderer.components.viewport.bbox

    if (nextEvents !== undefined) {
      this.onViewportPointerEnter = nextEvents.onViewportPointerEnter
      this.onViewportPointerDown = nextEvents.onViewportPointerDown
      this.onViewportDragStart = nextEvents.onViewportDragStart
      this.onViewportDrag = nextEvents.onViewportDrag
      this.onViewportDragEnd = nextEvents.onViewportDragEnd
      this.onViewportPointerMove = nextEvents.onViewportPointerMove
      this.onViewportClick = nextEvents.onViewportClick
      this.onViewportDoubleClick = nextEvents.onViewportDoubleClick
      this.onViewportPointerUp = nextEvents.onViewportPointerUp
      this.onViewportPointerLeave = nextEvents.onViewportPointerLeave
      this.onViewportWheel = nextEvents.onViewportWheel
      this.onNodePointerEnter = nextEvents.onNodePointerEnter
      this.onNodePointerDown = nextEvents.onNodePointerDown
      this.onNodeDragStart = nextEvents.onNodeDragStart
      this.onNodeDrag = nextEvents.onNodeDrag
      this.onNodeDragEnd = nextEvents.onNodeDragEnd
      this.onNodePointerUp = nextEvents.onNodePointerUp
      this.onNodeClick = nextEvents.onNodeClick
      this.onNodeDoubleClick = nextEvents.onNodeDoubleClick
      this.onNodePointerLeave = nextEvents.onNodePointerLeave
      this.onEdgePointerEnter = nextEvents.onEdgePointerEnter
      this.onEdgePointerDown = nextEvents.onEdgePointerDown
      this.onEdgePointerUp = nextEvents.onEdgePointerUp
      this.onEdgePointerLeave = nextEvents.onEdgePointerLeave
      this.onEdgeClick = nextEvents.onEdgeClick
      this.onEdgeDoubleClick = nextEvents.onEdgeDoubleClick
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)
  }

  private pointerEnter = (event: FederatedPointerEvent) => {
    const { x, y } = this.renderer.containers.root.toLocal(event.global)
    this.onViewportPointerEnter?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: this.renderer.components.viewport.x,
        y: this.renderer.components.viewport.y,
        zoom: this.renderer.components.viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerDown = (event: FederatedPointerEvent) => {
    this.pointerIsDown = true

    if (this.onViewportDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.doubleClick = true
      }
    }

    this.renderer.interactions.drag.down(event)
    this.renderer.interactions.decelerate.down()

    const { x, y } = this.renderer.containers.root.toLocal(event.global)
    this.onViewportPointerDown?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: this.renderer.components.viewport.x,
        y: this.renderer.components.viewport.y,
        zoom: this.renderer.components.viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerMove = (event: FederatedPointerEvent) => {
    this.renderer.interactions.drag.move(event)
    this.renderer.interactions.decelerate.move()

    const { x, y } = this.renderer.containers.root.toLocal(event.global)

    this.onViewportPointerMove?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: this.renderer.components.viewport.x,
        y: this.renderer.components.viewport.y,
        zoom: this.renderer.components.viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerUp = (event: FederatedPointerEvent) => {
    if (this.renderer.interactions.draggedNode) {
      this.pointerReleaseNode(event)
      return
    }

    if (!this.pointerIsDown) {
      return
    }
    this.pointerIsDown = false

    const isDragging = this.renderer.interactions.drag.dragging
    this.renderer.interactions.drag.up(event)
    this.renderer.interactions.decelerate.up()

    const { x, y } = this.renderer.containers.root.toLocal(event.global)

    this.onViewportPointerUp?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: this.renderer.components.viewport.x,
        y: this.renderer.components.viewport.y,
        zoom: this.renderer.components.viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })

    if (!isDragging) {
      this.onViewportClick?.({
        type: 'viewportPointer',
        x,
        y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: {
          x: this.renderer.components.viewport.x,
          y: this.renderer.components.viewport.y,
          zoom: this.renderer.components.viewport.zoom
        },
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })

      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.onViewportDoubleClick?.({
          type: 'viewportPointer',
          x,
          y,
          clientX: event.clientX,
          clientY: event.clientY,
          target: {
            x: this.renderer.components.viewport.x,
            y: this.renderer.components.viewport.y,
            zoom: this.renderer.components.viewport.zoom
          },
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        })
      }
    }
  }

  private pointerLeave = (event: FederatedPointerEvent) => {
    const { x, y } = this.renderer.containers.root.toLocal(event.global)
    this.onViewportPointerLeave?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: this.renderer.components.viewport.x,
        y: this.renderer.components.viewport.y,
        zoom: this.renderer.components.viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }

  private pointerReleaseNode = (event: FederatedPointerEvent) => {
    if (this.renderer.interactions.draggedNode) {
      const draggedNode = this.renderer.interactions.draggedNode
      draggedNode.hitArea.pointerUp(event)
      draggedNode.hitArea.pointerLeave(event)
    }
  }
}
