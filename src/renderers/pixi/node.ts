import * as PIXI from 'pixi.js'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { PositionedNode } from '../../types'
import { PIXIRenderer as Renderer, NODE_STYLES, nodeStyleSelector, NodeStyle } from '.'
import { colorToNumber, parentInFront } from './utils'


const LABEL_Y_PADDING = 4


export class Node<NodeProps extends object = any>{

  node: PositionedNode<NodeProps, NodeStyle>
  x: number
  y: number
  radius = -1
  strokeWidth = 0
  stroke = 0
  strokeOpacity = 0
  fill = 0
  fillOpacity = 0
  subGraphNodes: { [id: string]: Node } = {}
  parent?: Node

  private renderer: Renderer<NodeProps, any>
  private depth: number
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
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0
  private static nodeStyleSelector = nodeStyleSelector(NODE_STYLES)

  constructor(renderer: Renderer<NodeProps>, node: PositionedNode<NodeProps, NodeStyle>, x: number, y: number, parent?: Node) {
    this.renderer = renderer

    this.parent = parent
    this.depth = parent ? parent.depth + 1 : 0

    this.nodeContainer.interactive = true
    this.nodeContainer.buttonMode = true
    this.nodeContainer
      .on('pointerover', this.nodePointerEnter)
      .on('pointerout', this.nodePointerLeave)
      .on('pointerdown', this.nodePointerDown)
      .on('pointerup', this.nodePointerUp)
      .on('pointerupoutside', this.nodePointerUp)
      .addChild(this.nodeGfx)

    this.nodeContainer.zIndex = this.depth

    /**
     * if any ancestor is in front layer, add to front
     * otherwise, add to regular layers
     */
    if (parentInFront(this.renderer, this.parent)) {
      this.renderer.frontNodeLayer.addChild(this.nodeContainer)
      this.renderer.frontLabelLayer.addChild(this.labelContainer)
    } else {
      this.renderer.nodesLayer.addChild(this.nodeContainer)
      this.renderer.labelsLayer.addChild(this.labelContainer)
    }

    this.node = node
    this.x = x
    this.y = y
    this.set(node)
  }

  set(node: PositionedNode<NodeProps, NodeStyle>) {
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
    const radius = node.radius
    const strokeWidth = Node.nodeStyleSelector(node, 'strokeWidth')

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
    this.stroke = colorToNumber(Node.nodeStyleSelector(this.node, 'stroke'))
    this.strokeOpacity = Node.nodeStyleSelector(this.node, 'strokeOpacity')
    this.fill = colorToNumber(Node.nodeStyleSelector(this.node, 'fill'))
    this.fillOpacity = Node.nodeStyleSelector(this.node, 'fillOpacity')


    /**
     * Label
     */
    if (node.label !== this.label) {
      this.label = node.label

      if (node.label) {
        this.labelSprite?.destroy()
        this.labelSprite = new PIXI.Text(node.label || '', {
          fontFamily: 'Helvetica',
          fontSize: 12 * 2.5,
          fill: 0x333333,
          lineJoin: 'round',
          stroke: '#fafafaee',
          strokeThickness: 2 * 2,
          align: 'center',
        })
        this.labelSprite.position.set(0, radius + LABEL_Y_PADDING)
        this.labelSprite.scale.set(0.4)
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
        icon.position.set(0,0)
        icon.anchor.set(0.5)

        this.nodeContainer.addChild(icon)
      } else {
        this.nodeContainer.removeChild(this.nodeContainer.getChildByName('icon'))
      }
    }


    /**
     * SubGraph Node
     */
    const subGraphNodes: { [id: string]: Node } = {}
    if (node.subGraph?.nodes) {
      for (const subGraphNode of node.subGraph.nodes) {
        if (this.subGraphNodes[subGraphNode.id] === undefined) {
          // enter subGraph node
          subGraphNodes[subGraphNode.id] = new Node(this.renderer, subGraphNode, 0, 0, this)
        } else {
          // update subGraph node
          subGraphNodes[subGraphNode.id] = this.subGraphNodes[subGraphNode.id].set(subGraphNode)
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
  render() {
    if (this.renderer.animationPercent < 1) {
      this.x = this.interpolateX(this.renderer.animationPercent)
      this.y = this.interpolateY(this.renderer.animationPercent)
      this.radius = this.interpolateRadius(this.renderer.animationDuration / 400)
    } else {
      this.x = this.endX
      this.y = this.endY
      this.radius = this.endRadius
    }

    if (this.parent) {
      this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x
      this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y
    } else {
      this.nodeContainer.x = this.labelContainer.x = this.x
      this.nodeContainer.y = this.labelContainer.y = this.y
    }

    this.nodeGfx
      .clear()
      .lineStyle(this.strokeWidth, this.stroke, this.strokeOpacity, 0)
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

  delete() {
    this.nodeContainer.destroy()
    this.labelContainer.destroy()
    for (const subGraphNodeId in this.subGraphNodes) {
      // exit subGraph node
      this.subGraphNodes[subGraphNodeId].delete()
    }
    delete this.renderer.nodesById[this.node.id]
  }


  private nodePointerEnter = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) return

    this.renderer.hoveredNode = this

    if (this.parent === undefined) {
      this.renderer.nodesLayer.removeChild(this.nodeContainer)
      this.renderer.labelsLayer.removeChild(this.labelContainer)
      this.renderer.frontNodeLayer.addChild(this.nodeContainer)
      this.renderer.frontLabelLayer.addChild(this.labelContainer)

      for (const subGraphNodeId in this.subGraphNodes) {
        this.renderer.nodesLayer.removeChild(this.subGraphNodes[subGraphNodeId].nodeContainer)
        this.renderer.labelsLayer.removeChild(this.subGraphNodes[subGraphNodeId].labelContainer)
        this.renderer.frontNodeLayer.addChild(this.subGraphNodes[subGraphNodeId].nodeContainer)
        this.renderer.frontLabelLayer.addChild(this.subGraphNodes[subGraphNodeId].labelContainer)
      }
    }

    this.renderer.dirty = true
    const position = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodePointerEnter(event, this.node, position.x, position.y)
  }

  private nodePointerLeave = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined || this.renderer.hoveredNode !== this) return

    this.renderer.hoveredNode = undefined

    if (this.parent === undefined) {
      this.renderer.frontNodeLayer.removeChild(this.nodeContainer)
      this.renderer.frontLabelLayer.removeChild(this.labelContainer)
      this.renderer.nodesLayer.addChild(this.nodeContainer)
      this.renderer.labelsLayer.addChild(this.labelContainer)

      for (const subGraphNodeId in this.subGraphNodes) {
        this.renderer.frontNodeLayer.removeChild(this.subGraphNodes[subGraphNodeId].nodeContainer)
        this.renderer.frontLabelLayer.removeChild(this.subGraphNodes[subGraphNodeId].labelContainer)
        this.renderer.nodesLayer.addChild(this.subGraphNodes[subGraphNodeId].nodeContainer)
        this.renderer.labelsLayer.addChild(this.subGraphNodes[subGraphNodeId].labelContainer)
      }
    }

    this.renderer.dirty = true
    const position = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodePointerLeave(event, this.node, position.x, position.y)
  }

  private nodePointerDown = (event: PIXI.interaction.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedNode = this
    this.renderer.app.renderer.plugins.interaction.on('pointermove', this.nodeMove)
    this.renderer.viewport.pause = true
    this.renderer.dirty = true
    const position = this.renderer.viewport.toWorld(event.data.global)
    this.nodeMoveXOffset = position.x - this.x
    this.nodeMoveYOffset = position.y - this.y
    this.renderer.onNodePointerDown(event, this.node, this.x, this.y)
  }

  private nodePointerUp = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    this.renderer.clickedNode = undefined
    this.renderer.app.renderer.plugins.interaction.off('pointermove', this.nodeMove)
    this.renderer.viewport.pause = false
    this.renderer.dirty = true
    this.nodeMoveXOffset = 0
    this.nodeMoveYOffset = 0
    this.renderer.onNodePointerUp(event, this.node, this.x, this.y)

    if (this.doubleClick) {
      this.doubleClick = false
      this.renderer.onNodeDoubleClick(event, this.node, this.x, this.y)
    }
  }

  private nodeMove = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    const position = this.renderer.viewport.toWorld(event.data.global)
    this.startX = this.endX = this.x = position.x - this.nodeMoveXOffset
    this.startY = this.endY = this.y = position.y - this.nodeMoveYOffset
    this.renderer.dirty = true
    this.renderer.onNodeDrag(event, this.node, this.x, this.y)
  }


  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
