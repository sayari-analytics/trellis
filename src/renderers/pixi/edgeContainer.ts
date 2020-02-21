import * as PIXI from 'pixi.js'
import { PositionedEdge } from '../..'
import { EdgeStyleSelector } from '../utils'
import { colorToNumber } from './utils'
import { Renderer } from '.'
import { NodeContainer } from './nodeContainer'


const LINE_HOVER_RADIUS = 4


const movePoint = (x: number, y: number, angle: number, distance: number): [number, number] => [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]

const midPoint = (x0: number, y0: number, x1: number, y1: number): [number, number] => [(x0 + x1) / 2, (y0 + y1) / 2]

const HALF_PI = Math.PI / 2
const TWO_PI = Math.PI * 2
const THREE_HALF_PI = HALF_PI * 3


export class EdgeContainer {

  edge: PositionedEdge
  labelContainer: PIXI.Container = new PIXI.Container()
  hoverContainer: PIXI.Container = new PIXI.Container()

  private renderer: Renderer
  private edgeStyleSelector: EdgeStyleSelector
  private label?: string
  private width: number
  private stroke: number
  private strokeOpacity: number
  private edgeGfx: PIXI.Graphics = new PIXI.Graphics()
  private arrow = new PIXI.Graphics()
  private edgeHoverBorder?: PIXI.Graphics
  private x0: number = 0
  private y0: number = 0
  private x1: number = 0
  private y1: number = 0
  private curve: number = 0

  constructor(renderer: Renderer, edge: PositionedEdge, edgeStyleSelector: EdgeStyleSelector, edgeLayer: PIXI.Container) {
    this.edge = edge
    this.renderer = renderer
    this.edgeStyleSelector = edgeStyleSelector
    this.width = this.edgeStyleSelector(edge, 'width')
    this.stroke = colorToNumber(this.edgeStyleSelector(edge, 'stroke'))
    this.strokeOpacity = this.edgeStyleSelector(edge, 'strokeOpacity')
    this.edgeGfx.interactive = true
    this.edgeGfx.buttonMode = true
    this.edgeGfx.on('mouseover', this.mouseEnter)
    this.edgeGfx.on('mouseout', this.mouseLeave)

    const arrowWidth = 8
    const arrowHeight = 16
    this.arrow = new PIXI.Graphics()
    this.arrow.beginFill(colorToNumber(this.edgeStyleSelector(this.edge, 'stroke')), this.edgeStyleSelector(this.edge, 'strokeOpacity'))
    this.arrow.moveTo(0, 0)
    this.arrow.lineTo(arrowHeight, arrowWidth / 2)
    this.arrow.lineTo(arrowHeight, - arrowWidth / 2)

    edgeLayer.addChild(this.edgeGfx)
    edgeLayer.addChild(this.arrow)
    edgeLayer.addChild(this.hoverContainer)
    edgeLayer.addChild(this.labelContainer) // TODO - add labelsContainer to edgeLabelLayer
  }

  set = (edge: PositionedEdge) => {
    this.edge = edge
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
     * calculate edge curve
     *
     * TODO - expose edge curve in style spec
     */
    const [min, max] = [this.edge.source.id, this.edge.target.id].sort()
    // this.curve = Array.from(this.renderer.edgeGroups[min][max])
    //   .sort()
    //   .indexOf(this.edge.id) - ((this.renderer.edgeGroups[min][max].size - 1) / 2)
    this.curve = (this.renderer.edgeGroups[min][max].size - 1) / 2
    for (const edgeId of this.renderer.edgeGroups[min][max]) {
      if (edgeId === this.edge.id) {
        break
      }
      this.curve--
    }

    this.arrow.beginFill(
      colorToNumber(this.edgeStyleSelector(this.edge, 'stroke')),
      this.edgeStyleSelector(this.edge, 'strokeOpacity')
    )
    this.width = this.edgeStyleSelector(edge, 'width')
    this.stroke = colorToNumber(this.edgeStyleSelector(edge, 'stroke'))
    this.strokeOpacity = this.edgeStyleSelector(edge, 'strokeOpacity')

    return this
  }

  /**
   * TODO - don't need to pass source/target here.  can be inferred from set step
   * animate should be renamed to render and take no arguments.
   */
  animate = (source: NodeContainer, target: NodeContainer) => {
    this.x0 = source.x
    this.y0 = source.y
    this.x1 = target.x
    this.y1 = target.y
    const angle = (Math.atan2(this.y0 - this.y1, this.x0 - this.x1) + TWO_PI) % TWO_PI
    // let angle = Math.atan2(this.y0 - this.y1, this.x0 - this.x1)
    // angle = angle - (TWO_PI * Math.floor((angle + Math.PI) / TWO_PI))

    /**
     * render edge line
     *
     * TODO - properly position arrow
     * properly position hit poly
     */
    this.edgeGfx.clear()
    this.edgeGfx.lineStyle(this.width, this.stroke, this.strokeOpacity)
    this.edgeGfx.moveTo(this.x0, this.y0)

    if (this.curve === 0) {
      this.edgeGfx.lineTo(this.x1, this.y1)
    } else {
      const [midX, midY] = midPoint(this.x0, this.y0, this.x1, this.y1)
      const [controlX, controlY] = movePoint(midX, midY, angle > Math.PI || angle < -Math.PI ? angle + HALF_PI : angle - HALF_PI, this.curve * 50)
      this.edgeGfx.bezierCurveTo(this.x0, this.y0, controlX, controlY, this.x1, this.y1)
    }

    this.edgeGfx.endFill()

    /**
     * render edge direction arrows
     * TODO - when drawing edge arrow, terminate line at base of arrow
     *        when not drawing edge arrow, terminate line at node border
     */
    const [arrowX, arrowY] = movePoint(this.x1, this.y1, angle, target.radius)
    this.arrow.x = arrowX
    this.arrow.y = arrowY
    this.arrow.rotation = angle

    // TODO - fully outline line
    const hit = new PIXI.Polygon([
      this.x0 + LINE_HOVER_RADIUS, this.y0 + LINE_HOVER_RADIUS,
      this.x1 + LINE_HOVER_RADIUS, this.y1 + LINE_HOVER_RADIUS,
      this.x1 - LINE_HOVER_RADIUS, this.y1 - LINE_HOVER_RADIUS,
      this.x0 - LINE_HOVER_RADIUS, this.y0 - LINE_HOVER_RADIUS,
    ])

    this.edgeGfx.hitArea = hit
    // this.edgeGfx.drawPolygon(hit)

    this.labelContainer.x = this.x0 + (this.x1 - this.x0) * 0.5
    this.labelContainer.y = this.y0 + (this.y1 - this.y0) * 0.5
    this.labelContainer.rotation = angle > HALF_PI && angle < THREE_HALF_PI ? angle - Math.PI : angle

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
    // const edgeLength = Math.sqrt(Math.pow(xEnd - xStart, 2) + Math.pow(yEnd - yStart, 2)) -
    //   (this.nodeStyleSelector(edge.source, 'width') / 2) -
    //   (this.nodeStyleSelector(edge.target, 'width') / 2) -
    //   (LABEL_X_PADDING * 2)
    const edgeLength = Math.sqrt(Math.pow(this.x1 - this.x0, 2) + Math.pow(this.y1 - this.y0, 2))
    const text = this.labelContainer.getChildAt(0) as PIXI.Text
    if (text.width > edgeLength) {
      text.visible = false
    } else {
      text.visible = true
    }

    return this
  }

  delete = () => {
    this.edgeGfx.destroy()
    this.arrow.destroy()
    this.hoverContainer.destroy()
    this.labelContainer.destroy()
    delete this.renderer.edgesById[this.edge.id]
    this.renderer.edgeGroups[this.edge.source.id][this.edge.target.id].delete(this.edge.id)
  }

  private mouseEnter = () => {
    if (this.edgeHoverBorder === undefined) {
      /**
       * TODO - does it make more sense to create the graphic on the fly, or create on init and add/remove from container
       */
      this.edgeHoverBorder = new PIXI.Graphics()
      this.edgeHoverBorder.lineStyle(this.width + 2, this.stroke, this.strokeOpacity)

      this.edgeHoverBorder.moveTo(this.x0, this.y0)
      this.edgeHoverBorder.lineTo(this.x1, this.y1)
      this.edgeHoverBorder.endFill()

      this.hoverContainer.addChild(this.edgeHoverBorder)
      this.renderer.dirtyData = true
    }

    return this
  }

  private mouseLeave = () => {
    if (this.edgeHoverBorder !== undefined) {
      this.hoverContainer.removeChildren()
      this.edgeHoverBorder = undefined
      this.renderer.dirtyData = true
    }

    return this
  }
}
