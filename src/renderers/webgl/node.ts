import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from './internal'
import {
  colorToNumber,
  RADIANS_PER_DEGREE,
  HALF_PI,
  movePoint,
  parentInFront,
  clientPositionFromEvent,
  pointerKeysFromEvent
} from './utils'
import { Node, Edge, NodeStyle, equals, Placement } from '../../api'
import { interpolate } from '../../utils'
import { CircleSprite } from './sprites/circleSprite'

const LABEL_PADDING = 4
const VERTICAL_ANCHOR = { x: 0.5, y: 0 }
const HORIZONTAL_ANCHOR = { x: 0, y: 0.5 }
const DEFAULT_NODE_FILL = colorToNumber('#666')
const DEFAULT_NODE_STROKE = colorToNumber('#aaa')
const DEFAULT_NODE_STROKE_WIDTH = 2
const DEFAULT_LABEL_FAMILY = 'Helvetica'
const DEFAULT_LABEL_COLOR = colorToNumber('#444')
const DEFAULT_LABEL_SIZE = 11
const DEFAULT_RADIUS = 18
const DEFAULT_BADGE_RADIUS = 8
const DEFAULT_BADGE_STROKE_WIDTH = 2

export class NodeRenderer<N extends Node, E extends Edge> {
  node: N
  x: number
  y: number
  radius: number
  strokeWidth = 0
  subgraphNodes: { [id: string]: NodeRenderer<N, E> } = {}
  parent?: NodeRenderer<N, E>
  dirty = false

  private renderer: InternalRenderer<N, E>
  private depth: number
  private targetX: number
  private interpolateX?: (time: number) => { value: number; done: boolean }
  private expectedNodeXPosition?: number
  private targetY: number
  private interpolateY?: (time: number) => { value: number; done: boolean }
  private expectedNodeYPosition?: number
  private targetRadius: number
  private interpolateRadius?: (time: number) => { value: number; done: boolean }
  private label?: string
  private labelFamily?: string
  private labelColor?: number
  private labelSize?: number
  private labelWordWrap?: number
  private labelBackground?: string
  private labelBackgroundOpacity?: number
  private labelPlacement: Placement = 'bottom'
  private stroke?: NodeStyle['stroke']
  private icon?: NodeStyle['icon']
  private badge?: NodeStyle['badge']
  private nodeContainer = new PIXI.Container()
  private fillSprite: PIXI.Sprite
  private strokeSpriteContainer: PIXI.Container[] = []
  private strokeSprites: { sprite: PIXI.Sprite; width: number }[] = []
  private badgeSpriteContainer?: PIXI.Container
  private badgeSprites: {
    fill: PIXI.Sprite
    stroke: PIXI.Sprite
    icon?: PIXI.Sprite
    angle: number
    iconXOffset?: number
    iconYOffset?: number
  }[] = []
  private labelContainer = new PIXI.Container() // TODO - create lazily
  private labelSprite?: PIXI.Text
  private labelBackgroundSprite?: PIXI.Sprite
  private iconSprite?: PIXI.Sprite
  private labelLoader?: () => void
  private iconLoader?: () => void
  private badgeIconLoader: (() => void)[] = []
  private doubleClickTimeout: number | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0

  constructor(renderer: InternalRenderer<N, E>, node: N, x: number, y: number, radius?: number, parent?: NodeRenderer<N, E>) {
    this.renderer = renderer

    this.parent = parent
    this.depth = parent ? parent.depth + 1 : 0

    this.fillSprite = this.renderer.circle.create()

    this.nodeContainer.interactive = true
    this.nodeContainer.buttonMode = true
    this.nodeContainer.zIndex = this.depth
    this.nodeContainer
      .on('pointerover', this.pointerEnter)
      .on('pointerout', this.pointerLeave)
      .on('pointerdown', this.pointerDown)
      .on('pointerup', this.pointerUp)
      .on('pointerupoutside', this.pointerUp)
      .on('pointercancel', this.pointerUp)
      .addChild(this.fillSprite)

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
    this.targetX = this.x = x
    this.targetY = this.y = y
    this.targetRadius = this.radius = radius ?? DEFAULT_RADIUS
    this.update(node)
  }

  update(node: N) {
    this.node = node
    this.dirty = true

    const x = this.node.x ?? 0
    if (x !== this.targetX) {
      if (x === this.expectedNodeXPosition || !this.renderer.animateNodePosition || this.renderer.clickedNode) {
        this.interpolateX = undefined
        this.x = x
      } else {
        this.interpolateX = interpolate(this.x, x, this.renderer.animateNodePosition, this.renderer.time)
      }

      this.expectedNodeXPosition = undefined
      this.targetX = x
    }

    const y = this.node.y ?? 0
    if (y !== this.targetY) {
      if (y === this.expectedNodeYPosition || !this.renderer.animateNodePosition || this.renderer.clickedNode) {
        this.interpolateY = undefined
        this.y = y
      } else {
        this.interpolateY = interpolate(this.y, y, this.renderer.animateNodePosition, this.renderer.time)
      }

      this.expectedNodeYPosition = undefined
      this.targetY = y
    }

    const radius = this.node.radius
    if (radius !== this.targetRadius) {
      if (!this.renderer.animateNodeRadius) {
        this.interpolateRadius = undefined
        this.radius = radius
      } else {
        this.interpolateRadius = interpolate(this.radius, radius, this.renderer.animateNodeRadius, this.renderer.time)
      }

      this.targetRadius = radius
    }

    /**
     * Styles
     */
    this.fillSprite.tint = this.node.style?.color === undefined ? DEFAULT_NODE_FILL : colorToNumber(this.node.style?.color)
    // this.fillOpacity = this.fillSprite.alpha = this.node.style?.fillOpacity ?? NODE_STYLES.fillOpacity // TODO - to enable fill opacity, mask out center of strokeSprite

    /**
     * Label
     */
    const labelFamily = node.style?.label?.fontFamily ?? DEFAULT_LABEL_FAMILY
    const labelColor = node.style?.label?.color === undefined ? DEFAULT_LABEL_COLOR : colorToNumber(node.style.label.color)
    const labelSize = node.style?.label?.fontSize ?? DEFAULT_LABEL_SIZE
    const labelWordWrap = node.style?.label?.wordWrap
    const labelBackground = node.style?.label?.background
    const labelBackgroundOpacity = node.style?.label?.backgroundOpacity
    const labelPlacement = node.style?.label?.placement ?? 'bottom'

    if (
      node.label !== this.label ||
      labelFamily !== this.labelFamily ||
      labelColor !== this.labelColor ||
      labelSize !== this.labelSize ||
      labelWordWrap !== this.labelWordWrap ||
      labelBackground !== this.labelBackground ||
      labelBackgroundOpacity !== this.labelBackgroundOpacity ||
      labelPlacement !== this.labelPlacement
    ) {
      this.label = node.label
      this.labelFamily = labelFamily
      this.labelColor = labelColor
      this.labelSize = labelSize
      this.labelWordWrap = labelWordWrap
      this.labelBackground = labelBackground
      this.labelBackgroundOpacity = labelBackgroundOpacity
      this.labelPlacement = labelPlacement
      this.labelContainer.removeChildren()
      this.labelSprite?.destroy()
      this.labelSprite = undefined
      this.labelLoader?.()

      if (this.label) {
        this.labelLoader = this.renderer.fontLoader.load(
          this.labelFamily,
          'normal'
        )((family) => {
          if (this.label === undefined || this.labelFamily !== family) return

          this.dirty = true
          this.renderer.dirty = true

          const anchor = this.labelPlacement === 'left' || this.labelPlacement === 'right' ? HORIZONTAL_ANCHOR : VERTICAL_ANCHOR

          this.labelSprite = new PIXI.Text(this.label, {
            fontFamily: this.labelFamily,
            fontSize: (this.labelSize ?? DEFAULT_LABEL_SIZE) * 2.5,
            fill: this.labelColor,
            lineJoin: 'round',
            stroke: this.labelBackground === undefined ? '#fff' : undefined,
            strokeThickness: this.labelBackground === undefined ? 2.5 * 2.5 : 0,
            align: this.labelPlacement === 'left' ? 'right' : this.labelPlacement === 'right' ? 'left' : 'center',
            wordWrap: labelWordWrap !== undefined,
            wordWrapWidth: labelWordWrap
          })
          this.labelSprite.anchor.set(anchor.x, anchor.y)
          this.labelSprite.scale.set(0.4)
          this.labelContainer.addChild(this.labelSprite)

          if (this.labelBackground) {
            this.labelBackgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE)
            this.labelBackgroundSprite.width = this.labelSprite.width + 4
            this.labelBackgroundSprite.height = this.labelSprite.height
            this.labelBackgroundSprite.tint = colorToNumber(this.labelBackground)
            this.labelBackgroundSprite.alpha = this.labelBackgroundOpacity ?? 1
            this.labelBackgroundSprite.anchor.set(anchor.x, anchor.y)
            this.labelContainer.addChild(this.labelBackgroundSprite)
          }

          this.labelContainer.addChild(this.labelSprite)
        })
      }
    }

    /**
     * Strokes
     */
    if (!equals(node.style?.stroke, this.stroke)) {
      this.stroke = node.style?.stroke
      for (const container of this.strokeSpriteContainer) {
        this.nodeContainer.removeChild(container)
        container.destroy({ children: true })
      }
      this.strokeSprites = []
      this.strokeSpriteContainer = []
      this.strokeWidth = 0

      if (this.stroke) {
        this.strokeWidth = this.stroke.reduce((sum, { width = DEFAULT_NODE_STROKE_WIDTH }) => sum + width, 0)

        for (const stroke of this.stroke) {
          const strokeSprite = this.renderer.circle.create()
          strokeSprite.tint = stroke.color === undefined ? DEFAULT_NODE_STROKE : colorToNumber(stroke.color)
          this.strokeSprites.push({
            sprite: strokeSprite,
            width: stroke.width ?? DEFAULT_NODE_STROKE_WIDTH
          })

          const container = new PIXI.Container()
          container.addChild(strokeSprite)
          this.strokeSpriteContainer.push(container)
          this.nodeContainer.addChildAt(container, 0) // add to bottom
        }
      }
    }

    /**
     * Badges
     */
    if (!equals(node.style?.badge, this.badge)) {
      this.badge = node.style?.badge
      this.badgeIconLoader.forEach((loader) => loader())
      if (this.badgeSpriteContainer !== undefined) {
        this.nodeContainer.removeChild(this.badgeSpriteContainer)
        this.badgeSpriteContainer.destroy({ children: true })
        this.badgeSpriteContainer = undefined
      }
      this.badgeSprites = []

      if (this.badge !== undefined) {
        this.badgeSpriteContainer = new PIXI.Container()

        for (const badge of this.badge) {
          if (badge.icon?.type === 'textIcon') {
            this.badgeIconLoader.push(
              this.renderer.fontLoader.load(
                badge.icon.family,
                'bold'
              )((family) => {
                if (this.badgeSpriteContainer === undefined || badge.icon?.type !== 'textIcon' || badge.icon?.family !== family) return

                this.dirty = true
                this.renderer.dirty = true

                const badgeRadius = badge.radius ?? DEFAULT_BADGE_RADIUS
                const badgeStrokeRadius = badgeRadius + (badge.strokeWidth ?? DEFAULT_BADGE_STROKE_WIDTH)

                const badgeFillSprite = this.renderer.circle.create()
                badgeFillSprite.tint = badge.color === undefined ? DEFAULT_NODE_FILL : colorToNumber(badge.color)
                badgeFillSprite.scale.set(badgeRadius / CircleSprite.radius)

                const badgeStrokeSprite = this.renderer.circle.create()
                badgeStrokeSprite.tint = badge.stroke === undefined ? DEFAULT_NODE_STROKE : colorToNumber(badge.stroke)
                badgeStrokeSprite.scale.set(badgeStrokeRadius / CircleSprite.radius)

                const badgeIconSprite = this.renderer.fontIcon.create(
                  badge.icon.text,
                  badge.icon.family,
                  badge.icon.size,
                  'bold',
                  badge.icon.color
                )

                this.badgeSprites.push({
                  fill: badgeFillSprite,
                  stroke: badgeStrokeSprite,
                  icon: badgeIconSprite,
                  angle: badge.position * RADIANS_PER_DEGREE - HALF_PI
                })
                this.badgeSpriteContainer.addChild(badgeStrokeSprite)
                this.badgeSpriteContainer.addChild(badgeFillSprite)
                badgeIconSprite !== undefined && this.badgeSpriteContainer.addChild(badgeIconSprite)
                this.nodeContainer.addChild(this.badgeSpriteContainer) // add to top
              })
            )
          } else if (badge.icon?.type === 'imageIcon') {
            this.badgeIconLoader.push(
              this.renderer.imageLoader.load(badge.icon.url)((url) => {
                if (this.badgeSpriteContainer === undefined || badge.icon?.type !== 'imageIcon' || badge.icon?.url !== url) return

                this.dirty = true
                this.renderer.dirty = true

                const badgeRadius = badge.radius ?? DEFAULT_BADGE_RADIUS
                const badgeStrokeRadius = badgeRadius + (badge.strokeWidth ?? DEFAULT_BADGE_STROKE_WIDTH)

                const badgeFillSprite = this.renderer.circle.create()
                badgeFillSprite.tint = badge.color === undefined ? DEFAULT_NODE_FILL : colorToNumber(badge.color)
                badgeFillSprite.scale.set(badgeRadius / CircleSprite.radius)

                const badgeStrokeSprite = this.renderer.circle.create()
                badgeStrokeSprite.tint = badge.stroke === undefined ? DEFAULT_NODE_STROKE : colorToNumber(badge.stroke)
                badgeStrokeSprite.scale.set(badgeStrokeRadius / CircleSprite.radius)

                const badgeIconSprite = this.renderer.image.create(badge.icon.url, badge.icon.scale, badge.icon.offsetX, badge.icon.offsetY)

                this.badgeSprites.push({
                  fill: badgeFillSprite,
                  stroke: badgeStrokeSprite,
                  icon: badgeIconSprite,
                  angle: badge.position * RADIANS_PER_DEGREE - HALF_PI,
                  iconXOffset: badge.icon.offsetX,
                  iconYOffset: badge.icon.offsetY
                })
                this.badgeSpriteContainer.addChild(badgeStrokeSprite)
                this.badgeSpriteContainer.addChild(badgeFillSprite)
                badgeIconSprite !== undefined && this.badgeSpriteContainer.addChild(badgeIconSprite)
                this.nodeContainer.addChild(this.badgeSpriteContainer) // add to top
              })
            )
          }
        }
      }
    }

    /**
     * Icon
     */
    if (!equals(node.style?.icon, this.icon)) {
      this.icon = node.style?.icon
      this.iconLoader?.()
      if (this.iconSprite !== undefined) {
        this.nodeContainer.removeChild(this.iconSprite)
        this.iconSprite.destroy()
        this.iconSprite = undefined
      }

      /**
       * TODO - ensure that icons are added below badges
       * if (this.badgeSpriteContainer === undefined) {
       *   this.nodeContainer.addChild(this.iconSprite) // no badges - add to top of nodeContainer
       * } else {
       *   this.nodeContainer.addChildAt(this.iconSprite, this.nodeContainer.children.length - 1) // badges - add below badges
       * }
       */
      if (this.icon?.type === 'textIcon') {
        this.iconLoader = this.renderer.fontLoader.load(
          this.icon.family,
          'normal'
        )((family) => {
          if (this.icon?.type !== 'textIcon' || this.icon.family !== family) return

          this.dirty = true
          this.renderer.dirty = true

          this.iconSprite = this.renderer.fontIcon.create(this.icon.text, this.icon.family, this.icon.size, 'normal', this.icon.color)

          this.nodeContainer.addChild(this.iconSprite)
        })
      } else if (this.icon?.type === 'imageIcon') {
        this.iconLoader = this.renderer.imageLoader.load(this.icon.url)((url) => {
          if (this.icon?.type !== 'imageIcon' || this.icon.url !== url) return

          this.dirty = true
          this.renderer.dirty = true

          this.iconSprite = this.renderer.image.create(this.icon.url, this.icon.scale, this.icon.offsetX, this.icon.offsetY)

          this.nodeContainer.addChild(this.iconSprite)
        })
      }
    }

    /**
     * Subgraph Node
     */
    const subgraphNodes: { [id: string]: NodeRenderer<N, E> } = {}
    if (node.subgraph?.nodes) {
      for (const subgraphNode of node.subgraph.nodes as N[]) {
        if (this.subgraphNodes[subgraphNode.id] === undefined) {
          // enter subgraph node
          subgraphNodes[subgraphNode.id] = new NodeRenderer<N, E>(this.renderer, subgraphNode, 0, 0, subgraphNode.radius, this)
        } else {
          // update subgraph node
          subgraphNodes[subgraphNode.id] = this.subgraphNodes[subgraphNode.id].update(subgraphNode)
        }
      }
    }

    for (const subgraphNodeId in this.subgraphNodes) {
      if (subgraphNodes[subgraphNodeId] === undefined) {
        // exit subgraph node
        this.subgraphNodes[subgraphNodeId].delete()
      }
    }

    this.subgraphNodes = subgraphNodes

    return this
  }

  render() {
    this.dirty = false

    if (this.interpolateX) {
      const { value, done } = this.interpolateX(this.renderer.time)
      this.x = value

      if (done) {
        this.interpolateX = undefined
      } else {
        this.dirty = true
      }
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY(this.renderer.time)
      this.y = value

      if (done) {
        this.interpolateY = undefined
      } else {
        this.dirty = true
      }
    }

    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(this.renderer.time)
      this.radius = value

      if (done) {
        this.interpolateRadius = undefined
      } else {
        this.dirty = true
      }
    }

    if (this.parent) {
      this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x
      this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y
    } else {
      this.nodeContainer.x = this.labelContainer.x = this.x
      this.nodeContainer.y = this.labelContainer.y = this.y
    }

    this.fillSprite.scale.set(this.radius / CircleSprite.radius)

    let strokeWidths = this.radius

    if (this.stroke !== undefined) {
      for (const { sprite, width } of this.strokeSprites) {
        strokeWidths += width
        sprite.scale.set(strokeWidths / CircleSprite.radius)
      }
    }

    if (this.badge !== undefined) {
      for (const { fill, stroke, icon, angle, iconXOffset = 0, iconYOffset = 0 } of this.badgeSprites) {
        const [x, y] = movePoint(0, 0, angle, this.radius + this.strokeWidth)
        fill.position.set(x, y)
        stroke.position.set(x, y)
        icon?.position.set(x + iconXOffset, y + iconYOffset)
      }
    }

    this.nodeContainer.hitArea = new PIXI.Circle(0, 0, this.radius + this.strokeWidth)

    if (this.labelSprite) {
      const labelPadding = this.radius + this.strokeWidth + LABEL_PADDING

      if (this.labelPlacement === 'left') {
        const x = -labelPadding - (this.labelBackgroundSprite?.width ?? this.labelSprite.width)
        this.labelSprite.x = x
        if (this.labelBackgroundSprite) {
          this.labelBackgroundSprite.x = x
        }
      } else if (this.labelPlacement === 'right') {
        this.labelSprite.x = labelPadding
        if (this.labelBackgroundSprite) {
          this.labelBackgroundSprite.x = labelPadding
        }
      } else if (this.labelPlacement === 'top') {
        const y = -labelPadding - (this.labelBackgroundSprite?.height ?? this.labelSprite.height)
        this.labelSprite.y = y
        if (this.labelBackgroundSprite) {
          this.labelBackgroundSprite.y = y
        }
      } else {
        this.labelSprite.y = labelPadding
        if (this.labelBackgroundSprite) {
          this.labelBackgroundSprite.y = labelPadding
        }
      }
    }

    for (const subgraphNodeId in this.subgraphNodes) {
      this.subgraphNodes[subgraphNodeId].render()
    }

    return this
  }

  delete() {
    if (this.doubleClickTimeout) {
      clearTimeout(this.doubleClickTimeout)
      this.doubleClickTimeout = undefined
    }

    this.labelLoader?.()
    this.badgeIconLoader.forEach((loader) => loader())
    this.iconLoader?.()

    for (const subgraphNodeId in this.subgraphNodes) {
      // exit subgraph node
      this.subgraphNodes[subgraphNodeId].delete()
    }
    this.nodeContainer.destroy({ children: true })
    this.labelContainer.destroy({ children: true })
  }

  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (this.renderer.hoveredNode === this || this.renderer.clickedNode !== undefined || this.renderer.dragging) return

    this.renderer.hoveredNode = this

    this.dirty = true
    this.renderer.dirty = true
    this.renderer.nodesLayer.removeChild(this.nodeContainer)
    this.renderer.labelsLayer.removeChild(this.labelContainer)
    this.renderer.frontNodeLayer.addChild(this.nodeContainer)
    this.renderer.frontLabelLayer.addChild(this.labelContainer)

    for (const subgraphNodeId in this.subgraphNodes) {
      this.renderer.nodesLayer.removeChild(this.subgraphNodes[subgraphNodeId].nodeContainer)
      this.renderer.labelsLayer.removeChild(this.subgraphNodes[subgraphNodeId].labelContainer)
      this.renderer.frontNodeLayer.addChild(this.subgraphNodes[subgraphNodeId].nodeContainer)
      this.renderer.frontLabelLayer.addChild(this.subgraphNodes[subgraphNodeId].labelContainer)
    }

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onNodePointerEnter?.({
      type: 'nodePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.node,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
  }

  private pointerDown = (event: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedNode = this
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()
    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.nodeMoveXOffset = x - this.x
    this.nodeMoveYOffset = y - this.y
    this.renderer.onNodePointerDown?.({
      type: 'nodePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.node,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
  }

  private pointerMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    const nodeX = x - this.nodeMoveXOffset
    const nodeY = y - this.nodeMoveYOffset

    this.expectedNodeXPosition = nodeX
    this.expectedNodeYPosition = nodeY

    if (!this.renderer.dragging) {
      this.renderer.dragging = true
      this.renderer.onNodeDragStart?.({
        type: 'nodeDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        nodeX,
        nodeY,
        target: this.node,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey
      })
    }

    this.renderer.onNodeDrag?.({
      type: 'nodeDrag',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      nodeX,
      nodeY,
      target: this.node,
      altKey: this.renderer.altKey,
      ctrlKey: this.renderer.ctrlKey,
      metaKey: this.renderer.metaKey,
      shiftKey: this.renderer.shiftKey
    })
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    this.renderer.clickedNode = undefined
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()
    this.nodeMoveXOffset = 0
    this.nodeMoveYOffset = 0

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)

    if (this.renderer.dragging) {
      this.renderer.dragging = false
      this.renderer.onNodeDragEnd?.({
        type: 'nodeDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        nodeX: this.node.x ?? 0,
        nodeY: this.node.y ?? 0,
        target: this.node,
        altKey: this.renderer.altKey,
        ctrlKey: this.renderer.ctrlKey,
        metaKey: this.renderer.metaKey,
        shiftKey: this.renderer.shiftKey
      })
    } else {
      this.renderer.onNodePointerUp?.({
        type: 'nodePointer',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        target: this.node,
        ...pointerKeysFromEvent(event.data.originalEvent)
      })
      this.renderer.onNodeClick?.({
        type: 'nodePointer',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        target: this.node,
        ...pointerKeysFromEvent(event.data.originalEvent)
      })

      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.renderer.onNodeDoubleClick?.({
          type: 'nodePointer',
          x,
          y,
          clientX: client.x,
          clientY: client.y,
          target: this.node,
          ...pointerKeysFromEvent(event.data.originalEvent)
        })
      }
    }
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined || this.renderer.hoveredNode !== this || this.renderer.dragging) return

    this.renderer.hoveredNode = undefined

    this.dirty = true
    this.renderer.dirty = true
    this.renderer.frontNodeLayer.removeChild(this.nodeContainer)
    this.renderer.frontLabelLayer.removeChild(this.labelContainer)
    this.renderer.nodesLayer.addChild(this.nodeContainer)
    this.renderer.labelsLayer.addChild(this.labelContainer)

    for (const subgraphNodeId in this.subgraphNodes) {
      this.renderer.frontNodeLayer.removeChild(this.subgraphNodes[subgraphNodeId].nodeContainer)
      this.renderer.frontLabelLayer.removeChild(this.subgraphNodes[subgraphNodeId].labelContainer)
      this.renderer.nodesLayer.addChild(this.subgraphNodes[subgraphNodeId].nodeContainer)
      this.renderer.labelsLayer.addChild(this.subgraphNodes[subgraphNodeId].labelContainer)
    }

    const { x, y } = this.renderer.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.renderer.onNodePointerLeave?.({
      type: 'nodePointer',
      x,
      y,
      clientX: client.x,
      clientY: client.y,
      target: this.node,
      ...pointerKeysFromEvent(event.data.originalEvent)
    })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
