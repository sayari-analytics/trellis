import { DEFAULT_LABEL_STYLE, MIN_EDGES_ZOOM, MIN_INTERACTION_ZOOM, MIN_LABEL_ZOOM } from '../../utils/constants'
import { type Renderer } from '.'
import { midPoint } from './utils'
import { movePoint } from './utils'
import { NodeRenderer } from './node'
import type { ArrowStyle, Edge } from '../../types'
import { Arrow } from './objects/arrow'
import { LineSegment } from './objects/lineSegment'
import { FederatedPointerEvent } from 'pixi.js'
import { EdgeHitArea } from './interaction/edgeHitArea'
import { angle } from '../../utils/api'
import Text from './objects/text/Text'

const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = 0xaaaaaa
const DEFAULT_ARROW = 'none'

export class EdgeRenderer {
  edge!: Edge
  source!: NodeRenderer
  target!: NodeRenderer
  label?: Text
  renderer: Renderer
  lineSegment: LineSegment
  x0 = 0
  y0 = 0
  x1 = 0
  y1 = 0
  theta = 0
  center: [x: number, y: number] = [0, 0]
  width?: number
  stroke?: string | number
  strokeOpacity?: number
  sourceRadius?: number
  targetRadius?: number

  private hitArea: EdgeHitArea
  private arrow?: { forward: Arrow; reverse?: undefined } | { forward?: undefined; reverse: Arrow } | { forward: Arrow; reverse: Arrow }
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false

  constructor(renderer: Renderer, edge: Edge, source: NodeRenderer, target: NodeRenderer) {
    this.renderer = renderer
    this.lineSegment = new LineSegment(this.renderer.edgesContainer)
    this.hitArea = new EdgeHitArea(this.renderer.interactionContainer, this)
    this.update(edge, source, target)
  }

  update(edge: Edge, source: NodeRenderer, target: NodeRenderer) {
    this.edge = edge
    this.source = source
    this.target = target

    const arrow = edge.style?.arrow ?? DEFAULT_ARROW
    if (arrow !== this.arrowStyle) {
      this.arrow?.forward?.delete()
      this.arrow?.reverse?.delete()
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

    if (edge.label === undefined || edge.label.trim() === '') {
      if (this.label) {
        this.managers.labels.delete(this.label)
        this.label = undefined
      }
    } else if (this.label === undefined) {
      this.label = new Text(this.renderer.assets, this.renderer.labelsContainer, edge.label, edge.style?.label, DEFAULT_LABEL_STYLE)
    } else {
      this.label.update(edge.label, edge.style?.label)
    }

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
    const shouldHitAreaMount = isVisible && this.renderer.zoom > MIN_INTERACTION_ZOOM
    const hitAreaMounted = this.managers.interactions.isMounted(this.hitArea)
    if (shouldHitAreaMount && !hitAreaMounted) {
      this.managers.interactions.mount(this.hitArea)
    } else if (!shouldHitAreaMount && hitAreaMounted) {
      this.managers.interactions.unmount(this.hitArea)
    }

    const lineMounted = this.managers.edges.isMounted(this.lineSegment)
    if (isVisible && !lineMounted) {
      this.managers.edges.mount(this.lineSegment)
    } else if (!isVisible && lineMounted) {
      this.managers.edges.unmount(this.lineSegment)
    }

    if (this.arrow?.forward) {
      const forwardArrowMounted = this.managers.arrows.isMounted(this.arrow.forward)
      if (isVisible && !forwardArrowMounted) {
        this.managers.arrows.mount(this.arrow.forward)
      } else if (!isVisible && forwardArrowMounted) {
        this.managers.arrows.unmount(this.arrow.forward)
      }
    }

    if (this.arrow?.reverse) {
      const reverseArrowMounted = this.managers.arrows.isMounted(this.arrow.reverse)
      if (isVisible && !reverseArrowMounted) {
        this.managers.arrows.mount(this.arrow.reverse)
      } else if (!isVisible && reverseArrowMounted) {
        this.managers.arrows.unmount(this.arrow.reverse)
      }
    }

    if (this.label) {
      const shouldLabelMount = isVisible && this.renderer.zoom > MIN_LABEL_ZOOM
      const labelMounted = this.managers.labels.isMounted(this.label)
      if (shouldLabelMount && !labelMounted) {
        this.managers.labels.mount(this.label)
      } else if (!shouldLabelMount && labelMounted) {
        this.managers.labels.unmount(this.label)
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
        this.theta = angle(this.x0, this.y0, this.x1, this.y1)
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

        this.center = midPoint(edgeX0, edgeY0, edgeX1, edgeY1)
        if (this.label) {
          this.label.rotation = this.theta
          this.label.moveTo(...this.center)
        }

        this.lineSegment.update(edgeX0, edgeY0, edgeX1, edgeY1, this.width, this.stroke, this.strokeOpacity)
        // TODO - draw hitArea over arrow
        this.hitArea.update(edgeX0, edgeY0, edgeX1, edgeY1, this.width, this.theta)
      }
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)

    this.managers.edges.delete(this.lineSegment)
    this.managers.interactions.delete(this.hitArea)
    if (this.arrow?.forward) {
      this.managers.arrows.delete(this.arrow.forward)
    }
    if (this.arrow?.reverse) {
      this.managers.arrows.delete(this.arrow.reverse)
    }
  }

  pointerEnter = (event: FederatedPointerEvent) => {
    if (this.renderer.draggedNode || this.renderer.dragInteraction.dragging || this.renderer.zoomInteraction.zooming) {
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

    if (this.renderer.onEdgePointerDown) {
      event.stopPropagation()
      this.renderer.onEdgePointerDown({
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

  pointerUp = (event: FederatedPointerEvent) => {
    const local = this.renderer.root.toLocal(event.global)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()

    if (this.renderer.onEdgePointerUp) {
      event.stopPropagation()
      this.renderer.onEdgePointerUp({
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

    if (this.renderer.onEdgeClick) {
      event.stopPropagation()
      this.renderer.onEdgeClick({
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

    if (this.doubleClick) {
      this.doubleClick = false
      this.doubleClickTimeout = undefined
      if (this.renderer.onEdgeDoubleClick) {
        event.stopPropagation()
        this.renderer.onEdgeDoubleClick({
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
  }

  pointerLeave = (event: FederatedPointerEvent) => {
    if (this.renderer.draggedNode || this.renderer.dragInteraction.dragging || this.renderer.zoomInteraction.zooming) {
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

  private get managers() {
    return this.renderer.managers
  }

  private get arrowStyle(): ArrowStyle {
    if (this.arrow === undefined) {
      return 'none'
    } else if (this.arrow.forward !== undefined && this.arrow.reverse !== undefined) {
      return 'both'
    } else if (this.arrow.forward !== undefined) {
      return 'forward'
    } else {
      return 'reverse'
    }
  }
}
