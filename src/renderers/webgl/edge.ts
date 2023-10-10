import { MIN_EDGES_ZOOM, MIN_INTERACTION_ZOOM, Renderer } from '.'
import { movePoint } from './utils'
import { NodeRenderer } from './node'
import * as Graph from '../..'
import { Arrow } from './objects/arrow'
import { LineSegment } from './objects/lineSegment'
import { FederatedPointerEvent } from 'pixi.js'
import { EdgeHitArea } from './interaction/edgeHitArea'

const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = 0xaaaaaa
const DEFAULT_ARROW = 'none'

export class EdgeRenderer {
  edge?: Graph.Edge

  renderer: Renderer
  lineSegment: LineSegment
  source!: NodeRenderer
  target!: NodeRenderer
  x0?: number
  y0?: number
  x1?: number
  y1?: number
  theta?: number
  width?: number
  stroke?: string | number
  strokeOpacity?: number
  sourceRadius?: number
  targetRadius?: number

  private hitArea: EdgeHitArea
  private arrow?: { forward: Arrow; reverse?: undefined } | { forward?: undefined; reverse: Arrow } | { forward: Arrow; reverse: Arrow }
  private lineMounted = false
  private forwardArrowMounted = false
  private reverseArrowMounted = false
  private doubleClickTimeout: number | undefined
  private doubleClick = false

  constructor(renderer: Renderer, edge: Graph.Edge, source: NodeRenderer, target: NodeRenderer) {
    this.renderer = renderer
    this.lineSegment = new LineSegment(this.renderer.edgesContainer)
    this.hitArea = new EdgeHitArea(this.renderer.interactionContainer, this)
    this.update(edge, source, target)
  }

  update(edge: Graph.Edge, source: NodeRenderer, target: NodeRenderer) {
    this.source = source
    this.target = target

    const arrow = edge.style?.arrow ?? DEFAULT_ARROW
    if (arrow !== (this.edge?.style?.arrow ?? DEFAULT_ARROW)) {
      this.arrow?.forward?.delete()
      this.arrow?.reverse?.delete()
      this.forwardArrowMounted = false
      this.reverseArrowMounted = false
      this.arrow = undefined

      switch (arrow) {
        case 'forward':
          this.arrow = { forward: new Arrow(this.renderer.edgesContainer, this.renderer.arrow) }
          break
        case 'reverse':
          this.arrow = { reverse: new Arrow(this.renderer.edgesContainer, this.renderer.arrow) }
          break
        case 'both':
          this.arrow = {
            forward: new Arrow(this.renderer.edgesContainer, this.renderer.arrow),
            reverse: new Arrow(this.renderer.edgesContainer, this.renderer.arrow)
          }
      }
    }

    this.edge = edge

    return this
  }

  render() {
    const x0 = this.source.x
    const y0 = this.source.y
    const x1 = this.target.x
    const y1 = this.target.y
    const sourceRadius = this.source.strokes.radius
    const targetRadius = this.target.strokes.radius
    const isVisible = this.visible(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1))

    // TODO - disable events if edge has no event handlers
    // TODO - disable events when dragging/scrolling
    if (isVisible && this.renderer.zoom > MIN_INTERACTION_ZOOM) {
      this.renderer.interactionObjectManager.mount(this.hitArea)
    } else {
      this.renderer.interactionObjectManager.unmount(this.hitArea)
    }

    if (isVisible) {
      if (!this.lineMounted) {
        this.renderer.edgeObjectManager.mount(this.lineSegment)
        this.lineMounted = true
      }
    } else {
      if (this.lineMounted) {
        this.renderer.edgeObjectManager.unmount(this.lineSegment)
        this.lineMounted = false
      }
    }

    if (isVisible) {
      if (!this.forwardArrowMounted && this.arrow?.forward) {
        this.renderer.edgeArrowObjectManager.mount(this.arrow?.forward)
        this.forwardArrowMounted = true
      }
    } else {
      if (this.forwardArrowMounted && this.arrow?.forward) {
        this.renderer.edgeArrowObjectManager.unmount(this.arrow?.forward)
        this.forwardArrowMounted = false
      }
    }

    if (isVisible) {
      if (!this.reverseArrowMounted && this.arrow?.reverse) {
        this.renderer.edgeArrowObjectManager.mount(this.arrow?.reverse)
        this.reverseArrowMounted = true
      }
    } else {
      if (this.reverseArrowMounted && this.arrow?.reverse) {
        this.renderer.edgeArrowObjectManager.unmount(this.arrow?.reverse)
        this.reverseArrowMounted = false
      }
    }

    if (isVisible) {
      const width = this.edge?.style?.width ?? DEFAULT_EDGE_WIDTH
      const stroke = this.edge?.style?.stroke ?? DEFAULT_EDGE_COLOR
      const strokeOpacity = this.edge?.style?.strokeOpacity ?? 1

      if (
        x0 !== this.x0 ||
        y0 !== this.y0 ||
        x1 !== this.x1 ||
        y1 !== this.y1 ||
        sourceRadius !== this.sourceRadius ||
        targetRadius !== this.targetRadius ||
        width !== this.width ||
        stroke !== this.stroke ||
        strokeOpacity !== this.strokeOpacity
      ) {
        this.width = width
        this.stroke = stroke
        this.strokeOpacity = strokeOpacity
        this.sourceRadius = sourceRadius
        this.targetRadius = targetRadius
        this.x0 = x0
        this.y0 = y0
        this.x1 = x1
        this.y1 = y1
        this.theta = Graph.angle(this.x0, this.y0, this.x1, this.y1)
        let edgeX0 = this.x0
        let edgeY0 = this.y0
        let edgeX1 = this.x1
        let edgeY1 = this.y1

        if (this.arrow?.forward) {
          const edgePoint = movePoint(x1, y1, this.theta, this.targetRadius + this.arrow.forward.height)
          edgeX1 = edgePoint[0]
          edgeY1 = edgePoint[1]
          const [arrowX1, arrowY1] = movePoint(x1, y1, this.theta, this.targetRadius)
          this.arrow.forward.update(arrowX1, arrowY1, this.theta, this.stroke, this.strokeOpacity)
        } else {
          const edgePoint = movePoint(x1, y1, this.theta, this.targetRadius)
          edgeX1 = edgePoint[0]
          edgeY1 = edgePoint[1]
        }

        if (this.arrow?.reverse) {
          const edgePoint = movePoint(x0, y0, this.theta, -this.sourceRadius - this.arrow.reverse.height)
          edgeX0 = edgePoint[0]
          edgeY0 = edgePoint[1]
          const [arrowX0, arrowY0] = movePoint(x0, y0, this.theta, -this.sourceRadius)
          this.arrow.reverse.update(arrowX0, arrowY0, this.theta + Math.PI, this.stroke, this.strokeOpacity)
        } else {
          const edgePoint = movePoint(x0, y0, this.theta, -this.sourceRadius)
          edgeX0 = edgePoint[0]
          edgeY0 = edgePoint[1]
        }

        this.lineSegment.update(edgeX0, edgeY0, edgeX1, edgeY1, this.width, this.stroke, this.strokeOpacity)
        // TODO - draw hitArea over arrow
        this.hitArea.update(edgeX0, edgeY0, edgeX1, edgeY1, this.width, this.theta)
      }
    }
  }

  delete() {
    this.renderer.edgeObjectManager.delete(this.lineSegment)
    if (this.arrow?.forward) {
      this.renderer.edgeArrowObjectManager.delete(this.arrow.forward)
    }
    if (this.arrow?.reverse) {
      this.renderer.edgeArrowObjectManager.delete(this.arrow.reverse)
    }
    this.renderer.interactionObjectManager.delete(this.hitArea)
  }

  pointerEnter = (event: FederatedPointerEvent) => {
    if (this.renderer.dragInteraction.dragging || this.renderer.zoomInteraction.zooming) {
      return
    }

    if (this.renderer.onEdgePointerDown || this.renderer.onEdgeClick || this.renderer.onEdgeDoubleClick || this.renderer.onEdgePointerUp) {
      this.renderer.container.style.cursor = 'pointer'
    }

    const local = this.renderer.root.toLocal(event.global)
    this.renderer.onEdgePointerEnter?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edge!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  pointerDown = (event: FederatedPointerEvent) => {
    const local = this.renderer.root.toLocal(event.global)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()

    if (this.renderer.onEdgeDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.doubleClick = true
      }
    }

    this.renderer.onEdgePointerDown?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edge!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  pointerUp = (event: FederatedPointerEvent) => {
    const local = this.renderer.root.toLocal(event.global)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()

    this.renderer.onEdgePointerUp?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edge!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })

    this.renderer.onEdgeClick?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edge!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })

    if (this.doubleClick) {
      this.doubleClick = false
      this.doubleClickTimeout = undefined
      this.renderer.onEdgeDoubleClick?.({
        type: 'edgePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.edge!,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }
  }

  pointerLeave = (event: FederatedPointerEvent) => {
    if (this.renderer.dragInteraction.dragging || this.renderer.zoomInteraction.zooming) {
      return
    }

    if (this.renderer.onEdgePointerDown || this.renderer.onEdgeClick || this.renderer.onEdgeDoubleClick || this.renderer.onEdgePointerUp) {
      this.renderer.container.style.cursor = 'auto'
    }

    const local = this.renderer.root.toLocal(event.global)
    this.renderer.onEdgePointerLeave?.({
      type: 'edgePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.edge!,
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

  private visible(minX: number, minY: number, maxX: number, maxY: number) {
    // TODO - also calculate whether edge intersects with any of the 4 bbox edges
    return (
      this.renderer.zoom > MIN_EDGES_ZOOM &&
      maxX >= this.renderer.minX &&
      minX <= this.renderer.maxX &&
      maxY >= this.renderer.minY &&
      minY <= this.renderer.maxY
    )
  }
}
