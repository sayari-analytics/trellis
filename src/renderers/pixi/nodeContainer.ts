import * as PIXI from 'pixi.js'
import { NodeStyleSelector } from '../utils'
import { PositionedNode } from '../..'
import { colorToNumber } from './utils'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'


const LABEL_X_PADDING = 4
const LABEL_Y_PADDING = 2
const ANIMATION_DURATION = 800


export class NodeContainer extends PIXI.Container {

  labelContainer: PIXI.Container = new PIXI.Container()
  
  private nodeStyleSelector: NodeStyleSelector
  private startX: number = 0 // TODO - initialize prev position to position of a related node, or to avg position of all related nodes
  private startY: number = 0
  private endX: number = 0
  private endY: number = 0
  private interpolateX: (percent: number) => number = () => this.endX
  private interpolateY: (percent: number) => number = () => this.endY
  private radius: number
  private label?: string
  private animationTime: number = 0
  
  constructor(node: PositionedNode, nodeStyleSelector: NodeStyleSelector) {
    super()
    this.nodeStyleSelector = nodeStyleSelector
    this.radius = this.nodeStyleSelector(node, 'width') / 2
    this.name = node.id
    this.interactive = true
    this.buttonMode = true
    this.hitArea = new PIXI.Circle(0, 0, this.radius + 5)
    const circle = new PIXI.Graphics()
    circle.x = 0
    circle.y = 0
    circle.beginFill(colorToNumber(this.nodeStyleSelector(node, 'fill')))
    circle.alpha = this.nodeStyleSelector(node, 'fillOpacity')
    circle.drawCircle(0, 0, this.radius)
    this.addChild(circle)

    const circleBorder = new PIXI.Graphics()
    circle.x = 0
    circle.y = 0
    circleBorder.lineStyle(this.nodeStyleSelector(node, 'strokeWidth'), colorToNumber(this.nodeStyleSelector(node, 'stroke')))
    circleBorder.drawCircle(0, 0, this.radius)
    this.addChild(circleBorder)
  }

  updateStyle = (node: PositionedNode) => {
    this.radius = this.nodeStyleSelector(node, 'width') / 2

    if (node.label !== this.label) {
      this.label = node.label

      if (node.label) {
        const labelText = new PIXI.Text(node.label || '', {
          fontFamily: 'Helvetica',
          fontSize: 12 * 2,
          fill: 0x333333,
          lineJoin: "round",
          stroke: "#fafafaee",
          strokeThickness: 2 * 2,
        })
        labelText.x = 0
        labelText.y = this.radius + LABEL_Y_PADDING
        labelText.scale.set(0.5)
        labelText.anchor.set(0.5, 0)
        this.labelContainer.addChild(labelText)
      } else {
        this.labelContainer.removeChildren()
      }
    }

    return this
  }

  updatePosition = (x: number, y: number) => {
    /**
     * TODO - simplify interface by combining updatePosition and move and only interpolate movement if node is not being dragged
     */
    this.startX = this.x
    this.startY = this.y

    this.endX = x
    this.endY = y

    const interpolateXNumber = interpolateNumber(this.startX, this.endX)
    const interpolateYNumber = interpolateNumber(this.startY, this.endY)
    this.interpolateX = interpolateBasis([interpolateXNumber(0), interpolateXNumber(0.1), interpolateXNumber(0.8), interpolateXNumber(0.95), interpolateXNumber(1)])
    this.interpolateY = interpolateBasis([interpolateYNumber(0), interpolateYNumber(0.1), interpolateYNumber(0.8), interpolateYNumber(0.95), interpolateYNumber(1)])
    this.animationTime = 0

    return this
  }

  animate = (deltaTime: number) => {
    if (this.animationTime < ANIMATION_DURATION) {
      this.animationTime += deltaTime
      const percent = this.animationTime / ANIMATION_DURATION
      this.x = this.interpolateX(percent)
      this.y = this.interpolateY(percent)
    } else {
      this.x = this.endX
      this.y = this.endY
    }

    this.labelContainer.position.x = this.x
    this.labelContainer.position.y = this.y

    return this
  }

  move = (x: number, y: number) => {
    this.x = x
    this.y = y
    this.startX = x
    this.startY = y
    this.endX = x
    this.endY = y
    this.labelContainer.position.x = x
    this.labelContainer.position.y = y
    this.animationTime = ANIMATION_DURATION
    return this
  }

  animationIsPending = () => this.animationTime < ANIMATION_DURATION

}
