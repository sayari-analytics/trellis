import * as PIXI from 'pixi.js'
import { PositionedEdge } from '../..'
import { EdgeStyleSelector } from '../utils'
import { colorToNumber } from './utils'


const LINE_HOVER_RADIUS = 4


export class EdgeContainer {

  private edgeStyleSelector: EdgeStyleSelector
  private onUpdate: () => void
  private label?: string
  private width: number
  private stroke: number
  private strokeOpacity: number
  private labelContainer: PIXI.Container = new PIXI.Container()
  private hoverContainer: PIXI.Container = new PIXI.Container()
  private edgeGfx: PIXI.Graphics = new PIXI.Graphics()
  private edgeHoverBorder?: PIXI.Graphics
  private x0: number = 0
  private y0: number = 0
  private x1: number = 0
  private y1: number = 0

  constructor(edge: PositionedEdge, edgeStyleSelector: EdgeStyleSelector, edgeLayer: PIXI.Container, onUpdate: () => void) {
    this.onUpdate = onUpdate
    this.edgeStyleSelector = edgeStyleSelector
    this.width = this.edgeStyleSelector(edge, 'width')
    this.stroke = colorToNumber(this.edgeStyleSelector(edge, 'stroke'))
    this.strokeOpacity = this.edgeStyleSelector(edge, 'strokeOpacity')
    this.edgeGfx.interactive = true
    this.edgeGfx.buttonMode = true
    this.edgeGfx.on('mouseover', this.mouseEnter)
    this.edgeGfx.on('mouseout', this.mouseLeave)
    edgeLayer.addChild(this.edgeGfx)
    edgeLayer.addChild(this.hoverContainer)
    edgeLayer.addChild(this.labelContainer) // TODO - add labelsContainer to edgeLabelLayer
  }

  style = (edge: PositionedEdge) => {
    if (edge.label !== this.label) {
      this.label = edge.label

      if (edge.label) {
        const labelText = new PIXI.Text(edge.label, {
          fontFamily: 'Helvetica',
          fontSize: 10 * 2,
          fill: 0x444444,
          lineJoin: "round",
          stroke: "#fafafaee",
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

    this.width = this.edgeStyleSelector(edge, 'width')
    this.stroke = colorToNumber(this.edgeStyleSelector(edge, 'stroke'))
    this.strokeOpacity = this.edgeStyleSelector(edge, 'strokeOpacity')

    return this
  }

  move = (x0: number, y0: number, x1: number, y1: number) => {
    this.x0 = x0
    this.y0 = y0
    this.x1 = x1
    this.y1 = y1
    this.edgeGfx.clear()

    this.edgeGfx.lineStyle(this.width, this.stroke, this.strokeOpacity)

    this.edgeGfx.moveTo(x0, y0)
    this.edgeGfx.lineTo(x1, y1)
    this.edgeGfx.endFill()

    // TODO - fully outline line
    const hit = new PIXI.Polygon([
      x0 + LINE_HOVER_RADIUS, y0 + LINE_HOVER_RADIUS,
      x1 + LINE_HOVER_RADIUS, y1 + LINE_HOVER_RADIUS,
      x1 - LINE_HOVER_RADIUS, y1 - LINE_HOVER_RADIUS,
      x0 - LINE_HOVER_RADIUS, y0 - LINE_HOVER_RADIUS,
    ])

    this.edgeGfx.hitArea = hit
    // this.edgeGfx.drawPolygon(hit)

    this.labelContainer.position = new PIXI.Point(x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.5)
    const rotation = Math.atan2(y1 - y0, x1 - x0)
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
    const edgeLength = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2))
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
      this.edgeHoverBorder.lineStyle(this.width + 3, this.stroke, this.strokeOpacity)
  
      this.edgeHoverBorder.moveTo(this.x0, this.y0)
      this.edgeHoverBorder.lineTo(this.x1, this.y1)
      this.edgeHoverBorder.endFill()

      this.hoverContainer.addChild(this.edgeHoverBorder)
      this.onUpdate()
    }

    return this
  }

  private mouseLeave = () => {
    if (this.edgeHoverBorder !== undefined) {
      this.hoverContainer.removeChildren()
      this.edgeHoverBorder = undefined
      this.onUpdate()
    }

    return this
  }
}
