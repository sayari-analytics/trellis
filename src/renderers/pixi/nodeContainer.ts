import * as PIXI from 'pixi.js'
import { NodeStyleSelector } from '../utils'
import { PositionedNode } from '../..'
import { colorToNumber } from './utils'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { Renderer, POSITION_ANIMATION_DURATION } from '.'


const LABEL_Y_PADDING = 4


export class NodeContainer {

  node: PositionedNode
  radius = -1
  strokeWidth = 0
  stroke = 0
  strokeOpacity = 0
  fill = 0
  fillOpacity = 0
  x = 0
  y = 0

  private renderer: Renderer
  private nodeStyleSelector: NodeStyleSelector
  private startX = 0 // TODO - initialize prev position to position of a related node, or to avg position of all related nodes
  private startY = 0
  private startRadius = 0
  private endX = 0
  private endY = 0
  private endRadius = 0
  private interpolateX: (percent: number) => number = () => this.endX
  private interpolateY: (percent: number) => number = () => this.endY
  private interpolateRadius: (percent: number) => number = () => this.endRadius
  private label?: string
  private icon?: string
  private circleContainer = new PIXI.Container()
  private labelContainer = new PIXI.Container()
  private nodeGfx = new PIXI.Graphics()
  private labelSprite?: PIXI.Text

  constructor(renderer: Renderer, node: PositionedNode, nodeStyleSelector: NodeStyleSelector, nodesLayer: PIXI.Container, labelLayer: PIXI.Container) {
    this.renderer = renderer
    this.node = node
    this.nodeStyleSelector = nodeStyleSelector
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
    /**
     * TODO - if node position is currently being interpolated, instead of reinterpolating from 0 velocity, smooth interpolation change
     */
    if (this.startX !== this.endX) {
      const interpolateXNumber = interpolateNumber(this.startX, this.endX)
      this.interpolateX = interpolateBasis([this.startX, interpolateXNumber(0.1), interpolateXNumber(0.8), interpolateXNumber(0.95), this.endX])
    } else {
      this.interpolateX = () => this.endX
    }
    if (this.startY !== this.endY) {
      const interpolateYNumber = interpolateNumber(this.startY, this.endY)
      this.interpolateY = interpolateBasis([this.startY, interpolateYNumber(0.1), interpolateYNumber(0.8), interpolateYNumber(0.95), this.endY])
    } else {
      this.interpolateY = () => this.endY
    }

    const radius = this.nodeStyleSelector(node, 'width') / 2
    const strokeWidth = this.nodeStyleSelector(node, 'strokeWidth')

    if (radius !== this.radius || strokeWidth !== this.strokeWidth) {
      this.circleContainer.hitArea = new PIXI.Circle(0, 0, radius + strokeWidth)
    }

    this.startRadius = this.radius === -1 ? radius : this.radius
    this.endRadius = radius
    if (this.startRadius !== this.endRadius) {
      const interpolateRadiusNumber = interpolateNumber(this.startRadius, this.endRadius)
      this.interpolateRadius = interpolateBasis([this.startRadius, interpolateRadiusNumber(0.1), interpolateRadiusNumber(0.8), interpolateRadiusNumber(0.95), this.endRadius])
    } else {
      this.interpolateRadius = () => this.endRadius
    }

    this.strokeWidth = strokeWidth
    this.stroke = colorToNumber(this.nodeStyleSelector(this.node, 'stroke'))
    this.strokeOpacity = this.nodeStyleSelector(this.node, 'strokeOpacity')
    this.fill = colorToNumber(this.nodeStyleSelector(this.node, 'fill'))
    this.fillOpacity = this.nodeStyleSelector(this.node, 'fillOpacity')

    if (node.label !== this.label) {
      this.label = node.label

      if (node.label) {
        this.labelSprite?.destroy()
        this.labelSprite = new PIXI.Text(node.label || '', {
          fontFamily: 'Helvetica',
          fontSize: 12 * 2,
          fill: 0x333333,
          lineJoin: 'round',
          stroke: '#fafafaee',
          strokeThickness: 2 * 2,
        })
        this.labelSprite.x = 0
        this.labelSprite.y = radius + this.strokeWidth + LABEL_Y_PADDING
        this.labelSprite.scale.set(0.5)
        this.labelSprite.anchor.set(0.5, 0)
        this.labelContainer.addChild(this.labelSprite)
      } else {
        this.labelContainer.removeChildren()
      }
    }

    if (node.style && node.style.icon !== this.icon) {
      this.icon = node.style.icon

      if (node.style.icon) {
        const icon = new PIXI.Text(node.style.icon, {
          fontFamily: 'Material Icons',
          fontSize: radius / Math.SQRT2 * 1.7,
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
   * TODO - perf boost: render cheap version of things while still animating position
   */
  render = () => {
    // TODO - should positionPercent be calculated in renderer
    if (this.renderer.animationTime < POSITION_ANIMATION_DURATION) {
      const positionPercent = this.renderer.animationTime / POSITION_ANIMATION_DURATION

      if (this.renderer.clickedNode !== this.node.id) {
        this.circleContainer.x = this.labelContainer.x = this.x = this.interpolateX(positionPercent)
        this.circleContainer.y = this.labelContainer.y = this.y = this.interpolateY(positionPercent)
      }

      this.radius = this.interpolateRadius(this.renderer.animationTime / 200)
    } else {
      if (this.renderer.clickedNode !== this.node.id) {
        this.circleContainer.x = this.labelContainer.x = this.x = this.endX
        this.circleContainer.y = this.labelContainer.y = this.y = this.endY
      }

      this.radius = this.endRadius
    }

    if (this.renderer.hoveredNode === this.node.id) {
      this.nodeGfx
        .clear()
        .lineStyle(this.strokeWidth * 1.5, 0xcccccc, 1, 1)
        .beginFill(this.fill, this.fillOpacity)
        .drawCircle(0, 0, this.radius)
    } else {
      this.nodeGfx
        .clear()
        .lineStyle(this.strokeWidth, this.stroke, this.strokeOpacity, 1)
        .beginFill(this.fill, this.fillOpacity)
        .drawCircle(0, 0, this.radius)
    }

    if (this.labelSprite) {
      this.labelSprite.y = this.radius + this.strokeWidth + LABEL_Y_PADDING
    }

    return this
  }

  delete = () => {
    this.circleContainer.destroy()
    this.labelContainer.destroy()
    delete this.renderer.nodesById[this.node.id]
  }

  private nodeMouseOver = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) {
      this.renderer.hoveredNode = this.node.id

      this.renderer.nodesLayer.removeChild(this.circleContainer)
      this.renderer.labelsLayer.removeChild(this.labelContainer)
      this.renderer.frontNodeLayer.addChild(this.circleContainer)
      this.renderer.frontLabelLayer.addChild(this.labelContainer)

      this.renderer.dirty = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onNodeMouseEnter && this.renderer.onNodeMouseEnter(this.node, { x, y })
    }
  }

  private nodeMouseOut = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined && this.renderer.hoveredNode === this.node.id) {
      this.renderer.hoveredNode = undefined

      for (const nodeGfx of this.renderer.frontNodeLayer.children) {
        this.renderer.frontNodeLayer.removeChild(nodeGfx)
        this.renderer.nodesLayer.addChild(nodeGfx)
      }

      for (const labelGfx of this.renderer.frontLabelLayer.children) {
        this.renderer.frontLabelLayer.removeChild(labelGfx)
        this.renderer.labelsLayer.addChild(labelGfx)
      }

      this.renderer.dirty = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onNodeMouseLeave && this.renderer.onNodeMouseLeave(this.node, { x, y })
    }
  }

  private nodeMouseDown = (event: PIXI.interaction.InteractionEvent) => {
    this.renderer.clickedNode = this.node.id
    this.renderer.app.renderer.plugins.interaction.on('mousemove', this.nodeMove)
    this.renderer.viewport.pause = true
    this.renderer.dirty = true
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodeMouseDown && this.renderer.onNodeMouseDown(this.node, { x, y })
  }

  private nodeMouseUp = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
      this.renderer.clickedNode = undefined
      this.renderer.app.renderer.plugins.interaction.off('mousemove', this.nodeMove)
      this.renderer.viewport.pause = false
      this.renderer.dirty = true
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.renderer.onNodeMouseUp && this.renderer.onNodeMouseUp(this.node, { x, y })
    }
  }

  private nodeMove = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
      const { x, y } = this.renderer.viewport.toWorld(event.data.global)
      this.startX = this.endX = this.circleContainer.x = this.labelContainer.x = this.x = x
      this.startY = this.endY = this.circleContainer.y = this.labelContainer.y = this.y = y
      this.renderer.dirty = true
      this.renderer.onNodeDrag && this.renderer.onNodeDrag(this.node, { x, y })
    }
  }
}
