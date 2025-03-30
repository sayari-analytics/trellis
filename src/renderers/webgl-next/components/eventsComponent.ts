import { EventSystem, FederatedPointerEvent } from 'pixi.js'
import type { Renderer } from '..'
import type { EventHandler } from '../eventHandlers'
import { NodeEventHandler } from '../eventHandlers/nodeEventHandler'
import type { Node, Edge, Annotation, Viewport } from '../../..'
import { throttleAnimationFrame } from '../../../utils/helpers'

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

  interactions: Renderer['interactions']
  eventSystem: EventSystem
  nodeEventHandlersAreDefined = false
  edgeEventHandlersAreDefined = false

  private events?: EventOptions
  private doubleClick = false
  private doubleClickTimeout?: NodeJS.Timeout
  private pointerDownObject?: this | EventHandler
  private hoveredObject?: EventHandler

  constructor(
    private renderer: Renderer,
    canvas: HTMLCanvasElement
  ) {
    this.interactions = renderer.interactions
    this.eventSystem = new EventSystem(this.renderer.app.renderer)
    this.eventSystem.domElement = canvas
    this.renderer.containers.root.eventMode = 'static'
    this.renderer.containers.edges.eventMode = 'none'
    this.renderer.containers.nodes.eventMode = 'none'
    this.renderer.containers.labels.eventMode = 'none'
    this.renderer.containers.root.addEventListener('pointerenter', this.pointerEnter)
    this.renderer.containers.root.addEventListener('pointerdown', this.pointerDown)
    this.renderer.containers.root.addEventListener('pointermove', this.pointerMove)
    // TODO - handle node drag and release outside of viewport
    // this.renderer.containers.root.addEventListener('globalpointermove', ...)
    // this.renderer.containers.root.addEventListener('pointerupoutside', ...)
    this.renderer.containers.root.addEventListener('pointerup', this.pointerUp)
    this.renderer.containers.root.addEventListener('pointercancel', this.pointerUp)
    this.renderer.containers.root.addEventListener('pointerupoutside', this.pointerUp)
    this.renderer.containers.root.addEventListener('pointerleave', this.pointerLeave)
    canvas.addEventListener!('wheel', this.interactions.zoom.wheel, { passive: false })
  }

  render(nextEvents?: EventOptions) {
    const viewport = this.renderer.components.viewport
    this.renderer.containers.root.hitArea = viewport.bbox

    if (nextEvents !== undefined && this.events !== nextEvents) {
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

      this.nodeEventHandlersAreDefined =
        this.onNodePointerEnter !== undefined ||
        this.onNodePointerDown !== undefined ||
        this.onNodeDragStart !== undefined ||
        this.onNodeDrag !== undefined ||
        this.onNodeDragEnd !== undefined ||
        this.onNodeClick !== undefined ||
        this.onNodeDoubleClick !== undefined ||
        this.onNodePointerUp !== undefined ||
        this.onNodePointerLeave !== undefined

      this.edgeEventHandlersAreDefined =
        this.onEdgePointerEnter !== undefined ||
        this.onEdgePointerDown !== undefined ||
        this.onEdgeClick !== undefined ||
        this.onEdgeDoubleClick !== undefined ||
        this.onEdgePointerUp !== undefined ||
        this.onEdgePointerLeave !== undefined

      this.events = nextEvents
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)
  }

  private pointerEnter = (event: FederatedPointerEvent) => {
    const viewport = this.renderer.components.viewport
    const { x, y } = this.renderer.containers.root.toLocal(event.global)

    this.onViewportPointerEnter?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerDown = (event: FederatedPointerEvent) => {
    const viewport = this.renderer.components.viewport
    const { x, y } = this.renderer.containers.root.toLocal(event.global)

    // dispatch pointerDown event on node/edge eventHandler object
    if (!this.interactions.drag.dragging) {
      let eventHandler: EventHandler | undefined = undefined

      if (this.nodeEventHandlersAreDefined) {
        for (const nodeComponent of this.renderer.components.nodes.nodeComponents.values()) {
          if (nodeComponent.eventHandler.contains(x, y)) {
            eventHandler = nodeComponent.eventHandler
            break
          }
        }
      }

      if (eventHandler === undefined && this.edgeEventHandlersAreDefined) {
        for (const edgeComponent of this.renderer.components.edges.edgeComponents.values()) {
          if (edgeComponent.eventHandler.contains(x, y)) {
            eventHandler = edgeComponent.eventHandler
            break
          }
        }
      }

      if (eventHandler) {
        this.pointerDownObject = eventHandler
        eventHandler.pointerDown(event)
        return
      }
    }

    this.pointerDownObject = this

    if (this.onViewportDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.doubleClick = true
      }
    }

    this.interactions.drag.down(event)
    this.interactions.decelerate.down()

    this.onViewportPointerDown?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerMove = throttleAnimationFrame((event: FederatedPointerEvent) => {
    const viewport = this.renderer.components.viewport
    const { x, y } = this.renderer.containers.root.toLocal(event.global)

    // dispatch pointerEnter/pointerMove/pointerLave event on node/edge eventHandler object
    if (!this.interactions.drag.dragging) {
      if (this.pointerDownObject instanceof NodeEventHandler) {
        // drag object
        this.pointerDownObject.pointerMove(event)
        return
      }

      let eventHandler: EventHandler | undefined = undefined

      if (this.nodeEventHandlersAreDefined) {
        for (const nodeComponent of this.renderer.components.nodes.nodeComponents.values()) {
          if (nodeComponent.eventHandler.contains(x, y)) {
            eventHandler = nodeComponent.eventHandler
            break
          }
        }
      }

      if (eventHandler === undefined && this.edgeEventHandlersAreDefined) {
        for (const edgeComponent of this.renderer.components.edges.edgeComponents.values()) {
          if (edgeComponent.eventHandler.contains(x, y)) {
            eventHandler = edgeComponent.eventHandler
            break
          }
        }
      }

      if (eventHandler) {
        if (this.hoveredObject !== undefined) {
          if (this.hoveredObject !== eventHandler) {
            // leave entered object
            this.hoveredObject.pointerLeave(event)
            this.hoveredObject = undefined
          }
        } else {
          // enter object
          this.hoveredObject = eventHandler
          this.hoveredObject.pointerEnter(event)
        }

        return
      } else if (this.hoveredObject !== undefined) {
        // leave entered object
        this.hoveredObject.pointerLeave(event)
        this.hoveredObject = undefined
        return
      }
    }

    this.onViewportPointerMove?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom
      },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })

    this.interactions.drag.move(event)
    this.interactions.decelerate.move()
  })

  private pointerUp = (event: FederatedPointerEvent) => {
    // dispatch pointerUp/pointerLeave event on node/edge eventHandler object
    if (this.pointerDownObject instanceof NodeEventHandler) {
      this.pointerDownObject.pointerUp(event)
      this.pointerDownObject = undefined
      return
    } else if (this.pointerDownObject === undefined) {
      return
    }

    const isDragging = this.interactions.drag.dragging
    this.interactions.drag.up(event)
    this.interactions.decelerate.up()

    const viewport = this.renderer.components.viewport
    const { x, y } = this.renderer.containers.root.toLocal(event.global)
    this.onViewportPointerUp?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom
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
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom
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
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom
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
    const viewport = this.renderer.components.viewport
    const { x, y } = this.renderer.containers.root.toLocal(event.global)
    this.onViewportPointerLeave?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom
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
}
