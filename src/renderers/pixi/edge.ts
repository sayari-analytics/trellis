import * as PIXI from 'pixi.js'
import { EdgeStyle, PIXIRenderer as Renderer } from '.'
import { colorToNumber } from './utils'
import { Node, Edge } from '../../types'
import { ArrowRenderer } from './edgeArrow'


const movePoint = (x: number, y: number, angle: number, distance: number): [number, number] => [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]

const midPoint = (x0: number, y0: number, x1: number, y1: number): [number, number] => [(x0 + x1) / 2, (y0 + y1) / 2]

const length = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0)

const angle = (x0: number, y0: number, x1: number, y1: number) => Math.atan2(y0 - y1, x0 - x1)

const HALF_PI = Math.PI / 2
const TWO_PI = Math.PI * 2
const THREE_HALF_PI = HALF_PI * 3
const LINE_HOVER_RADIUS = 4

const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = '#ccc'
const DEFAULT_EDGE_OPACITY = 1
const DEFAULT_LABEL_FAMILY = 'Helvetica'
const DEFAULT_LABEL_COLOR = '#222'
const DEFAULT_LABEL_SIZE = 14
const DEFAULT_ARROW = 'none'


export class EdgeRenderer<N extends Node, E extends Edge>{

  edge: E | undefined

  private renderer: Renderer<N, E>
  private edgesLayer: PIXI.Container
  private label?: string
  private labelFamily?: string
  private labelColor?: string
  private labelSize?: number
  private width: number = 0
  private stroke: number = 0
  private strokeOpacity: number = 0
  private line = new PIXI.Container()
  private arrowContainer = new PIXI.Container()
  private arrow: EdgeStyle['arrow'] = DEFAULT_ARROW
  private forwardArrow?: PIXI.Sprite
  private reverseArrow?: PIXI.Sprite
  private hoveredEdge = false
  private labelContainer = new PIXI.Container()
  private labelSprite?: PIXI.Text
  private x0: number = 0
  private y0: number = 0
  private x1: number = 0
  private y1: number = 0
  private curvePeak?: [number, number]
  private curveControlPointA?: [number, number]
  private curveControlPointB?: [number, number]
  private curve: number = 0

  constructor(renderer: Renderer<N, E>, edgesLayer: PIXI.Container) {
    this.renderer = renderer
    this.edgesLayer = edgesLayer
    this.line.interactive = true
    this.line.buttonMode = true
    this.line
      .on('pointerover', this.pointerEnter)
      .on('pointerout', this.pointerLeave)
      .on('pointerdown', this.pointerDown)
      .on('pointerup', this.pointerUp)
      .on('pointerupoutside', this.pointerUp)

    this.edgesLayer.addChild(this.line)
    /**
     * TODO - perf test adding label/arrow directly to edgesLayer container, vs. creating label/arrow containers
     */
    this.edgesLayer.addChild(this.arrowContainer)
    this.edgesLayer.addChild(this.labelContainer)
  }

  update(edge: E) {
    this.edge = edge


    /**
     * Style
     */
    this.width = this.edge.style?.width ?? DEFAULT_EDGE_WIDTH
    this.stroke = colorToNumber(edge.style?.stroke ?? DEFAULT_EDGE_COLOR)
    this.strokeOpacity = edge.style?.strokeOpacity ?? DEFAULT_EDGE_OPACITY


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
        this.forwardArrow = this.renderer.arrow.createSprite()
        this.forwardArrow.tint = this.stroke
        this.forwardArrow.alpha = this.strokeOpacity
        this.arrowContainer.addChild(this.forwardArrow)
      } else if (this.arrow === 'reverse') {
        this.reverseArrow = this.renderer.arrow.createSprite()
        this.reverseArrow.tint = this.stroke
        this.reverseArrow.alpha = this.strokeOpacity
        this.arrowContainer.addChild(this.reverseArrow)
      } else if (this.arrow === 'both') {
        this.forwardArrow = this.renderer.arrow.createSprite()
        this.reverseArrow = this.renderer.arrow.createSprite()
        this.forwardArrow.tint = this.stroke
        this.forwardArrow.alpha = this.strokeOpacity
        this.reverseArrow.tint = this.stroke
        this.reverseArrow.alpha = this.strokeOpacity
        this.arrowContainer.addChild(this.forwardArrow)
        this.arrowContainer.addChild(this.reverseArrow)
      }
    }


    /**
     * Label
     */
    const labelFamily = edge.style?.labelFamily ?? DEFAULT_LABEL_FAMILY
    const labelColor = edge.style?.labelColor ?? DEFAULT_LABEL_COLOR
    const labelSize = edge.style?.labelSize ?? DEFAULT_LABEL_SIZE

    if (
      edge.label !== this.label ||
      labelFamily !== this.labelFamily ||
      labelColor !== this.labelColor ||
      labelSize !== this.labelSize
    ) {
      this.label = edge.label
      this.labelFamily = labelFamily
      this.labelColor = labelColor
      this.labelSize = labelSize
      this.labelContainer.removeChildren()
      this.labelSprite?.destroy()
      this.labelSprite = undefined

      if (this.label) {
        this.labelSprite = new PIXI.Text(this.label, {
          fontFamily: this.labelFamily,
          fontSize: this.labelSize * 2.5,
          fill: this.labelColor,
          lineJoin: 'round',
          stroke: '#fafafaee',
          strokeThickness: 2 * 2.5,
        })
        this.labelSprite.name = 'text'
        this.labelSprite.scale.set(0.4)
        this.labelSprite.anchor.set(0.5, 0.5)
        this.labelContainer.addChild(this.labelSprite)
      }
    }


    /**
     * Curve
     * TODO - expose edge curve in style spec
     */
    this.curve = (this.renderer.forwardEdgeIndex[this.edge.source][this.edge.target].size - 1) * 0.5
    for (const edgeId of this.renderer.forwardEdgeIndex[this.edge.source][this.edge.target]) {
      if (edgeId === this.edge.id) {
        break
      }
      this.curve--
    }

    return this
  }

  /**
   * TODO - perf boost: render cheap version of things while still animating position or dragging
   */
  render() {
    const sourceContainer = this.renderer.nodesById[this.edge!.source],
      targetContainer = this.renderer.nodesById[this.edge!.target],
      sourceRadius = sourceContainer.radius + sourceContainer.strokeWidth,
      targetRadius = targetContainer.radius + targetContainer.strokeWidth,
      theta = angle(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y),
      start = movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceRadius),
      startArrowOffset = this.reverseArrow ?
        movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceRadius - ArrowRenderer.ARROW_HEIGHT) :
        start,
      end = movePoint(targetContainer.x, targetContainer.y, theta, targetRadius),
      endArrowOffset = this.forwardArrow ?
        movePoint(targetContainer.x, targetContainer.y, theta, targetRadius + ArrowRenderer.ARROW_HEIGHT) :
        end,
      center = midPoint(start[0], start[1], end[0], end[1])

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

    if (this.curve === 0) {
      /**
       * edge start/end is source/target node's center, offset by radius and, if rendered on edge source and/or target, arrow height
       * TODO - once arrows are encorporated into the style spec, add/remove arrowHeight offset
       */
      this.x0 = startArrowOffset[0]
      this.y0 = startArrowOffset[1]
      this.x1 = endArrowOffset[0]
      this.y1 = endArrowOffset[1]

      this.renderer.edgesGraphic
        .moveTo(this.x0, this.y0)
        .lineStyle(this.width, this.stroke, this.strokeOpacity)
        .lineTo(this.x1, this.y1)

      this.labelContainer.x = center[0]
      this.labelContainer.y = center[1]
      this.labelContainer.rotation = theta > HALF_PI && theta < THREE_HALF_PI ? theta - Math.PI : theta

      // TODO - don't bother rendering hitArea when animating position or dragging
      const hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS)
      const perpendicular = theta + HALF_PI
      const hitAreaVerticies: number[] = new Array(8)
      let point = movePoint(start[0], start[1], perpendicular, hoverRadius)
      hitAreaVerticies[0] = point[0]
      hitAreaVerticies[1] = point[1]
      point = movePoint(end[0], end[1], perpendicular, hoverRadius)
      hitAreaVerticies[2] = point[0]
      hitAreaVerticies[3] = point[1]
      point = movePoint(end[0], end[1], perpendicular, -hoverRadius)
      hitAreaVerticies[4] = point[0]
      hitAreaVerticies[5] = point[1]
      point = movePoint(start[0], start[1], perpendicular, -hoverRadius)
      hitAreaVerticies[6] = point[0]
      hitAreaVerticies[7] = point[1]
      this.line.hitArea = new PIXI.Polygon(hitAreaVerticies)
      // this.renderer.edgesGraphic.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.line.hitArea as any)
    } else {
      this.curvePeak = movePoint(center[0], center[1], theta > TWO_PI || theta < 0 ? theta - HALF_PI : theta + HALF_PI, this.curve * 20)
      const thetaCurveStart = angle(sourceContainer.x, sourceContainer.y, this.curvePeak[0], this.curvePeak[1])
      const thetaCurveEnd = angle(this.curvePeak[0], this.curvePeak[1], targetContainer.x, targetContainer.y)
      const curveStart = movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceRadius)
      const curveEnd = movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetRadius + ArrowRenderer.ARROW_HEIGHT)
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

      const hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS)
      const hitAreaVerticies: number[] = new Array(12)
      let point = movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, hoverRadius)
      hitAreaVerticies[0] = point[0]
      hitAreaVerticies[1] = point[1]
      point = movePoint(this.curvePeak[0], this.curvePeak[1], theta + HALF_PI, hoverRadius)
      hitAreaVerticies[2] = point[0]
      hitAreaVerticies[3] = point[1]
      point = movePoint(this.x1, this.y1, thetaCurveEnd + HALF_PI, hoverRadius)
      hitAreaVerticies[4] = point[0]
      hitAreaVerticies[5] = point[1]
      point = movePoint(this.x1, this.y1, theta + HALF_PI, -hoverRadius)
      hitAreaVerticies[6] = point[0]
      hitAreaVerticies[7] = point[1]
      point = movePoint(this.curvePeak[0], this.curvePeak[1], theta + HALF_PI, -hoverRadius)
      hitAreaVerticies[8] = point[0]
      hitAreaVerticies[9] = point[1]
      point = movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, -hoverRadius)
      hitAreaVerticies[10] = point[0]
      hitAreaVerticies[11] = point[1]
      this.line.hitArea = new PIXI.Polygon(hitAreaVerticies)
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
    if (this.label) {
      const edgeLength = length(this.x0, this.y0, this.x1, this.y1)
      const text = this.labelContainer.getChildAt(0) as PIXI.Text
      if (text.width > edgeLength) {
        text.visible = false
      } else {
        text.visible = true
      }
    }
  }

  delete() {
    // this.line.destroy()
    this.forwardArrow?.destroy()
    this.reverseArrow?.destroy()
    this.labelContainer.destroy()
    delete this.renderer.edgesById[this.edge!.id]
    this.renderer.forwardEdgeIndex[this.edge!.source][this.edge!.target].delete(this.edge!.id)
    this.renderer.reverseEdgeIndex[this.edge!.target][this.edge!.source].delete(this.edge!.id)
  }

  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (!this.hoveredEdge) {
      this.hoveredEdge = true
      this.renderer.dirty = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onEdgePointerEnter(event, this.edge!, x, y)
    }
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (this.hoveredEdge) {
      this.hoveredEdge = false
      this.renderer.dirty = true

      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onEdgePointerLeave(event, this.edge!, x, y)
    }
  }

  private pointerDown = (event: PIXI.InteractionEvent) => {
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onEdgePointerDown(event, this.edge!, x, y)
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onEdgePointerUp(event, this.edge!, x, y)
  }
}
