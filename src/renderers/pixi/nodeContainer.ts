import * as PIXI from 'pixi.js'
import { nodeStyleSelector } from '../utils'
import { PositionedNode } from '../..'
import { colorToNumber } from './utils'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { Renderer, POSITION_ANIMATION_DURATION } from '.'
import { DEFAULT_NODE_STYLES } from '../options'


const LABEL_Y_PADDING = 4


export class NodeContainer {

  node: PositionedNode
  x: number
  y: number
  radius = -1
  strokeWidth = 0
  stroke = 0
  strokeOpacity = 0
  fill = 0
  fillOpacity = 0
  subGraphNodes: { [id: string]: NodeContainer } = {}
  parent?: NodeContainer

  private renderer: Renderer
  private nodesLayer: PIXI.Container
  private labelsLayer: PIXI.Container
  private startX = 0
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
  private nodeContainer = new PIXI.Container()
  private labelContainer = new PIXI.Container()
  private nodeGfx = new PIXI.Graphics()
  private labelSprite?: PIXI.Text
  private static nodeStyleSelector = nodeStyleSelector(DEFAULT_NODE_STYLES)

  constructor(renderer: Renderer, node: PositionedNode, x: number, y: number, parent?: NodeContainer) {
    this.renderer = renderer
    this.nodesLayer = renderer.nodesLayer
    this.labelsLayer = renderer.labelsLayer
    this.parent = parent
    this.nodeContainer.interactive = true
    this.nodeContainer.buttonMode = true
    this.nodeContainer
      .on('mouseover', this.nodeMouseOver)
      .on('mouseover', this.nodeMouseOver)
      .on('mouseout', this.nodeMouseOut)
      .on('mousedown', this.nodeMouseDown)
      .on('mouseup', this.nodeMouseUp)
      .on('mouseupoutside', this.nodeMouseUp)
      .addChild(this.nodeGfx)

    this.nodeContainer.zIndex = this.nodeContainerDepth()

    this.nodesLayer.addChild(this.nodeContainer)
    this.labelsLayer.addChild(this.labelContainer)
    this.node = node
    this.x = x
    this.y = y
    this.set(node)
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
     * Position Interpolation
     *
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


    /**
     * Radius Interpolation
     */
    const radius = NodeContainer.nodeStyleSelector(node, 'width') / 2
    const strokeWidth = NodeContainer.nodeStyleSelector(node, 'strokeWidth')

    this.startRadius = this.radius === -1 ? radius : this.radius
    this.endRadius = radius
    if (this.startRadius !== this.endRadius) {
      const interpolateRadiusNumber = interpolateNumber(this.startRadius, this.endRadius)
      this.interpolateRadius = interpolateBasis([this.startRadius, interpolateRadiusNumber(0.1), interpolateRadiusNumber(0.8), interpolateRadiusNumber(0.95), this.endRadius])
    } else {
      this.interpolateRadius = () => this.endRadius
    }


    /**
     * Styles
     */
    this.strokeWidth = strokeWidth
    this.stroke = colorToNumber(NodeContainer.nodeStyleSelector(this.node, 'stroke'))
    this.strokeOpacity = NodeContainer.nodeStyleSelector(this.node, 'strokeOpacity')
    this.fill = colorToNumber(NodeContainer.nodeStyleSelector(this.node, 'fill'))
    this.fillOpacity = NodeContainer.nodeStyleSelector(this.node, 'fillOpacity')


    /**
     * Label
     */
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
        this.labelSprite.y = radius + LABEL_Y_PADDING
        this.labelSprite.scale.set(0.5)
        this.labelSprite.anchor.set(0.5, 0)
        this.labelContainer.addChild(this.labelSprite)
      } else {
        this.labelContainer.removeChildren()
      }
    }


    /**
     * Icon
     */
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

        this.nodeContainer.addChild(icon)
      } else {
        this.nodeContainer.removeChild(this.nodeContainer.getChildByName('icon'))
      }
    }


    /**
     * SubGraph Node
     */
    const subGraphNodes: { [id: string]: NodeContainer } = {}
    if (node.subGraph?.nodes) {
      for (const subGraphNode of node.subGraph.nodes) {
        if (this.subGraphNodes[subGraphNode.id] === undefined) {
          // enter subGraph node
          subGraphNodes[subGraphNode.id] = new NodeContainer(
            this.renderer,  { ...subGraphNode, x: subGraphNode.x! + this.endX, y: subGraphNode.y! + this.endY }, this.x, this.y, this
          )
        } else {
          // update subGraph node
          subGraphNodes[subGraphNode.id] = this.subGraphNodes[subGraphNode.id]
            .set({ ...subGraphNode, x: subGraphNode.x! + this.endX, y: subGraphNode.y! + this.endY })
        }
      }
    }

    for (const subGraphNodeId in this.subGraphNodes) {
      if (subGraphNodes[subGraphNodeId] === undefined) {
        // exit subGraph node
        this.subGraphNodes[subGraphNodeId].delete()
      }
    }

    this.subGraphNodes = subGraphNodes


    return this
  }

  /**
   * TODO - perf boost: render cheap version of things while still animating position
   */
  render = () => {
    // TODO - should positionPercent be calculated in renderer
    if (this.renderer.animationDuration < POSITION_ANIMATION_DURATION) {
      const positionPercent = this.renderer.animationDuration / POSITION_ANIMATION_DURATION

      if (this.renderer.clickedNode !== this.node.id) {
        this.nodeContainer.x = this.labelContainer.x = this.x = this.interpolateX(positionPercent)
        this.nodeContainer.y = this.labelContainer.y = this.y = this.interpolateY(positionPercent)
      }

      this.radius = this.interpolateRadius(this.renderer.animationDuration / 400)
    } else {
      if (this.renderer.clickedNode !== this.node.id) {
        this.nodeContainer.x = this.labelContainer.x = this.x = this.endX
        this.nodeContainer.y = this.labelContainer.y = this.y = this.endY
      }

      this.radius = this.endRadius
    }

    this.nodeGfx
      .clear()
      .lineStyle(this.strokeWidth, this.renderer.hoveredNode === this.node.id ? 0xcccccc : this.stroke, this.strokeOpacity, 0)
      .beginFill(this.fill, this.fillOpacity)
      .drawCircle(0, 0, this.radius)

    if (this.labelSprite) {
      this.labelSprite.y = this.radius + LABEL_Y_PADDING
    }

    for (const subGraphNodeId in this.subGraphNodes) {
      this.subGraphNodes[subGraphNodeId].render()
    }

    return this
  }

  delete = () => {
    this.nodeContainer.destroy()
    this.labelContainer.destroy()
    for (const subGraphNodeId in this.subGraphNodes) {
      // exit subGraph node
      this.subGraphNodes[subGraphNodeId].delete()
    }
    delete this.renderer.nodesById[this.node.id]
  }

  private nodeMouseOver = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) {
      this.renderer.hoveredNode = this.node.id

      this.renderer.nodesLayer.removeChild(this.nodeContainer)
      this.renderer.labelsLayer.removeChild(this.labelContainer)
      this.renderer.frontNodeLayer.addChild(this.nodeContainer)
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
      this.startX = this.endX = this.nodeContainer.x = this.labelContainer.x = this.x = x
      this.startY = this.endY = this.nodeContainer.y = this.labelContainer.y = this.y = y
      this.renderer.dirty = true
      this.renderer.onNodeDrag && this.renderer.onNodeDrag(this.node, { x, y })
    }
  }

  private nodeContainerDepth = () => {
    let depth = 0
    let parent = this.parent

    while (parent) {
      depth++
      parent = parent.parent
    }

    return depth
  }
}
