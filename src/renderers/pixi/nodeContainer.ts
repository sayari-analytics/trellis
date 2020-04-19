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
  private depth: number
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
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0
  private static nodeStyleSelector = nodeStyleSelector(DEFAULT_NODE_STYLES)

  constructor(renderer: Renderer, node: PositionedNode, x: number, y: number, parent?: NodeContainer) {
    this.depth = parent ? parent.depth + 1 : 0
    this.renderer = renderer
    if (parent) {
      this.nodesLayer = parent.nodeContainer
      this.labelsLayer = new PIXI.Container()
      this.parent = parent
    } else {
      this.nodesLayer = renderer.nodesLayer
      this.labelsLayer = renderer.labelsLayer
    }
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

    this.nodesLayer.addChild(this.nodeContainer)
    this.labelsLayer.addChild(this.labelContainer)
    this.node = node
    this.x = x
    this.y = y
    this.set(node)
  }

  set(node: PositionedNode) {
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
    const subGraphNodes: { [id: string]: NodeContainer } = {}
    if (node.subGraph?.nodes) {
      for (const subGraphNode of node.subGraph.nodes) {
        if (this.subGraphNodes[subGraphNode.id] === undefined) {
          // enter subGraph node
          subGraphNodes[subGraphNode.id] = new NodeContainer(
            this.renderer, subGraphNode, 0, 0, this
          )
        } else {
          // update subGraph node
          subGraphNodes[subGraphNode.id] = this.subGraphNodes[subGraphNode.id]
            .set(subGraphNode)
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
    // TODO - should positionPercent be calculated in renderer
    if (this.renderer.animationDuration < POSITION_ANIMATION_DURATION) {
      const positionPercent = this.renderer.animationDuration / POSITION_ANIMATION_DURATION

      if (this.renderer.clickedNode !== this) {
        this.nodeContainer.x = this.labelContainer.x = this.x = this.interpolateX(positionPercent)
        this.nodeContainer.y = this.labelContainer.y = this.y = this.interpolateY(positionPercent)
      }

      this.radius = this.interpolateRadius(this.renderer.animationDuration / 400)
    } else {
      if (this.renderer.clickedNode !== this) {
        this.nodeContainer.x = this.labelContainer.x = this.x = this.endX
        this.nodeContainer.y = this.labelContainer.y = this.y = this.endY
      }

      this.radius = this.endRadius
    }

    this.nodeGfx
      .clear()
      .lineStyle(this.strokeWidth, this.renderer.hoveredNode === this ? 0xcccccc : this.stroke, this.strokeOpacity, 0)
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

  /**
   * Note - for overlapping sibling nodes OUTTER and INNER, the following events are fired
   * - pointer from outside to inside OUTTER            enter OUTTER
   * - pointer from inside OUTTER to inside INNER       leave OUTTER, enter INNER
   * - pointer from inside INNER to inside OUTTER       leave INNER, enter OUTTER
   * - pointer from inside OUTTER to outside            leave OUTTER
   *
   * the above is as expected.  however, subgraphs of child nodes are missing two events
   * - pointer from outside to inside OUTTER            enter OUTTER
   * - pointer from inside OUTTER to inside INNER       [missing leave OUTTER], enter INNER
   * - pointer from inside INNER to inside OUTTER       leave INNER, [missing enter OUTTER]
   * - pointer from inside OUTTER to outside            leave OUTTER
   *
   * i.e. pointer events are different when: moving from sibling to sibling vs. moving from parent to child
   * this feels wrong... how does this compare to DOM event handlers?
   * in order to treat subGraph nodes as if they are siblings of other nodes:
   * - fire leave when entering a node if there is already a hovered node, before firing enter
   * - fire enter when leaving a node if pointer is over a node, after firing leave
   */
  private nodePointerEnter = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
      return
    }

    // PATCH so subGraph node pointer events are handled like sibling nodes - fire leave when entering a subGraph node if there is already a hovered node, before firing enter
    if (this.parent && this.parent === this.renderer.hoveredNode) {
      // TODO - event.target is wrong
      this.parent.nodeContainer.emit('pointerout', event)
    }

    this.renderer.hoveredNode = this

    if (this.parent === undefined) {
      this.renderer.nodesLayer.removeChild(this.nodeContainer)
      this.renderer.labelsLayer.removeChild(this.labelContainer)
      this.renderer.frontNodeLayer.addChild(this.nodeContainer)
      this.renderer.frontLabelLayer.addChild(this.labelContainer)
    }

    this.renderer.dirty = true
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodePointerEnter(event, this.node, x, y)
  }

  private nodePointerLeave = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined || this.renderer.hoveredNode !== this) {
      return
    }

    this.renderer.hoveredNode = undefined

    if (this.parent === undefined) {
      this.renderer.frontNodeLayer.removeChild(this.nodeContainer)
      this.renderer.frontLabelLayer.removeChild(this.labelContainer)
      this.renderer.nodesLayer.addChild(this.nodeContainer)
      this.renderer.labelsLayer.addChild(this.labelContainer)
    }

    this.renderer.dirty = true
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.renderer.onNodePointerLeave(event, this.node, x, y)

    // PATCH so subGraph node pointer events are handled like sibling nodes - fire enter when leaving a subGraph node if pointer is over a node, after firing leave
    if (this.parent) {
      // TODO - simply checking if node is in a subGraph is not sufficient.  event.target is wrong
      this.parent.nodeContainer.emit('pointerover', event)
    }
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
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
    const { x, y } = this.renderer.viewport.toWorld(event.data.global)
    this.nodeMoveXOffset = x - this.x
    this.nodeMoveYOffset = y - this.y
    this.renderer.onNodePointerDown(event, this.node, this.x, this.y)
  }

  private nodePointerUp = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
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
  }

  private nodeMove = (event: PIXI.interaction.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) {
      const position = this.renderer.viewport.toWorld(event.data.global)
      const x = position.x - this.nodeMoveXOffset
      const y = position.y - this.nodeMoveYOffset
      this.startX = this.endX = this.nodeContainer.x = this.labelContainer.x = this.x = x
      this.startY = this.endY = this.nodeContainer.y = this.labelContainer.y = this.y = y
      this.renderer.dirty = true
      this.renderer.onNodeDrag(event, this.node, this.x, this.y)
    }
  }
}
