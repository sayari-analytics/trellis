import * as PIXI from 'pixi.js'
import { PositionedEdge } from '../..'
import { EdgeStyleSelector } from '../utils'
import { colorToNumber } from './utils'
import { Renderer } from '.'


const movePoint = (x: number, y: number, angle: number, distance: number): [number, number] => [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]

const midPoint = (x0: number, y0: number, x1: number, y1: number): [number, number] => [(x0 + x1) / 2, (y0 + y1) / 2]

const length = (x0: number, y0: number, x1: number, y1: number) => Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2))

const angle = (x0: number, y0: number, x1: number, y1: number) => Math.atan2(y0 - y1, x0 - x1)

const HALF_PI = Math.PI / 2
const TWO_PI = Math.PI * 2
const THREE_HALF_PI = HALF_PI * 3
const LINE_HOVER_RADIUS = 4
const ARROW_HEIGHT = 16
const ARROW_WIDTH = 8


export class EdgeContainer {

  edge: PositionedEdge = { id: '', source: { id: '' }, target: { id: '' } }
  labelContainer: PIXI.Container = new PIXI.Container()
  hoverContainer: PIXI.Container = new PIXI.Container()

  private renderer: Renderer
  private edgeStyleSelector: EdgeStyleSelector
  private label?: string
  private width: number = 0
  private stroke: number = 0
  private strokeOpacity: number = 0
  private edgeGfx: PIXI.Graphics = new PIXI.Graphics()
  private arrow = new PIXI.Graphics()
  private edgeHoverBorder?: PIXI.Graphics
  private x0: number = 0
  private y0: number = 0
  private x1: number = 0
  private y1: number = 0
  private curvePeak?: [number, number]
  private curveControlPointA?: [number, number]
  private curveControlPointB?: [number, number]
  private curve: number = 0

  constructor(renderer: Renderer, edgeStyleSelector: EdgeStyleSelector, edgeLayer: PIXI.Container) {
    this.renderer = renderer
    this.edgeStyleSelector = edgeStyleSelector
    this.edgeGfx.interactive = true
    this.edgeGfx.buttonMode = true
    this.edgeGfx
      .on('mouseover', this.mouseEnter)
      .on('mouseout', this.mouseLeave)

    edgeLayer.addChild(this.edgeGfx)
    edgeLayer.addChild(this.arrow)
    edgeLayer.addChild(this.hoverContainer)
    edgeLayer.addChild(this.labelContainer) // TODO - add labelsContainer to edgeLabelLayer
  }

  set = (edge: PositionedEdge) => {
    this.edge = edge

    this.width = this.edgeStyleSelector(edge, 'width')
    this.stroke = colorToNumber(this.edgeStyleSelector(edge, 'stroke'))
    this.strokeOpacity = this.edgeStyleSelector(edge, 'strokeOpacity')

    if (edge.label !== this.label) {
      this.label = edge.label

      if (edge.label) {
        const labelText = new PIXI.Text(edge.label, {
          fontFamily: 'Helvetica',
          fontSize: 10 * 2,
          fill: 0x444444,
          lineJoin: 'round',
          stroke: '#fafafaee',
          strokeThickness: 2 * 2,
        })
        labelText.name = 'text'
        labelText.scale.set(0.5)
        labelText.anchor.set(0.5, 0.6)
        this.labelContainer.addChild(labelText)
      } else {
        this.labelContainer.removeChildren()
      }
    }

    /**
     * TODO - expose edge curve in style spec
     */
    const [min, max] = [this.edge.source.id, this.edge.target.id].sort()
    this.curve = (this.renderer.edgeGroups[min][max].size - 1) / 2
    for (const edgeId of this.renderer.edgeGroups[min][max]) {
      if (edgeId === this.edge.id) {
        break
      }
      this.curve--
    }

    this.arrow
      .beginFill(this.stroke, this.strokeOpacity)
      .lineTo(ARROW_HEIGHT, ARROW_WIDTH / 2)
      .lineTo(ARROW_HEIGHT, - ARROW_WIDTH / 2)

    return this
  }

  /**
   * TODO - perf boost: render cheap version of things while still animating position
   */
  render = () => {
    if (this.curve === 0) {
      const sourceContainer = this.renderer.nodesById[this.edge.source.id]
      const targetContainer = this.renderer.nodesById[this.edge.target.id]
      const theta = angle(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y)
      /**
       * edge start/end is source/target node's center, offset by radius and, if rendered on edge source and/or target, arrow height
       * TODO - once arrows are encorporated into the style spec, add/remove arrowHeight offset
       */
      const start = movePoint(sourceContainer.x, sourceContainer.y, theta, -sourceContainer.radius)
      const end = movePoint(targetContainer.x, targetContainer.y, theta, targetContainer.radius + ARROW_HEIGHT)
      this.x0 = start[0]
      this.y0 = start[1]
      this.x1 = end[0]
      this.y1 = end[1]

      this.edgeGfx
        .clear()
        .lineStyle(this.width, this.stroke, this.strokeOpacity)
        .moveTo(this.x0, this.y0)
        .lineTo(this.x1, this.y1)
        .endFill()

      const center = midPoint(this.x0, this.y0, this.x1, this.y1)
      this.labelContainer.x = center[0]
      this.labelContainer.y = center[1]
      this.labelContainer.rotation = theta > HALF_PI && theta < THREE_HALF_PI ? theta - Math.PI : theta

      // TODO - don't bother rendering arrow when animating position
      const arrowPosition = movePoint(targetContainer.x, targetContainer.y, theta, targetContainer.radius)
      this.arrow.x = arrowPosition[0]
      this.arrow.y = arrowPosition[1]
      this.arrow.rotation = theta

      // TODO - don't bother rendering hitArea when animating position
      const hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS)
      const perpendicular = theta + HALF_PI
      const hitAreaVerticies: number[] = []
      hitAreaVerticies.push(...movePoint(this.x0, this.y0, perpendicular, hoverRadius))
      hitAreaVerticies.push(...movePoint(arrowPosition[0], arrowPosition[1], perpendicular, hoverRadius))
      hitAreaVerticies.push(...movePoint(arrowPosition[0], arrowPosition[1], perpendicular, -hoverRadius))
      hitAreaVerticies.push(...movePoint(this.x0, this.y0, perpendicular, -hoverRadius))
      this.edgeGfx.hitArea = new PIXI.Polygon(hitAreaVerticies)
      // this.edgeGfx.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.edgeGfx.hitArea as any)
    } else {
      const sourceContainer = this.renderer.nodesById[this.edge.source.id]
      const targetContainer = this.renderer.nodesById[this.edge.target.id]
      const center = midPoint(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y)
      const thetaUncurved = angle(sourceContainer.x, sourceContainer.y, targetContainer.x, targetContainer.y)
      this.curvePeak = movePoint(center[0], center[1], thetaUncurved > TWO_PI || thetaUncurved < 0 ? thetaUncurved - HALF_PI : thetaUncurved + HALF_PI, this.curve * 20)
      const thetaCurveStart = angle(sourceContainer.x, sourceContainer.y, this.curvePeak[0], this.curvePeak[1])
      const thetaCurveEnd = angle(this.curvePeak[0], this.curvePeak[1], targetContainer.x, targetContainer.y)
      const start = movePoint(sourceContainer.x, sourceContainer.y, thetaCurveStart, -sourceContainer.radius)
      const end = movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetContainer.radius + ARROW_HEIGHT)
      this.x0 = start[0]
      this.y0 = start[1]
      this.x1 = end[0]
      this.y1 = end[1]

      const edgeLength = length(this.x0, this.y0, this.x1, this.y1)
      this.curveControlPointA = movePoint(this.curvePeak[0], this.curvePeak[1], thetaUncurved, edgeLength / 4)
      this.curveControlPointB = movePoint(this.curvePeak[0], this.curvePeak[1], thetaUncurved, edgeLength / -4)

      this.edgeGfx
        .clear()
        .lineStyle(this.width, this.stroke, this.strokeOpacity)
        .moveTo(this.x0, this.y0)
        .bezierCurveTo(this.x0, this.y0, this.curveControlPointA[0], this.curveControlPointA[1], this.curvePeak[0], this.curvePeak[1])
        .bezierCurveTo(this.curveControlPointB[0], this.curveControlPointB[1], this.x1, this.y1, this.x1, this.y1)
        .endFill()

      this.labelContainer.x = this.curvePeak[0]
      this.labelContainer.y = this.curvePeak[1]
      this.labelContainer.rotation = thetaUncurved > HALF_PI && thetaUncurved < THREE_HALF_PI ? thetaUncurved - Math.PI : thetaUncurved

      const arrowPosition = movePoint(targetContainer.x, targetContainer.y, thetaCurveEnd, targetContainer.radius)
      this.arrow.x = arrowPosition[0]
      this.arrow.y = arrowPosition[1]
      this.arrow.rotation = thetaCurveEnd

      const hoverRadius = Math.max(this.width, LINE_HOVER_RADIUS)
      const hitAreaVerticies: number[] = []
      hitAreaVerticies.push(...movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, hoverRadius))
      hitAreaVerticies.push(...movePoint(this.curvePeak[0], this.curvePeak[1], thetaUncurved + HALF_PI, hoverRadius))
      hitAreaVerticies.push(...movePoint(arrowPosition[0], arrowPosition[1], thetaCurveEnd + HALF_PI, hoverRadius))
      hitAreaVerticies.push(...movePoint(arrowPosition[0], arrowPosition[1], thetaUncurved + HALF_PI, -hoverRadius))
      hitAreaVerticies.push(...movePoint(this.curvePeak[0], this.curvePeak[1], thetaUncurved + HALF_PI, -hoverRadius))
      hitAreaVerticies.push(...movePoint(this.x0, this.y0, thetaCurveStart + HALF_PI, -hoverRadius))
      this.edgeGfx.hitArea = new PIXI.Polygon(hitAreaVerticies)
      // this.edgeGfx.lineStyle(1, 0xff0000, 0.5).drawPolygon(this.edgeGfx.hitArea as any)
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

  delete = () => {
    this.edgeGfx.destroy()
    this.arrow.destroy()
    this.hoverContainer.destroy()
    this.labelContainer.destroy()
    delete this.renderer.edgesById[this.edge.id]
    const [min, max] = [this.edge.source.id, this.edge.target.id].sort()
    this.renderer.edgeGroups[min][max].delete(this.edge.id)
  }

  private mouseEnter = () => {
    if (this.edgeHoverBorder === undefined) {
      /**
       * TODO - does it make more sense to create the graphic on the fly, or create on init and add/remove from container
       */
      if (this.curve === 0 || this.curveControlPointA === undefined || this.curveControlPointB === undefined || this.curvePeak === undefined) {
        this.edgeHoverBorder = new PIXI.Graphics()
          .lineStyle(this.width + 2, this.stroke, this.strokeOpacity)
          .moveTo(this.x0, this.y0)
          .lineTo(this.x1, this.y1)
          .endFill()
      } else {
        this.edgeHoverBorder = new PIXI.Graphics()
          .lineStyle(this.width + 2, this.stroke, this.strokeOpacity)
          .moveTo(this.x0, this.y0)
          .bezierCurveTo(this.x0, this.y0, this.curveControlPointA[0], this.curveControlPointA[1], this.curvePeak[0], this.curvePeak[1])
          .bezierCurveTo(this.curveControlPointB[0], this.curveControlPointB[1], this.x1, this.y1, this.x1, this.y1)
          .endFill()
      }

      this.hoverContainer.addChild(this.edgeHoverBorder)
      this.renderer.dirty = true
    }

    return this
  }

  private mouseLeave = () => {
    if (this.edgeHoverBorder !== undefined) {
      this.hoverContainer.removeChildren()
      this.edgeHoverBorder = undefined
      this.renderer.dirty = true
    }

    return this
  }
}
