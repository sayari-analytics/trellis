import * as PIXI from 'pixi.js'
import { PositionedEdge } from '../..'
import { EdgeStyleSelector } from '../utils'
import { colorToNumber } from './utils'
import { Renderer } from '.'
import { NodeContainer } from './nodeContainer'


const LINE_HOVER_RADIUS = 4


const movePoint = (x: number, y: number, angle: number, distance: number) => [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]


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

    const arrowWidth = 10
    const arrowHeight = 20
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

    this.arrow.beginFill(colorToNumber(
      this.edgeStyleSelector(this.edge, 'stroke')), this.edgeStyleSelector(this.edge, 'strokeOpacity')
    )
    this.width = this.edgeStyleSelector(edge, 'width')
    this.stroke = colorToNumber(this.edgeStyleSelector(edge, 'stroke'))
    this.strokeOpacity = this.edgeStyleSelector(edge, 'strokeOpacity')

    return this
  }

  animate = (source: NodeContainer, target: NodeContainer) => {
    this.x0 = source.circleContainer.x
    this.y0 = source.circleContainer.y
    this.x1 = target.circleContainer.x
    this.y1 = target.circleContainer.y
    this.edgeGfx.clear()

    this.edgeGfx.lineStyle(this.width, this.stroke, this.strokeOpacity)

    this.edgeGfx.moveTo(this.x0, this.y0)
    this.edgeGfx.lineTo(this.x1, this.y1)
    this.edgeGfx.endFill()

    const angle = Math.atan2(this.y1 - this.y0, this.x1 - this.x0)
    // const [arrowX, arrowY] = movePoint(this.x0, this.y0, angle, target.radius + target.strokeWidth) // TODO - why does adding strokeWidth throw things off?
    const [arrowX, arrowY] = movePoint(this.x0, this.y0, angle, target.radius)
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
    const rotation = Math.atan2(this.y1 - this.y0, this.x1 - this.x0)
    if (rotation > (Math.PI / 2)) {
      this.labelContainer.rotation = rotation - Math.PI
    } else if (rotation < (Math.PI / 2) * -1) {
      this.labelContainer.rotation = rotation + Math.PI
    } else {
      this.labelContainer.rotation = rotation
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
