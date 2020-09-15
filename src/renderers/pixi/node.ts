import * as PIXI from 'pixi.js'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { PIXIRenderer as Renderer, NodeStyle, FontIcon, ImageIcon } from '.'
import { colorToNumber, parentInFront } from './utils'
import { Node, Edge } from '../../types'
import { equals } from '../../utils'


const LABEL_Y_PADDING = 4

const NODE_STYLES: NodeStyle = {
  strokeWidth: 2,
  fill: '#ff4b4b',
  stroke: '#bb0000',
  fillOpacity: 1,
  strokeOpacity: 1,
}


export class NodeRenderer<N extends Node, E extends Edge>{

  node: N
  x: number
  y: number
  radius: number
  strokeWidth = 0
  stroke = 0
  strokeOpacity = 0
  fill = 0
  fillOpacity = 0
  subGraphNodes: { [id: string]: NodeRenderer<N, E> } = {}
  parent?: NodeRenderer<N, E>

  private renderer: Renderer<N, E>
  private depth: number
  private startX: number
  private startY: number
  private startRadius: number
  private endX: number
  private endY: number
  private endRadius: number
  private interpolateX: (percent: number) => number = () => this.endX
  private interpolateY: (percent: number) => number = () => this.endY
  private interpolateRadius: (percent: number) => number = () => this.endRadius
  private label?: string
  private icon?: FontIcon | ImageIcon
  private nodeContainer = new PIXI.Container()
  private fillSpriteContainer = new PIXI.Container()
  private strokeSpriteContainer = new PIXI.Container()
  private labelContainer = new PIXI.Container()
  private fillSprite: PIXI.Sprite
  private strokeSprite: PIXI.Sprite
  private labelSprite?: PIXI.Text
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0

  constructor(renderer: Renderer<N, E>, node: N, x: number, y: number, radius: number, parent?: NodeRenderer<N, E>) {
    this.renderer = renderer

    this.parent = parent
    this.depth = parent ? parent.depth + 1 : 0

    this.nodeContainer.interactive = true
    this.nodeContainer.buttonMode = true

    this.fillSprite = this.renderer.circle.create()
    this.strokeSprite = this.renderer.circle.create()
    this.fillSpriteContainer.addChild(this.fillSprite)
    this.strokeSpriteContainer.addChild(this.strokeSprite)

    this.nodeContainer
      .on('pointerover', this.nodePointerEnter)
      .on('pointerout', this.nodePointerLeave)
      .on('pointerdown', this.nodePointerDown)
      .on('pointerup', this.nodePointerUp)
      .on('pointerupoutside', this.nodePointerUp)
      .addChild(this.strokeSpriteContainer)
      .addChild(this.fillSpriteContainer)

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
    this.startX = this.endX = this.x = x
    this.startY = this.endY = this.y = y
    this.startRadius = this.endRadius = this.radius = radius
    this.set(node)
  }

  set(node: N) {
    this.node = node

    this.startX = this.x
    this.endX = node.x ?? 0

    const interpolateXNumber = interpolateNumber(this.startX, this.endX)
    this.interpolateX = interpolateBasis([this.startX, interpolateXNumber(0.7), interpolateXNumber(0.95), this.endX])

    this.startY = this.y
    this.endY = node.y ?? 0

    const interpolateYNumber = interpolateNumber(this.startY, this.endY)
    this.interpolateY = interpolateBasis([this.startY, interpolateYNumber(0.7), interpolateYNumber(0.95), this.endY])

    this.startRadius = this.radius
    this.endRadius = node.radius

    const interpolateRadiusNumber = interpolateNumber(this.startRadius, this.endRadius)
    this.interpolateRadius = interpolateBasis([this.startRadius, interpolateRadiusNumber(0.7), interpolateRadiusNumber(0.95), this.endRadius])


    /**
     * Styles
     */
    this.strokeWidth = this.node.style?.strokeWidth ?? NODE_STYLES.strokeWidth
    this.stroke = colorToNumber(this.node.style?.stroke ?? NODE_STYLES.stroke)
    this.strokeOpacity = this.node.style?.strokeOpacity ?? NODE_STYLES.strokeOpacity
    this.fill = colorToNumber(this.node.style?.fill ?? NODE_STYLES.fill)
    this.fillOpacity = this.node.style?.fillOpacity ?? NODE_STYLES.fillOpacity

    this.fillSprite.tint = this.fill
    // this.fillSprite.alpha = this.fillOpacity // TODO - to enable fill opacity, mask out center of strokeSprite
    this.strokeSprite.tint = this.stroke
    this.strokeSprite.alpha = this.strokeOpacity


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
        this.labelSprite.position.set(0, node.radius + LABEL_Y_PADDING)
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
    if (!equals(node.style?.icon, this.icon)) {
      this.icon = node.style?.icon

      if (this.icon !== undefined) {
        if (this.icon.type === 'fontIcon') {
          // TOOD - reuse icon sprites
          const icon = new PIXI.Text(this.icon.code, {
            fontFamily: this.icon.family,
            fontSize: this.icon.size * 2,
            fill: this.icon.color,
          })
          icon.name = 'icon'
          icon.position.set(0, 0)
          icon.anchor.set(0.5)
          this.nodeContainer.addChild(icon)
        } else if (this.icon.type === 'imageIcon') {
          // TODO
        } else {
          // never()
        }
      } else {
        this.nodeContainer.removeChild(this.nodeContainer.getChildByName('icon'))
      }
    }


    /**
     * SubGraph Node
     */
    const subGraphNodes: { [id: string]: NodeRenderer<N, E> } = {}
    if (node.subGraph?.nodes) {
      for (const subGraphNode of node.subGraph.nodes as N[]) {
        if (this.subGraphNodes[subGraphNode.id] === undefined) {
          // enter subGraph node
          subGraphNodes[subGraphNode.id] = new NodeRenderer<N, E>(this.renderer, subGraphNode, 0, 0, subGraphNode.radius, this)
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
    if (this.renderer.animationPercent < 1 && this.renderer.clickedNode?.node.id !== this.node.id) {
      this.x = this.interpolateX(this.renderer.animationPercent)
      this.y = this.interpolateY(this.renderer.animationPercent)
      this.radius = this.interpolateRadius(this.renderer.animationPercent) // this.radius = this.interpolateRadius(this.renderer.animationDuration / 400)
    } else {
      this.x = this.startX = this.endX
      this.y = this.startY = this.endY
      this.radius = this.startRadius = this.endRadius
      this.interpolateX = () => this.x
      this.interpolateY = () => this.y
      this.interpolateRadius = () => this.radius
    }

    if (this.parent) {
      this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x
      this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y
    } else {
      this.nodeContainer.x = this.labelContainer.x = this.x
      this.nodeContainer.y = this.labelContainer.y = this.y
    }

    this.fillSprite.scale.set(this.radius / 1000)
    this.strokeSprite.scale.set((this.radius + this.strokeWidth) / 1000)
    this.nodeContainer.hitArea = new PIXI.Circle(0, 0, this.radius + this.strokeWidth)

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


  private nodePointerEnter = (event: PIXI.InteractionEvent) => {
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

  private nodePointerLeave = (event: PIXI.InteractionEvent) => {
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

  private nodePointerDown = (event: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedNode = this
    this.renderer.app.renderer.plugins.interaction.on('pointermove', this.nodeMove)
    this.renderer.viewport.pause = true
    const position = this.renderer.viewport.toWorld(event.data.global)
    this.nodeMoveXOffset = position.x - this.x
    this.nodeMoveYOffset = position.y - this.y
    this.renderer.onNodePointerDown(event, this.node, this.x, this.y)
  }

  private nodePointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    this.renderer.clickedNode = undefined
    this.renderer.app.renderer.plugins.interaction.off('pointermove', this.nodeMove)
    this.renderer.viewport.pause = false
    this.nodeMoveXOffset = 0
    this.nodeMoveYOffset = 0
    this.renderer.onNodePointerUp(event, this.node, this.x, this.y)

    if (this.doubleClick) {
      this.doubleClick = false
      this.renderer.onNodeDoubleClick(event, this.node, this.x, this.y)
    }
  }

  private nodeMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    const position = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodeDrag(event, this.node, position.x - this.nodeMoveXOffset, position.y - this.nodeMoveYOffset)
  }


  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
