import * as PIXI from 'pixi.js'
import { PositionedEdge } from '../..'
import { EdgeStyleSelector } from '../utils'
import { colorToNumber } from './utils'


// const LINE_HOVER_RADIUS = 4

export class EdgeContainer extends PIXI.Container {

  labelContainer: PIXI.Container = new PIXI.Container()

  private edgeStyleSelector: EdgeStyleSelector
  private label?: string
  private edgeGfx: PIXI.Graphics = new PIXI.Graphics()
  // private edgeHoverBorder?: PIXI.Graphics
  // private x0: number = 0
  // private y0: number = 0
  // private x1: number = 0
  // private y1: number = 0

  constructor(edge: PositionedEdge, edgeStyleSelector: EdgeStyleSelector) {
    super()
    this.edgeStyleSelector = edgeStyleSelector
    this.interactive = true
    this.buttonMode = true
    // this.on('mouseover', this.mouseEnter)
    // this.on('mouseout', this.mouseLeave)
    this.addChild(this.edgeGfx)
  }

  updateStyle = (edge: PositionedEdge) => {
    if (edge.label !== this.label) {
      this.label = edge.label

      if (edge.label) {
        const labelText = new PIXI.Text(edge.label || '', {
          fontFamily: 'Helvetica',
          fontSize: 10 * 2,
          fill: 0x444444,
          lineJoin: "round",
          stroke: "#fafafaee",
          strokeThickness: 2 * 2,
        })
        labelText.name = 'text'
        labelText.scale.set(0.5)
        labelText.anchor.set(0.5, 0.5)
        this.labelContainer.addChild(labelText)
      } else {
        this.labelContainer.removeChildren()
      }
    }

    return this
  }

  updatePosition = (edge: PositionedEdge, x0: number, y0: number, x1: number, y1: number) => {
    // this.x0 = x0
    // this.y0 = y0
    // this.x1 = x1
    // this.y1 = y1
    this.edgeGfx.clear()

    this.edgeGfx.lineStyle(
      this.edgeStyleSelector(edge, 'width'),
      colorToNumber(this.edgeStyleSelector(edge, 'stroke')),
      this.edgeStyleSelector(edge, 'strokeOpacity')
    )

    this.edgeGfx.moveTo(x0, y0)
    this.edgeGfx.lineTo(x1, y1)
    this.edgeGfx.endFill()

    // TODO - fully outline line
    // const hit = new PIXI.Polygon([
    //   x0 + LINE_HOVER_RADIUS, y0 + LINE_HOVER_RADIUS,
    //   x1 + LINE_HOVER_RADIUS, y1 + LINE_HOVER_RADIUS,
    //   x1 - LINE_HOVER_RADIUS, y1 - LINE_HOVER_RADIUS,
    //   x0 - LINE_HOVER_RADIUS, y0 - LINE_HOVER_RADIUS,
    // ])

    // const leftX = Math.min(x0, x1)
    // const rightX = Math.max(x0, x1)
    // const bottomY = Math.min(y0, y1)
    // const topY = Math.max(y0, y1)
    // const hit = new PIXI.Polygon([
    //   leftX - LINE_HOVER_RADIUS, bottomY - LINE_HOVER_RADIUS,
    //   rightX + LINE_HOVER_RADIUS, topY - LINE_HOVER_RADIUS,
    //   rightX + LINE_HOVER_RADIUS, topY + LINE_HOVER_RADIUS,
    //   leftX - LINE_HOVER_RADIUS, bottomY + LINE_HOVER_RADIUS,
    // ])

    // this.hitArea = hit
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

    const text = this.labelContainer.getChildByName('text') as PIXI.Text
    // this.labelContainer.visible = false
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
    if (text.width > edgeLength) {
      text.visible = false
    } else {
      text.visible = true
    }

    return this
  }

  // mouseEnter = (edge: PositionedEdge) => {
  //   if (this.edgeHoverBorder === undefined) {
  //     console.log('hover')
  //     this.edgeHoverBorder = new PIXI.Graphics()
  //     this.edgeHoverBorder.lineStyle(
  //       this.edgeStyleSelector(edge, 'width') + 5,
  //       colorToNumber('#222'), //colorToNumber(this.edgeStyleSelector(edge, 'stroke')),
  //       1 // this.edgeStyleSelector(edge, 'strokeOpacity')
  //     )
  
  //     this.edgeGfx.moveTo(this.x0, this.y0)
  //     this.edgeGfx.lineTo(this.x1, this.y1)
  //     this.edgeGfx.endFill()
      
  //     // this.addChild(this.edgeHoverBorder)
  //     this.layer.addChild(this.edgeHoverBorder)
  //   }

  //   return this
  // }

  // mouseLeave = () => {
  //   if (this.edgeHoverBorder !== undefined) {
  //     console.log('unhover')
  //     this.layer.removeChild(this.edgeHoverBorder)
  //     this.edgeHoverBorder.destroy()
  //     this.edgeHoverBorder = undefined
  //   }

  //   return this
  // }
}
