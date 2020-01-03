import * as PIXI from 'pixi.js'
import { NodeStyleSelector } from '../utils'
import { PositionedNode } from '../..'
import { colorToNumber } from './utils'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { Renderer } from '.'


const LABEL_X_PADDING = 4
const LABEL_Y_PADDING = 2
const ANIMATION_DURATION = 800


export class NodeContainer {

  labelContainer: PIXI.Container = new PIXI.Container()
  circleContainer: PIXI.Container = new PIXI.Container()
  node: PositionedNode

  private renderer: Renderer
  private nodeStyleSelector: NodeStyleSelector
  private startX: number = 0 // TODO - initialize prev position to position of a related node, or to avg position of all related nodes
  private startY: number = 0
  private endX: number = 0
  private endY: number = 0
  private interpolateX: (percent: number) => number = () => this.endX
  private interpolateY: (percent: number) => number = () => this.endY
  private radius: number
  private label?: string
  private icon?: string
  private animationTime: number = 0
  
  constructor(renderer: Renderer, node: PositionedNode, nodeStyleSelector: NodeStyleSelector, nodesLayer: PIXI.Container, labelLayer: PIXI.Container) {
    this.renderer = renderer
    this.node = node
    this.nodeStyleSelector = nodeStyleSelector
    this.radius = this.nodeStyleSelector(node, 'width') / 2
    this.circleContainer.name = node.id
    this.circleContainer.interactive = true
    this.circleContainer.buttonMode = true
    this.circleContainer.hitArea = new PIXI.Circle(0, 0, this.radius + 5)
    // this.circleContainer.on('mouseover', this.nodeMouseOver)
    // this.circleContainer.on('mouseout', this.nodeMouseOut)
    // this.circleContainer.on('mousedown', this.nodeMouseDown)
    // this.circleContainer.on('mouseup', this.nodeMouseUp)
    // this.circleContainer.on('mouseupoutside', this.nodeMouseUp)

    const circle = new PIXI.Graphics()
    circle.x = 0
    circle.y = 0
    circle.beginFill(colorToNumber(this.nodeStyleSelector(node, 'fill')))
    circle.alpha = this.nodeStyleSelector(node, 'fillOpacity')
    circle.drawCircle(0, 0, this.radius)
    
    const circleBorder = new PIXI.Graphics()
    circle.x = 0
    circle.y = 0
    circleBorder.lineStyle(this.nodeStyleSelector(node, 'strokeWidth'), colorToNumber(this.nodeStyleSelector(node, 'stroke')))
    circleBorder.drawCircle(0, 0, this.radius)

    this.circleContainer.addChild(circle)
    this.circleContainer.addChild(circleBorder)

    nodesLayer.addChild(this.circleContainer)
    labelLayer.addChild(this.labelContainer)
  }

  style = (node: PositionedNode) => {
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

    if (node.style && node.style.icon !== this.icon) {
      this.icon = node.style.icon

      if (node.style.icon) {
        const icon = new PIXI.Text(node.style.icon, {
          fontFamily: 'Material Icons',
          fontSize: this.radius / Math.SQRT2 * 1.7,
          fill: 0xffffff
        })
        icon.name = 'icon'
        icon.x = 0
        icon.y = 0
        icon.anchor.set(0.5)
    
        this.circleContainer.addChild(icon)
      } else {
        this.circleContainer.removeChild(this.circleContainer.getChildByName('icon'))
      }
    }

    return this
  }

  position = (x: number, y: number) => {
    /**
     * TODO - simplify interface by combining updatePosition and move and only interpolate movement if node is not being dragged
     */
    this.startX = this.circleContainer.x
    this.startY = this.circleContainer.y

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
      this.circleContainer.x = this.interpolateX(percent)
      this.circleContainer.y = this.interpolateY(percent)
    } else {
      this.circleContainer.x = this.endX
      this.circleContainer.y = this.endY
    }

    this.labelContainer.position.x = this.circleContainer.x
    this.labelContainer.position.y = this.circleContainer.y

    return this
  }

  move = (x: number, y: number) => {
    this.circleContainer.x = x
    this.circleContainer.y = y
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
