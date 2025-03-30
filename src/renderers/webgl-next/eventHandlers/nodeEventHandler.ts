import { FederatedPointerEvent } from 'pixi.js'
import type { EventHandler } from '.'
import type { Renderer } from '..'
import type { NodeComponent } from '../components/nodeComponent'
import type { EventsComponent } from '../components/eventsComponent'

export class NodeEventHandler implements EventHandler {
  private events: EventsComponent
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false
  private nodeMoveXOffset = 0
  private nodeMoveYOffset = 0
  private isDragging = false
  private pointerIsDown = false
  private minX = Infinity
  private minY = Infinity
  private maxX = -Infinity
  private maxY = -Infinity
  private x = 0
  private y = 0
  private radiusSquared = 0

  constructor(
    private renderer: Renderer,
    private nodeComponent: NodeComponent
  ) {
    this.events = this.renderer.components.events
  }

  update(x: number, y: number, radius: number) {
    this.minX = x - radius
    this.minY = y - radius
    this.maxX = x + radius
    this.maxY = y + radius
    this.x = x
    this.y = y
    this.radiusSquared = Math.pow(radius, 2)
  }

  contains(x: number, y: number) {
    return (
      x >= this.minX &&
      x <= this.maxX &&
      y >= this.minY &&
      y <= this.maxY &&
      Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) <= this.radiusSquared
    )
  }

  pointerEnter(event: FederatedPointerEvent) {
    if (this.renderer.interactions.draggedNode || this.renderer.interactions.drag.dragging || this.renderer.interactions.zoom.zooming) {
      return
    }

    if (
      this.events.onNodePointerDown ||
      this.events.onNodeDrag ||
      this.events.onNodeClick ||
      this.events.onNodeDoubleClick ||
      this.events.onNodePointerUp
    ) {
      this.renderer.domElement.style.cursor = 'pointer'
    }

    if (this.events.onNodePointerEnter) {
      const local = this.renderer.containers.root.toLocal(event.global)
      this.events.onNodePointerEnter({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.nodeComponent.node!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }
  }

  pointerDown(event: FederatedPointerEvent) {
    this.pointerIsDown = true
    const local = this.renderer.containers.root.toLocal(event.global)

    if (this.events.onNodeDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.doubleClick = true
      }
    }

    if (this.events.onNodePointerDown) {
      event.stopPropagation()
      this.events.onNodePointerDown({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.nodeComponent.node!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    if (this.events.onNodeDrag) {
      event.stopPropagation()
      this.renderer.domElement.style.cursor = 'move'
      this.nodeMoveXOffset = local.x - (this.nodeComponent.node!.x ?? 0)
      this.nodeMoveYOffset = local.y - (this.nodeComponent.node!.y ?? 0)
      this.renderer.interactions.draggedNode = this.nodeComponent
      this.renderer.interactions.zoom.pause()
      this.renderer.interactions.drag.pause()
      this.renderer.interactions.decelerate.pause()
    }
  }

  pointerMove(event: FederatedPointerEvent) {
    if (!this.pointerIsDown) return

    event.stopPropagation()

    const local = this.renderer.containers.root.toLocal(event.global)

    if (!this.isDragging) {
      this.events.onNodeDragStart?.({
        type: 'nodeDrag',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        dx: 0,
        dy: 0,
        target: this.nodeComponent.node!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })

      this.isDragging = true
    }

    this.events.onNodeDrag?.({
      type: 'nodeDrag',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: local.x - (this.nodeComponent.node!.x ?? 0) - this.nodeMoveXOffset,
      dy: local.y - (this.nodeComponent.node!.y ?? 0) - this.nodeMoveYOffset,
      target: this.nodeComponent.node!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  pointerUp(event: FederatedPointerEvent) {
    this.pointerIsDown = false
    const local = this.renderer.containers.root.toLocal(event.global)

    if (this.events.onNodeDrag) {
      this.renderer.domElement.style.cursor = 'auto'
      this.renderer.interactions.zoom.resume()
      this.renderer.interactions.drag.resume()
      this.renderer.interactions.decelerate.resume()
      this.nodeMoveXOffset = 0
      this.nodeMoveYOffset = 0

      if (this.renderer.interactions.draggedNode === this.nodeComponent) {
        if (this.events.onNodeDragEnd) {
          event.stopPropagation()
          this.events.onNodeDragEnd({
            type: 'nodeDrag',
            x: local.x,
            y: local.y,
            clientX: event.clientX,
            clientY: event.clientY,
            dx: 0,
            dy: 0,
            target: this.nodeComponent.node!,
            targetIdx: 0, // TODO
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey
          })
        }
      }
    }

    this.renderer.interactions.drag.up(event)
    this.renderer.interactions.decelerate.up()

    if (this.events.onNodePointerUp) {
      event.stopPropagation()
      this.events.onNodePointerUp({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.nodeComponent.node!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    if (!this.isDragging) {
      if (this.events.onNodeClick) {
        event.stopPropagation()
        this.events.onNodeClick({
          type: 'nodePointer',
          x: local.x,
          y: local.y,
          clientX: event.clientX,
          clientY: event.clientY,
          target: this.nodeComponent.node!,
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
        if (this.events.onNodeDoubleClick) {
          event.stopPropagation()
          this.events.onNodeDoubleClick({
            type: 'nodePointer',
            x: local.x,
            y: local.y,
            clientX: event.clientX,
            clientY: event.clientY,
            target: this.nodeComponent.node!,
            targetIdx: 0, // TODO
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey
          })
        }
      }
    }

    this.isDragging = false
    this.renderer.interactions.draggedNode = undefined
  }

  pointerLeave(event: FederatedPointerEvent) {
    if (
      !this.renderer.interactions.drag.dragging &&
      (this.events.onNodePointerDown ||
        this.events.onNodeDrag ||
        this.events.onNodeClick ||
        this.events.onNodeDoubleClick ||
        this.events.onNodePointerUp)
    ) {
      this.renderer.domElement.style.cursor = 'auto'
    }

    if (this.events.onNodePointerLeave) {
      const local = this.renderer.containers.root.toLocal(event.global)
      this.events.onNodePointerLeave({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.nodeComponent.node!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
