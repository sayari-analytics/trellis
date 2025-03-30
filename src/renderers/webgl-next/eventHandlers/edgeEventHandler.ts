import { FederatedPointerEvent } from 'pixi.js'
import type { EventHandler } from '.'
import type { Renderer } from '..'
import type { EdgeComponent } from '../components/edgeComponent'
import type { EventsComponent } from '../components/eventsComponent'
import { distanceSquared } from '../../..'

const MIN_EDGE_HITBOX_WIDTH = 4

export class EdgeEventHandler implements EventHandler {
  private events: EventsComponent
  private minX = Infinity
  private minY = Infinity
  private maxX = -Infinity
  private maxY = -Infinity
  private x0 = Infinity
  private y0 = Infinity
  private x1 = -Infinity
  private y1 = -Infinity
  private lengthSquared = 0
  private halfWidthSquared = 0
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false

  constructor(
    private renderer: Renderer,
    private edgeComponent: EdgeComponent
  ) {
    this.events = this.renderer.components.events
  }

  update(x0: number, y0: number, x1: number, y1: number, width: number) {
    // compute bounding box with small buffer to account for vertical/horizontal lines
    if (x0 <= x1) {
      this.minX = x0 - MIN_EDGE_HITBOX_WIDTH
      this.maxX = x1 + MIN_EDGE_HITBOX_WIDTH
    } else {
      this.minX = x1 - MIN_EDGE_HITBOX_WIDTH
      this.maxX = x0 + MIN_EDGE_HITBOX_WIDTH
    }

    if (y0 <= y1) {
      this.minY = y0 - MIN_EDGE_HITBOX_WIDTH
      this.maxY = y1 + MIN_EDGE_HITBOX_WIDTH
    } else {
      this.minY = y1 - MIN_EDGE_HITBOX_WIDTH
      this.maxY = y0 + MIN_EDGE_HITBOX_WIDTH
    }

    this.x0 = x0
    this.y0 = y0
    this.x1 = x1
    this.y1 = y1
    this.lengthSquared = distanceSquared(x0, y0, x1, y1)
    this.halfWidthSquared = Math.max(width / 2, MIN_EDGE_HITBOX_WIDTH) ** 2
  }

  contains(x: number, y: number) {
    if (x > this.maxX || x < this.minX || y > this.maxY || y < this.minY || this.lengthSquared === 0) {
      return false
    }

    // Project the point onto the line segment, clamped to range [0, 1]
    const project = Math.max(
      0,
      Math.min(1, ((x - this.x0) * (this.x1 - this.x0) + (y - this.y0) * (this.y1 - this.y0)) / this.lengthSquared)
    )

    // Calculate the closest point on the line segment
    const closestX = this.x0 + project * (this.x1 - this.x0)
    const closestY = this.y0 + project * (this.y1 - this.y0)

    // Check if the distance from the closest point to the point is within the line width
    return distanceSquared(x, y, closestX, closestY) <= this.halfWidthSquared
  }

  pointerEnter(event: FederatedPointerEvent) {
    if (this.renderer.interactions.draggedNode || this.renderer.interactions.drag.dragging || this.renderer.interactions.zoom.zooming) {
      return
    }

    if (this.events.onEdgePointerDown || this.events.onEdgeClick || this.events.onEdgeDoubleClick || this.events.onEdgePointerUp) {
      this.renderer.domElement.style.cursor = 'pointer'
    }

    const local = this.renderer.containers.root.toLocal(event.global)
    this.events.onEdgePointerEnter?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edgeComponent.edge!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  pointerDown(event: FederatedPointerEvent) {
    const local = this.renderer.containers.root.toLocal(event.global)
    this.renderer.interactions.zoom.pause()
    this.renderer.interactions.drag.pause()
    this.renderer.interactions.decelerate.pause()

    if (this.events.onEdgeDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.doubleClick = true
      }
    }

    if (this.events.onEdgePointerDown) {
      event.stopPropagation()
      this.events.onEdgePointerDown({
        type: 'edgePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.edgeComponent.edge!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }
  }

  pointerMove(_: FederatedPointerEvent) {}

  pointerUp(event: FederatedPointerEvent) {
    const local = this.renderer.containers.root.toLocal(event.global)
    this.renderer.interactions.zoom.resume()
    this.renderer.interactions.drag.resume()
    this.renderer.interactions.decelerate.resume()

    if (this.events.onEdgePointerUp) {
      event.stopPropagation()
      this.events.onEdgePointerUp({
        type: 'edgePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.edgeComponent.edge!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    if (this.events.onEdgeClick) {
      event.stopPropagation()
      this.events.onEdgeClick({
        type: 'edgePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.edgeComponent.edge!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    if (this.doubleClick) {
      clearTimeout(this.doubleClickTimeout)
      this.doubleClick = false
      this.doubleClickTimeout = undefined
      if (this.events.onEdgeDoubleClick) {
        event.stopPropagation()
        this.events.onEdgeDoubleClick({
          type: 'edgePointer',
          x: local.x,
          y: local.y,
          clientX: event.clientX,
          clientY: event.clientY,
          target: this.edgeComponent.edge!,
          targetIdx: 0, // TODO
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        })
      }
    }
  }

  pointerLeave(event: FederatedPointerEvent) {
    if (this.renderer.interactions.draggedNode || this.renderer.interactions.drag.dragging || this.renderer.interactions.zoom.zooming) {
      return
    }

    if (this.events.onEdgePointerDown || this.events.onEdgeClick || this.events.onEdgeDoubleClick || this.events.onEdgePointerUp) {
      this.renderer.domElement.style.cursor = 'auto'
    }

    const local = this.renderer.containers.root.toLocal(event.global)
    this.events.onEdgePointerLeave?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edgeComponent.edge!,
      targetIdx: 0, // TODO
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
