import * as PIXI from 'pixi.js'
import { NodeStyleSelector } from '../utils'
import { PositionedNode } from '../..'
import { colorToNumber } from './utils'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { Renderer } from '.'


const LABEL_Y_PADDING = 4
const ANIMATION_DURATION = 800


export class NodeContainer {

  node: PositionedNode
  radius: number = 0
  strokeWidth: number = 0
  x: number = 0
  y: number = 0

  private renderer: Renderer
  private nodeStyleSelector: NodeStyleSelector
  private startX: number = 0 // TODO - initialize prev position to position of a related node, or to avg position of all related nodes
  private startY: number = 0
  private endX: number = 0
  private endY: number = 0
  private interpolateX: (percent: number) => number = () => this.endX
  private interpolateY: (percent: number) => number = () => this.endY
  private label?: string
  private icon?: string
  private animationTime = 0
  private circleContainer = new PIXI.Container()
  private labelContainer = new PIXI.Container()
  private nodeGfx = new PIXI.Graphics()

  constructor(renderer: Renderer, node: PositionedNode, nodeStyleSelector: NodeStyleSelector, nodesLayer: PIXI.Container, labelLayer: PIXI.Container) {
    this.renderer = renderer
    this.node = node
    this.nodeStyleSelector = nodeStyleSelector
    this.circleContainer.name = node.id
    this.circleContainer.interactive = true
    this.circleContainer.buttonMode = true
    this.circleContainer.on('mouseover', this.nodeMouseOver)
      .on('mouseout', this.nodeMouseOut)
      .on('mousedown', this.nodeMouseDown)
      .on('mouseup', this.nodeMouseUp)
      .on('mouseupoutside', this.nodeMouseUp)
      .addChild(this.nodeGfx)

    nodesLayer.addChild(this.circleContainer)
    labelLayer.addChild(this.labelContainer)
  }

  set = (node: PositionedNode) => {
    /**
     * TODO - only interpolate movement if node is not being dragged
     */
    this.node = node
    this.startX = this.x
    this.startY = this.y

    this.endX = node.x!
    this.endY = node.y!

    const interpolateXNumber = interpolateNumber(this.startX, this.endX)
    const interpolateYNumber = interpolateNumber(this.startY, this.endY)
    this.interpolateX = interpolateBasis([interpolateXNumber(0), interpolateXNumber(0.1), interpolateXNumber(0.8), interpolateXNumber(0.95), interpolateXNumber(1)])
    this.interpolateY = interpolateBasis([interpolateYNumber(0), interpolateYNumber(0.1), interpolateYNumber(0.8), interpolateYNumber(0.95), interpolateYNumber(1)])
    this.animationTime = 0

    const radius = this.nodeStyleSelector(node, 'width') / 2
    if (radius !== this.radius) {
      this.radius = radius
      this.circleContainer.hitArea = new PIXI.Circle(0, 0, this.radius + 5)
    }

    this.strokeWidth = this.nodeStyleSelector(node, 'strokeWidth')

    this.nodeGfx
      .lineStyle(this.strokeWidth, colorToNumber(this.nodeStyleSelector(node, 'stroke')), this.nodeStyleSelector(node, 'strokeOpacity'), 1)
      .beginFill(colorToNumber(this.nodeStyleSelector(node, 'fill')), this.nodeStyleSelector(node, 'fillOpacity'))
      .drawCircle(0, 0, this.radius)

    if (node.label !== this.label) {
      this.label = node.label

      if (node.label) {
        const labelText = new PIXI.Text(node.label || '', {
          fontFamily: 'Helvetica',
          fontSize: 12 * 2,
          fill: 0x333333,
          lineJoin: 'round',
          stroke: '#fafafaee',
          strokeThickness: 2 * 2,
        })
        labelText.x = 0
        labelText.y = this.radius + this.strokeWidth + LABEL_Y_PADDING
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

  /**
   * TODO - animate should be renamed to render and take no arguments
   * deltaTime can be set as public property on renderer
   *
   * does animationTime need to be stored on all nodes?  isn't it global?
   *
   * perf boost: render cheap version of things while still animating position
   */
  render = (deltaTime: number) => {
    if (this.animationTime < ANIMATION_DURATION) {
      this.animationTime += deltaTime
      const percent = this.animationTime / ANIMATION_DURATION
      this.circleContainer.x = this.labelContainer.x = this.x = this.interpolateX(percent)
      this.circleContainer.y = this.labelContainer.y = this.y = this.interpolateY(percent)
    } else {
      this.circleContainer.x = this.labelContainer.x = this.x = this.endX
      this.circleContainer.y = this.labelContainer.y = this.y = this.endY
    }

    return this
  }

  delete = () => {
    this.circleContainer.destroy()
    this.labelContainer.destroy()
    delete this.renderer.nodesById[this.node.id]
  }

  animationIsPending = () => this.animationTime < ANIMATION_DURATION

  private nodeMouseOver = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) {
      this.renderer.hoveredNode = this.node.id

      this.renderer.nodesLayer.removeChild(this.circleContainer)
      this.renderer.labelsLayer.removeChild(this.labelContainer)
      this.renderer.frontNodeLayer.addChild(this.circleContainer)
      this.renderer.frontLabelLayer.addChild(this.labelContainer)

      /**
       * TODO - does it make more sense to update the existing circle's border, rather than render a new circle?
       */
      const hoverBorder = new PIXI.Graphics()
      hoverBorder.name = 'hoverBorder'
      hoverBorder.x = 0
      hoverBorder.y = 0
      hoverBorder.lineStyle(this.nodeStyleSelector(this.node, 'strokeWidth') * 1.5, 0xcccccc, 1, 1)
      hoverBorder.drawCircle(0, 0, this.nodeStyleSelector(this.node, 'width') * 0.5)
      this.circleContainer.addChild(hoverBorder)

      this.renderer.dirtyData = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onNodeMouseEnter && this.renderer.onNodeMouseEnter(this.node, { x, y })
    }
  }

  private nodeMouseOut = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined && this.renderer.hoveredNode === this.node.id) {
      this.renderer.hoveredNode = undefined

      for (const nodeGfx of this.renderer.frontNodeLayer.children) {
        this.renderer.frontNodeLayer.removeChild(nodeGfx);
        (nodeGfx as PIXI.Graphics).removeChild((nodeGfx as PIXI.Graphics).getChildByName('hoverBorder'))
        this.renderer.nodesLayer.addChild(nodeGfx)
      }

      for (const labelGfx of this.renderer.frontLabelLayer.children) {
        this.renderer.frontLabelLayer.removeChild(labelGfx)
        this.renderer.labelsLayer.addChild(labelGfx)
      }

      this.renderer.dirtyData = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onNodeMouseLeave && this.renderer.onNodeMouseLeave(this.node, { x, y })
    }
  }

  private nodeMouseDown = (event: PIXI.interaction.InteractionEvent) => {
    this.renderer.clickedNode = event.currentTarget.name
    this.renderer.app.renderer.plugins.interaction.on('mousemove', this.nodeMove)
    this.renderer.viewport.pause = true
    this.renderer.dirtyData = true
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodeMouseDown && this.renderer.onNodeMouseDown(this.node, { x, y })
  }

  private nodeMouseUp = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
      this.renderer.clickedNode = undefined
      this.renderer.app.renderer.plugins.interaction.off('mousemove', this.nodeMove)
      this.renderer.viewport.pause = false
      this.renderer.dirtyData = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onNodeMouseUp && this.renderer.onNodeMouseUp(this.node, { x, y })
    }
  }

  private nodeMove = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.circleContainer.x = x
      this.circleContainer.y = y
      this.startX = x
      this.startY = y
      this.endX = x
      this.endY = y
      this.labelContainer.position.x = x
      this.labelContainer.position.y = y
      this.animationTime = ANIMATION_DURATION
      this.renderer.dirtyData = true
      this.renderer.onNodeDrag && this.renderer.onNodeDrag(this.node, { x, y })
    }
  }
}
