import { Container, FederatedPointerEvent, Polygon } from 'pixi.js'
import type { EdgeComponent } from '../components/edgeComponent'
import type { EventsComponent } from '../components/eventsComponent'
import type { Renderer } from '..'
import { HALF_PI, movePoint } from '../utils'

const MIN_LINE_HOVER_RADIUS = 2

export class EdgeHitArea {
  mounted = false

  private hitArea?: Container
  private events: EventsComponent
  private container: Container
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false

  constructor(
    private renderer: Renderer,
    private edgeComponent: EdgeComponent
  ) {
    this.events = this.renderer.components.events
    this.container = this.renderer.containers.interaction
  }

  update(x0: number, y0: number, x1: number, y1: number, width: number, theta: number) {
    if (this.hitArea === undefined) {
      if (this.edgePointerEventsAreDefined()) {
        this.hitArea = new Container()
        // this.hitArea.cullable = true
        const perpendicular = theta + HALF_PI
        const hoverRadius = Math.max(width, MIN_LINE_HOVER_RADIUS)
        const hitAreaVertices: number[] = new Array(8)
        let point = movePoint(x0, y0, perpendicular, hoverRadius)
        hitAreaVertices[0] = point[0]
        hitAreaVertices[1] = point[1]
        point = movePoint(x0, y0, perpendicular, -hoverRadius)
        hitAreaVertices[2] = point[0]
        hitAreaVertices[3] = point[1]
        point = movePoint(x1, y1, perpendicular, -hoverRadius)
        hitAreaVertices[4] = point[0]
        hitAreaVertices[5] = point[1]
        point = movePoint(x1, y1, perpendicular, hoverRadius)
        hitAreaVertices[6] = point[0]
        hitAreaVertices[7] = point[1]
        this.hitArea!.hitArea = new Polygon(hitAreaVertices)
        this.hitArea.eventMode = 'static'
        this.hitArea.addEventListener('pointerenter', this.pointerEnter.bind(this))
        this.hitArea.addEventListener('pointerdown', this.pointerDown.bind(this))
        this.hitArea.addEventListener('pointerup', this.pointerUp.bind(this))
        this.hitArea.addEventListener('pointercancel', this.pointerUp.bind(this))
        this.hitArea.addEventListener('pointerleave', this.pointerLeave.bind(this))
        this.mount()
      }
    } else {
      const perpendicular = theta + HALF_PI
      const hoverRadius = Math.max(width, MIN_LINE_HOVER_RADIUS)
      const hitAreaVertices: number[] = new Array(8)
      let point = movePoint(x0, y0, perpendicular, hoverRadius)
      hitAreaVertices[0] = point[0]
      hitAreaVertices[1] = point[1]
      point = movePoint(x0, y0, perpendicular, -hoverRadius)
      hitAreaVertices[2] = point[0]
      hitAreaVertices[3] = point[1]
      point = movePoint(x1, y1, perpendicular, -hoverRadius)
      hitAreaVertices[4] = point[0]
      hitAreaVertices[5] = point[1]
      point = movePoint(x1, y1, perpendicular, hoverRadius)
      hitAreaVertices[6] = point[0]
      hitAreaVertices[7] = point[1]
      this.hitArea!.hitArea = new Polygon(hitAreaVertices)
    }
  }

  mount() {
    if (!this.mounted && this.hitArea !== undefined) {
      this.container.addChild(this.hitArea)
      this.mounted = true
    }
  }

  unmount() {
    if (this.mounted && this.hitArea !== undefined) {
      this.container.removeChild(this.hitArea)
      this.mounted = false
    }
  }

  exit() {
    if (this.hitArea) {
      clearTimeout(this.doubleClickTimeout)
      this.unmount()
      this.hitArea.destroy()
      this.hitArea = undefined
    }
  }

  private edgePointerEventsAreDefined() {
    return (
      this.events.onEdgePointerEnter ||
      this.events.onEdgePointerDown ||
      this.events.onEdgeClick ||
      this.events.onEdgeDoubleClick ||
      this.events.onEdgePointerUp ||
      this.events.onEdgePointerLeave
    )
  }

  private pointerEnter(event: FederatedPointerEvent) {
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

  private pointerDown(event: FederatedPointerEvent) {
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

  private pointerUp(event: FederatedPointerEvent) {
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

  private pointerLeave(event: FederatedPointerEvent) {
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
