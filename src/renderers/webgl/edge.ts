import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '.'
import {
  angle,
  colorToNumber,
  midPoint,
  movePoint,
  length,
  TWO_PI,
  HALF_PI,
  THREE_HALF_PI,
  clientPositionFromEvent,
  pointerKeysFromEvent
} from './utils'
import { Node, Edge, EdgeStyle } from '../../trellis'
import { ArrowSprite } from './sprites/arrowSprite'

const LINE_HOVER_RADIUS = 4
const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = colorToNumber('#ccc')
const DEFAULT_EDGE_OPACITY = 1
const DEFAULT_LABEL_FAMILY = 'Helvetica'
const DEFAULT_LABEL_COLOR = colorToNumber('#444')
const DEFAULT_LABEL_SIZE = 11
const DEFAULT_ARROW = 'none'

export class EdgeRenderer<N extends Node, E extends Edge> {
  edge: E

  private renderer: InternalRenderer<N, E>
  private label?: string
  private labelFamily?: string
  private labelColor?: number
  private labelSize?: number
  private labelWordWrap?: number
  private labelBackground?: string
  private labelBackgroundOpacity?: number
  private width = DEFAULT_EDGE_WIDTH
  private stroke = DEFAULT_EDGE_COLOR
  private strokeOpacity = DEFAULT_EDGE_OPACITY
  private line = new PIXI.ParticleContainer() // can this be a DisplayObject
  private arrowContainer = new PIXI.Container() // why can't this be a ParticleContainer
  private arrow: EdgeStyle['arrow'] = DEFAULT_ARROW
  private forwardArrow?: PIXI.Sprite
  private reverseArrow?: PIXI.Sprite
  private labelContainer = new PIXI.Container() // TODO - can't use ParticleContainer.  lazily add label sprite directly to edgesLayer
  private labelSprite?: PIXI.Text
  private labelBackgroundSprite?: PIXI.Sprite
  private x0: number = 0
  private y0: number = 0
  private x1: number = 0
  private y1: number = 0
  private curvePeak?: [number, number]
  private curveControlPointA?: [number, number]
  private curveControlPointB?: [number, number]
  private curve: number = 0
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false
  private labelLoader?: () => void

  constructor(renderer: InternalRenderer<N, E>, edge: E) {
    this.renderer = renderer

    // this.line.visible = false
    this.line.interactive = true
    this.line.buttonMode = true
    this.line
      .on('pointerover', this.pointerEnter)
      .on('pointerout', this.pointerLeave)
      .on('pointerdown', this.pointerDown)
      .on('pointerup', this.pointerUp)
      .on('pointerupoutside', this.pointerUp)
      .on('pointercancel', this.pointerUp)

    this.renderer.edgesLayer.addChild(this.line)
    /**
     * TODO - perf test adding label/arrow directly to edgesLayer container, vs. creating label/arrow containers
     */
    this.renderer.edgesLayer.addChild(this.arrowContainer)
    this.renderer.edgesLayer.addChild(this.labelContainer)
    this.edge = edge
    this.update(edge)
  }

  update(edge: E) {
    this.edge = edge

    /**
     * Style
     */
    this.width = this.edge.style?.width ?? DEFAULT_EDGE_WIDTH

    /**
     * Arrow
     */
    const arrow = edge.style?.arrow ?? DEFAULT_ARROW
    if (this.arrow !== arrow) {
      this.arrow = arrow
      this.arrowContainer.removeChildren()
      this.forwardArrow?.destroy()
      this.reverseArrow?.destroy()
      this.forwardArrow = undefined
      this.reverseArrow = undefined

      if (this.arrow === 'forward') {
        this.forwardArrow = this.renderer.arrow.create()
        this.forwardArrow.tint = this.stroke
        this.forwardArrow.alpha = this.strokeOpacity
        this.arrowContainer.addChild(this.forwardArrow)
      } else if (this.arrow === 'reverse') {
        this.reverseArrow = this.renderer.arrow.create()
        this.reverseArrow.tint = this.stroke
        this.reverseArrow.alpha = this.strokeOpacity
        this.arrowContainer.addChild(this.reverseArrow)
      } else if (this.arrow === 'both') {
        this.forwardArrow = this.renderer.arrow.create()
        this.reverseArrow = this.renderer.arrow.create()
        this.forwardArrow.tint = this.stroke
        this.forwardArrow.alpha = this.strokeOpacity
        this.reverseArrow.tint = this.stroke
        this.reverseArrow.alpha = this.strokeOpacity
        this.arrowContainer.addChild(this.forwardArrow)
        this.arrowContainer.addChild(this.reverseArrow)
      }
    }

    /**
     * Stroke
     */
    const stroke = edge.style?.stroke === undefined ? DEFAULT_EDGE_COLOR : colorToNumber(edge.style?.stroke)
    if (this.stroke !== stroke) {
      this.stroke = stroke
      if (this.arrow === 'forward' && this.forwardArrow !== undefined) {
        this.forwardArrow.tint = this.stroke
      } else if (this.arrow === 'reverse' && this.reverseArrow !== undefined) {
        this.reverseArrow.tint = this.stroke
      } else if (this.arrow === 'both' && this.forwardArrow !== undefined && this.reverseArrow !== undefined) {
        this.reverseArrow.tint = this.stroke
        this.forwardArrow.tint = this.stroke
      }
    }

    /**
     * Stroke Opacity
     */
    const strokeOpacity = edge.style?.strokeOpacity ?? DEFAULT_EDGE_OPACITY
    if (this.strokeOpacity !== strokeOpacity) {
      this.strokeOpacity = strokeOpacity
      if (this.arrow === 'forward' && this.forwardArrow !== undefined) {
        this.forwardArrow.alpha = this.strokeOpacity
      } else if (this.arrow === 'reverse' && this.reverseArrow !== undefined) {
        this.reverseArrow.alpha = this.strokeOpacity
      } else if (this.arrow === 'both' && this.forwardArrow !== undefined && this.reverseArrow !== undefined) {
        this.reverseArrow.alpha = this.strokeOpacity
        this.forwardArrow.alpha = this.strokeOpacity
      }
    }
    /**
     * Label
     */
    const labelFamily = edge.style?.label?.fontFamily ?? DEFAULT_LABEL_FAMILY
    const labelColor = edge.style?.label?.color === undefined ? DEFAULT_LABEL_COLOR : colorToNumber(edge.style.label.color)
    const labelSize = edge.style?.label?.fontSize ?? DEFAULT_LABEL_SIZE
    const labelWordWrap = edge.style?.label?.wordWrap
    const labelBackground = edge.style?.label?.background
    const labelBackgroundOpacity = edge.style?.label?.backgroundOpacity

    if (
      edge.label !== this.label ||
      labelFamily !== this.labelFamily ||
      labelColor !== this.labelColor ||
      labelSize !== this.labelSize ||
      labelWordWrap !== this.labelWordWrap ||
      labelBackground !== this.labelBackground ||
      labelBackgroundOpacity !== this.labelBackgroundOpacity
    ) {
      this.label = edge.label
      this.labelFamily = labelFamily
      this.labelColor = labelColor
      this.labelSize = labelSize
      this.labelWordWrap = labelWordWrap
      this.labelBackground = labelBackground
      this.labelBackgroundOpacity = labelBackgroundOpacity
      this.labelContainer.removeChildren()
      this.labelSprite?.destroy()
      this.labelSprite = undefined
      this.labelLoader?.()

      if (this.label) {
        this.labelLoader = this.renderer.fontLoader.load(
          this.labelFamily,
          'normal'
        )((family) => {
          if (this.label === undefined || this.labelFamily !== family) return

          // this.dirty = true
          this.renderer.dirty = true

          this.labelSprite = new PIXI.Text(this.label, {
            fontFamily: this.labelFamily,
            fontSize: (this.labelSize ?? DEFAULT_LABEL_SIZE) * 2.5,
            fill: this.labelColor,
            lineJoin: 'round',
            stroke: '#fafafa',
            strokeThickness: 2.5 * 2.5,
            align: 'center',
            wordWrap: labelWordWrap !== undefined,
            wordWrapWidth: labelWordWrap
          })

          this.labelSprite.scale.set(0.4)
          this.labelSprite.anchor.set(0.5, 0.5)
          this.labelContainer.addChild(this.labelSprite)

          if (this.labelBackground) {
            this.labelBackgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE)
            this.labelBackgroundSprite.width = this.labelSprite.width + 4
            this.labelBackgroundSprite.height = this.labelSprite.height
            this.labelBackgroundSprite.tint = colorToNumber(this.labelBackground)
            this.labelBackgroundSprite.alpha = this.labelBackgroundOpacity ?? 1
            this.labelBackgroundSprite.anchor.set(0.5, 0.5)
            this.labelContainer.addChild(this.labelBackgroundSprite)
          }

          this.labelContainer.addChild(this.labelSprite)
        })
      }
    }

    /**
     * Curve
     * TODO - expose edge curve in style spec
     */
    const parallelEdges = this.renderer.edgeIndex[this.edge.source][this.edge.target]
    // curve will be 0 for 1 self edge and negative for the rest, making it easy to render a single self edge
    this.curve = this.edge.source === this.edge.target ? 0 : parallelEdges.size - 1
    for (const edgeId of parallelEdges) {
      if (edgeId === this.edge.id) {
        break
      }
      this.curve -= 2
    }

    return this
  }

  /**
   * TODO - perf boost: render cheap version of things while still animating position or dragging
   */
  render() {
    const sourceContainer = this.renderer.nodesById[this.edge.source],
      targetContainer = this.renderer.nodesById[this.edge.target],
      sourceRadius = sourceContainer.radius + sourceContainer.strokeWidth,
      targetRadius = targetContainer.radius + targetContainer.strokeWidth,
      theta = angle(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y),
      start = movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceRadius),
      end = movePoint(targetContainer.x, targetContainer.y, theta, targetRadius)

    let center = midPoint(start[0], start[1], end[0], end[1])

    if (sourceContainer === targetContainer) {
      // TODO: handle multiple self-edges
      if (this.curve === 0) {
        const r = 2 * sourceRadius
        center = [sourceContainer.x - r, sourceContainer.y]

        const circle = new PIXI.Circle(...center, r)
        this.x0 = sourceContainer.x
        this.y0 = sourceContainer.y
        this.x1 = sourceContainer.x
        this.y1 = sourceContainer.y

        this.renderer.edgesGraphic.moveTo(this.x0, this.y0).lineStyle(this.width, this.stroke, this.strokeOpacity).drawShape(circle)

        this.labelContainer.x = center[0] - r
        this.labelContainer.y = center[1]

        if ((this.labelSprite?.width ?? 0) > 2 * r) {
          this.labelContainer.visible = false
          if (this.labelBackgroundSprite) this.labelBackgroundSprite.visible = false
        }

        this.line.hitArea = circle
      }
    } else if (this.curve === 0) {
      const startArrowOffset = this.reverseArrow
        ? movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceRadius - ArrowSprite.ARROW_HEIGHT)
        : start
      const endArrowOffset = this.forwardArrow
        ? movePoint(targetContainer.x, targetContainer.y, theta, targetRadius + ArrowSprite.ARROW_HEIGHT)
        : end
      /**
       * edge start/end is source/target node's center, offset by radius and, if rendered on edge source and/or target, arrow height
       * TODO - once arrows are encorporated into the style spec, add/remove arrowHeight offset
       */
      this.x0 = startArrowOffset[0]
      this.y0 = startArrowOffset[1]
      this.x1 = endArrowOffset[0]
      this.y1 = endArrowOffset[1]

      this.renderer.edgesGraphic.moveTo(this.x0, this.y0).lineStyle(this.width, this.stroke, this.strokeOpacity).lineTo(this.x1, this.y1)

      this.labelContainer.x = center[0]
      this.labelContainer.y = center[1]
      this.labelContainer.rotation = theta > HALF_PI && theta < THREE_HALF_PI ? theta - Math.PI : theta

      if (this.forwardArrow) {
        this.forwardArrow.x = end[0]
        this.forwardArrow.y = end[1]
        this.forwardArrow.rotation = theta
      }

      if (this.reverseArrow) {
        this.reverseArrow.x = start[0]
        this.reverseArrow.y = start[1]
        this.reverseArrow.rotation = theta + Math.PI
      }

      // TODO - don't bother rendering hitArea when animating position or dragging
      const hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS)
      const perpendicular = theta + HALF_PI
      const hitAreaVertices: number[] = new Array(8)
      let point = movePoint(start[0], start[1], perpendicular, hoverRadius)
      hitAreaVertices[0] = point[0]
      hitAreaVertices[1] = point[1]
      point = movePoint(end[0], end[1], perpendicular, hoverRadius)
      hitAreaVertices[2] = point[0]
      hitAreaVertices[3] = point[1]
      point = movePoint(end[0], end[1], perpendicular, -hoverRadius)
      hitAreaVertices[4] = point[0]
      hitAreaVertices[5] = point[1]
      point = movePoint(start[0], start[1], perpendicular, -hoverRadius)
      hitAreaVertices[6] = point[0]
      hitAreaVertices[7] = point[1]
      this.line.hitArea = new PIXI.Polygon(hitAreaVertices)
      // this.renderer.edgesGraphic.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.line.hitArea as any)
    } else {
      this.curvePeak = movePoint(
        center[0],
        center[1],
        theta > TWO_PI || theta < 0 ? theta - HALF_PI : theta + HALF_PI,
        this.edge.source > this.edge.target ? this.curve * 10 : this.curve * -10
      )
      const thetaCurveStart = angle(sourceContainer.x, sourceContainer.y, this.curvePeak[0], this.curvePeak[1])
      const thetaCurveEnd = angle(this.curvePeak[0], this.curvePeak[1], targetContainer.x, targetContainer.y)
      const curveStart = this.reverseArrow
        ? movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius - ArrowSprite.ARROW_HEIGHT)
        : movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius)
      const curveEnd = this.forwardArrow
        ? movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius + ArrowSprite.ARROW_HEIGHT)
        : movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius)
      this.x0 = curveStart[0]
      this.y0 = curveStart[1]
      this.x1 = curveEnd[0]
      this.y1 = curveEnd[1]

      const edgeLength = length(this.x0, this.y0, this.x1, this.y1)
      this.curveControlPointA = movePoint(this.curvePeak[0], this.curvePeak[1], theta, edgeLength / 4)
      this.curveControlPointB = movePoint(this.curvePeak[0], this.curvePeak[1], theta, edgeLength / -4)

      this.renderer.edgesGraphic
        .moveTo(this.x0, this.y0)
        .lineStyle(this.width, this.stroke, this.strokeOpacity)
        .bezierCurveTo(this.x0, this.y0, this.curveControlPointA[0], this.curveControlPointA[1], this.curvePeak[0], this.curvePeak[1])
        .bezierCurveTo(this.curveControlPointB[0], this.curveControlPointB[1], this.x1, this.y1, this.x1, this.y1)

      this.labelContainer.x = this.curvePeak[0]
      this.labelContainer.y = this.curvePeak[1]
      this.labelContainer.rotation = theta > HALF_PI && theta < THREE_HALF_PI ? theta - Math.PI : theta

      if (this.forwardArrow) {
        const [x, y] = movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius)
        this.forwardArrow.x = x
        this.forwardArrow.y = y
        this.forwardArrow.rotation = thetaCurveEnd
      }

      if (this.reverseArrow) {
        const [x, y] = movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius)
        this.reverseArrow.x = x
        this.reverseArrow.y = y
        this.reverseArrow.rotation = thetaCurveStart + Math.PI
      }

      /**
       * TODO - properly calculate bezier hit area: https://github.com/w8r/bezier-intersect#quadbezieraabbax-ay-cx-cy-bx-by-minx-miny-maxx-maxy-resultarraynumbernumber
       */
      const hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS)
      const hitAreaVertices: number[] = new Array(12)
      let point = movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, hoverRadius)
      hitAreaVertices[0] = point[0]
      hitAreaVertices[1] = point[1]
      point = movePoint(this.curvePeak[0], this.curvePeak[1], theta + HALF_PI, hoverRadius)
      hitAreaVertices[2] = point[0]
      hitAreaVertices[3] = point[1]
      point = movePoint(this.x1, this.y1, thetaCurveEnd + HALF_PI, hoverRadius)
      hitAreaVertices[4] = point[0]
      hitAreaVertices[5] = point[1]
      point = movePoint(this.x1, this.y1, theta + HALF_PI, -hoverRadius)
      hitAreaVertices[6] = point[0]
      hitAreaVertices[7] = point[1]
      point = movePoint(this.curvePeak[0], this.curvePeak[1], theta + HALF_PI, -hoverRadius)
      hitAreaVertices[8] = point[0]
      hitAreaVertices[9] = point[1]
      point = movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, -hoverRadius)
      hitAreaVertices[10] = point[0]
      hitAreaVertices[11] = point[1]
      this.line.hitArea = new PIXI.Polygon(hitAreaVertices)
      // this.renderer.edgesGraphic.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.line.hitArea as any)
    }

    /**
     * TODO
     * - only double text resolution at high zoom, using occlusion (edge can't be occluded, but edge label can)
     * - half text resolution at low zoom
     * - though dynamically changing font size has really bad performance... maybe separate text objects should be created on initialization, and they are swapped on zoom
     */
    // if (this.viewport.scale.x > 1) {
    //   text.style.fontSize *= 2
    //   text.style.strokeThickness *= 2
    //   text.scale.set(0.5)
    // } else {
    //   text.style.fontSize /= 2
    //   text.style.strokeThickness /= 2
    //   text.scale.set(1)
    // }

    /**
     * hide label if line is too long
     * TODO
     * - truncate text, rather than hiding, or shrink size
     * - improve text resolution at high zoom, and maybe decrease/hide at low zoom
     */
    if (this.label && this.labelSprite) {
      const edgeLength = length(this.x0, this.y0, this.x1, this.y1)
      // For self edges using edgeLength like this won't work, so there is logic in the
      // if clause handling drawing self edges to hide labels when necessary
      if (this.labelSprite.width > edgeLength && this.edge.target !== this.edge.source) {
        this.labelSprite.visible = false
        if (this.labelBackgroundSprite) this.labelBackgroundSprite.visible = false
      } else {
        this.labelSprite.visible = true
        if (this.labelBackgroundSprite) this.labelBackgroundSprite.visible = true
      }
    }
  }

  delete() {
    if (this.doubleClickTimeout) {
      clearTimeout(this.doubleClickTimeout)
      this.doubleClickTimeout = undefined
    }

    this.labelLoader?.()

    this.line.destroy()
    this.arrowContainer.destroy()
    this.labelContainer.destroy()
    delete this.renderer.edgesById[this.edge.id]
  }

  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (
      this.renderer.clickedEdge !== undefined ||
      this.renderer.hoveredEdge !== undefined ||
      this.renderer.clickedNode !== undefined ||
      this.renderer.dragging
    )
      return

    this.renderer.hoveredEdge = this

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onEdgePointerEnter?.({
      type: 'edgePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.edge,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (
      this.renderer.clickedEdge !== undefined ||
      this.renderer.hoveredEdge !== this ||
      this.renderer.clickedNode !== undefined ||
      this.renderer.dragging
    )
      return

    this.renderer.hoveredEdge = undefined

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onEdgePointerLeave?.({
      type: 'edgePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.edge,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }

  private pointerDown = (event: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedEdge = this
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onEdgePointerDown?.({
      type: 'edgePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.edge,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedEdge === undefined) return

    this.renderer.clickedEdge = undefined
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onEdgePointerUp?.({
      type: 'edgePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.edge,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
    this.renderer.onEdgeClick?.({
      type: 'edgePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.edge,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })

    if (this.doubleClick) {
      this.doubleClick = false
      this.doubleClickTimeout = undefined
      this.renderer.onEdgeDoubleClick?.({
        type: 'edgePointer',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        target: this.edge,
        ...pointerKeysFromEvent(event.data.originalEvent)
      })
    }
  }
}
