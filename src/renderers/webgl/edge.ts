import {
  DEFAULT_ARROW,
  DEFAULT_LABEL_STYLE,
  MIN_EDGES_ZOOM,
  MIN_INTERACTION_ZOOM,
  MIN_LABEL_ZOOM,
  MIN_STROKE_ZOOM
} from '../../utils/constants'
import type { ArrowStyle, Edge, PointTuple } from '../../types'
import { FederatedPointerEvent } from 'pixi.js'
import { midPoint, movePoint } from '../../utils/webgl'
import { angle, distance } from '../../utils/api'
import { NodeRenderer } from './node'
import { type Renderer } from '.'
import { EdgeHitArea } from './interaction/edgeHitArea'
import Arrow from './objects/Arrow'
import LineSegment from './objects/line/LineSegment'
import LineStrokes from './objects/line/LineStrokes'
import Text from './objects/text/Text'

export class EdgeRenderer {
  edge!: Edge
  source!: NodeRenderer
  target!: NodeRenderer
  sourceRadius?: number
  targetRadius?: number

  private x0 = 0
  private y0 = 0
  private x1 = 0
  private y1 = 0
  private length = 0
  private theta = 0
  private center: PointTuple = [0, 0]
  private lineSegment: LineSegment
  private hitArea: EdgeHitArea
  private strokes?: LineStrokes
  private label?: Text
  private forwardArrow?: Arrow
  private reverseArrow?: Arrow
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false

  constructor(
    private renderer: Renderer,
    edge: Edge,
    source: NodeRenderer,
    target: NodeRenderer
  ) {
    this.renderer = renderer
    this.lineSegment = new LineSegment(this.renderer.edgesContainer)
    this.hitArea = new EdgeHitArea(this.renderer.interactionContainer, this)
    this.update(edge, source, target)
  }

  update(edge: Edge, source: NodeRenderer, target: NodeRenderer) {
    this.edge = edge
    this.source = source
    this.target = target

    this.lineSegment.update(edge.style?.color, edge.style?.width, edge.style?.opacity)

    if (this.strokes) {
      this.strokes.update(edge.style?.stroke)
    }

    const arrow = edge.style?.arrow ?? DEFAULT_ARROW

    if (arrow !== this.arrow) {
      switch (arrow) {
        case 'forward':
          this.applyArrow({ forward: true, reverse: false })
          break

        case 'reverse':
          this.applyArrow({ forward: false, reverse: true })
          break

        case 'both':
          this.applyArrow({ forward: true, reverse: true })
          break

        case 'none':
          this.applyArrow({ forward: false, reverse: false })
          break
      }
    }

    this.forwardArrow?.update(edge.style?.color, edge.style?.opacity)
    this.reverseArrow?.update(edge.style?.color, edge.style?.opacity)

    if (this.label) {
      if (edge.label === undefined || edge.label.trim() === '') {
        this.label = this.managers.labels.delete(this.label)
      } else {
        this.label.update(edge.label, edge.style?.label)
      }
    }

    return this
  }

  render() {
    const x0 = this.source.x
    const y0 = this.source.y
    const x1 = this.target.x
    const y1 = this.target.y
    const sourceRadius = this.source.radius
    const targetRadius = this.target.radius

    const isVisible = this.visible(x0, y0, x1, y1)

    if (isVisible) {
      if (
        x0 !== this.x0 ||
        y0 !== this.y0 ||
        x1 !== this.x1 ||
        y1 !== this.y1 ||
        sourceRadius !== this.sourceRadius ||
        targetRadius !== this.targetRadius
      ) {
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

        if (this.forwardArrow) {
          const edgePoint = movePoint(x1, y1, this.theta, this.targetRadius + this.forwardArrow.height)
          edgeX1 = edgePoint[0]
          edgeY1 = edgePoint[1]

          this.forwardArrow.rotate(this.theta).moveTo(...movePoint(x1, y1, this.theta, this.targetRadius))
        } else {
          const edgePoint = movePoint(x1, y1, this.theta, this.targetRadius)
          edgeX1 = edgePoint[0]
          edgeY1 = edgePoint[1]
        }

        if (this.reverseArrow) {
          const edgePoint = movePoint(x0, y0, this.theta, -this.sourceRadius - this.reverseArrow.height)
          edgeX0 = edgePoint[0]
          edgeY0 = edgePoint[1]

          this.reverseArrow.rotate(this.theta + Math.PI).moveTo(...movePoint(x0, y0, this.theta, -this.sourceRadius))
        } else {
          const edgePoint = movePoint(x0, y0, this.theta, -this.sourceRadius)
          edgeX0 = edgePoint[0]
          edgeY0 = edgePoint[1]
        }

        this.center = midPoint(edgeX0, edgeY0, edgeX1, edgeY1)
        this.length = distance(edgeX0, edgeY0, edgeX1, edgeY1)

        // TODO -> draw hitArea/strokes over arrows
        this.lineSegment.rotate(this.theta).resize(this.length).moveTo(edgeX0, edgeY0)

        this.strokes?.rotate(this.theta).resize(this.length).moveTo(edgeX0, edgeY0)

        this.hitArea.update(edgeX0, edgeY0, edgeX1, edgeY1, this.width, this.theta)

        if (this.label) {
          this.label.offset = this.width
          this.label.rotate(this.theta).moveTo(...this.center)
        }
      }
    }

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

    const strokesShouldMount = isVisible && this.renderer.zoom > MIN_STROKE_ZOOM

    if (strokesShouldMount && !this.strokes && this.edge.style?.stroke) {
      this.strokes = new LineStrokes(this.renderer.edgesContainer, this.lineSegment, this.edge.style.stroke).moveTo(this.x0, this.y0)
    }

    if (this.strokes) {
      const strokesMounted = this.managers.edges.isMounted(this.strokes)
      if (strokesShouldMount && !strokesMounted) {
        this.managers.edges.mount(this.strokes)
      } else if (!strokesShouldMount && strokesMounted) {
        this.managers.edges.unmount(this.strokes)
      }
    }

    if (this.forwardArrow) {
      const forwardArrowMounted = this.managers.arrows.isMounted(this.forwardArrow)
      if (isVisible && !forwardArrowMounted) {
        this.managers.arrows.mount(this.forwardArrow)
      } else if (!isVisible && forwardArrowMounted) {
        this.managers.arrows.unmount(this.forwardArrow)
      }
    }

    if (this.reverseArrow) {
      const reverseArrowMounted = this.managers.arrows.isMounted(this.reverseArrow)
      if (isVisible && !reverseArrowMounted) {
        this.managers.arrows.mount(this.reverseArrow)
      } else if (!isVisible && reverseArrowMounted) {
        this.managers.arrows.unmount(this.reverseArrow)
      }
    }

    const shouldLabelMount = isVisible && this.renderer.zoom > MIN_LABEL_ZOOM

    if (shouldLabelMount) {
      this.applyLabel()
    }

    if (this.label) {
      const labelMounted = this.managers.labels.isMounted(this.label)
      if (shouldLabelMount && !labelMounted) {
        this.managers.labels.mount(this.label)
      } else if (!shouldLabelMount && labelMounted) {
        this.managers.labels.unmount(this.label)
      }
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)

    this.managers.edges.delete(this.lineSegment)
    this.managers.interactions.delete(this.hitArea)

    if (this.strokes) {
      this.strokes = this.managers.edges.delete(this.strokes)
    }
    if (this.label) {
      this.label = this.managers.labels.delete(this.label)
    }
    if (this.forwardArrow) {
      this.forwardArrow = this.managers.arrows.delete(this.forwardArrow)
    }
    if (this.reverseArrow) {
      this.reverseArrow = this.managers.arrows.delete(this.reverseArrow)
    }
  }

  get width() {
    return this.strokes?.width ?? this.lineSegment.width
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

  private visible(x0: number, y0: number, x1: number, y1: number) {
    const [minX, minY, maxX, maxY] = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]
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

  private get arrow(): ArrowStyle {
    if (this.forwardArrow === undefined && this.reverseArrow === undefined) {
      return 'none'
    } else if (this.reverseArrow === undefined) {
      return 'forward'
    } else if (this.forwardArrow === undefined) {
      return 'reverse'
    } else {
      return 'both'
    }
  }

  private applyArrow({ forward, reverse }: { forward: boolean; reverse: boolean }) {
    if (forward && this.forwardArrow === undefined) {
      this.forwardArrow = new Arrow(this.renderer.edgesContainer, this.renderer.arrow)
    } else if (!forward && this.forwardArrow !== undefined) {
      this.managers.arrows.delete(this.forwardArrow)
      this.forwardArrow = undefined
    }

    if (reverse && this.reverseArrow === undefined) {
      this.reverseArrow = new Arrow(this.renderer.edgesContainer, this.renderer.arrow)
    } else if (!reverse && this.reverseArrow !== undefined) {
      this.managers.arrows.delete(this.reverseArrow)
      this.reverseArrow = undefined
    }

    return this
  }

  private applyLabel() {
    const label = this.edge.label
    const style = this.edge.style?.label
    if (label !== undefined && label.trim() !== '' && this.label === undefined) {
      this.label = new Text(this.renderer.assets, this.renderer.labelsContainer, label, style, DEFAULT_LABEL_STYLE)
      this.label.offset = this.width
      this.label.rotate(this.theta).moveTo(...this.center)
    }

    return this
  }
}
