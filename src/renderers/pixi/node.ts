import * as PIXI from 'pixi.js'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { PIXIRenderer as Renderer, NodeStyle } from '.'
import { colorToNumber, RADIANS_PER_DEGREE, HALF_PI, movePoint, parentInFront } from './utils'
import { Node, Edge } from '../../'
import { equals } from '../../utils'
import { CancellablePromise, FontLoader } from './FontLoader'
import { CircleSprite } from './sprites/circleSprite'


const LABEL_Y_PADDING = 2
const DEFAULT_NODE_FILL = colorToNumber('#666')
const DEFAULT_NODE_STROKE = colorToNumber('#aaa')
const DEFAULT_NODE_STROKE_WIDTH = 2
const DEFAULT_LABEL_FAMILY = 'Helvetica'
const DEFAULT_LABEL_COLOR = colorToNumber('#444')
const DEFAULT_LABEL_SIZE = 11
const DEFAULT_RADIUS = 18
const DEFAULT_BADGE_RADIUS = 8
const DEFAULT_BADGE_STROKE_WIDTH = 2


export class NodeRenderer<N extends Node, E extends Edge>{

  node: N
  x: number
  y: number
  radius: number
  strokeWidth = 0
  subgraphNodes: { [id: string]: NodeRenderer<N, E> } = {}
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
  private labelFamily?: string
  private labelColor?: number
  private labelSize?: number
  private labelWordWrap?: number
  private stroke?: NodeStyle['stroke']
  private icon?: NodeStyle['icon']
  private badge?: NodeStyle['badge']
  private nodeContainer = new PIXI.Container()
  private fillSprite: PIXI.Sprite
  private strokeSpriteContainer: PIXI.Container[] = []
  private strokeSprites: { sprite: PIXI.Sprite, width: number }[] = []
  private badgeSpriteContainer?: PIXI.Container
  private badgeSprites: { fill: PIXI.Sprite, stroke: PIXI.Sprite, icon?: PIXI.Sprite, angle: number }[] = []
  private labelContainer = new PIXI.Container() // TODO - create lazily
  private labelSprite?: PIXI.Text
  private iconSprite?: PIXI.Sprite
  private fontIconLoader?: CancellablePromise<string>
  private doubleClickTimeout: number | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0

  constructor(renderer: Renderer<N, E>, node: N, x: number, y: number, radius?: number, parent?: NodeRenderer<N, E>) {
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
    this.startX = this.endX = this.x = x
    this.startY = this.endY = this.y = y
    this.startRadius = this.endRadius = this.radius = radius ?? DEFAULT_RADIUS
    this.update(node)
  }

  update(node: N) {
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
    this.endRadius = node.radius ?? DEFAULT_RADIUS

    const interpolateRadiusNumber = interpolateNumber(this.startRadius, this.endRadius)
    this.interpolateRadius = interpolateBasis([this.startRadius, interpolateRadiusNumber(0.7), interpolateRadiusNumber(0.95), this.endRadius])


    /**
     * Styles
     */
    this.fillSprite.tint = this.node.style?.color === undefined ? DEFAULT_NODE_FILL : colorToNumber(this.node.style?.color)
    // this.fillOpacity = this.fillSprite.alpha = this.node.style?.fillOpacity ?? NODE_STYLES.fillOpacity // TODO - to enable fill opacity, mask out center of strokeSprite


    /**
     * Label
     */
    const labelFamily = node.style?.labelFamily ?? DEFAULT_LABEL_FAMILY
    const labelColor = node.style?.labelColor === undefined ? DEFAULT_LABEL_COLOR : colorToNumber(node.style?.labelColor)
    const labelSize = node.style?.labelSize ?? DEFAULT_LABEL_SIZE
    const labelWordWrap = node.style?.labelWordWrap

    if (
      node.label !== this.label ||
      labelFamily !== this.labelFamily ||
      labelColor !== this.labelColor ||
      labelSize !== this.labelSize ||
      labelWordWrap !== this.labelWordWrap
    ) {
      this.label = node.label
      this.labelFamily = labelFamily
      this.labelColor = labelColor
      this.labelSize = labelSize
      this.labelContainer.removeChildren()
      this.labelSprite?.destroy()
      this.labelSprite = undefined
      this.labelWordWrap = labelWordWrap

      if (this.label) {
        this.labelSprite = new PIXI.Text(this.label, {
          fontFamily: this.labelFamily,
          fontSize: this.labelSize * 2.5,
          fill: this.labelColor,
          lineJoin: 'round',
          stroke: '#fff',
          strokeThickness: 2.5 * 2.5,
          align: 'center',
          wordWrap: labelWordWrap !== undefined,
          wordWrapWidth: labelWordWrap,
        })
        this.labelSprite.position.set(0, this.radius + LABEL_Y_PADDING)
        this.labelSprite.anchor.set(0.5, 0)
        this.labelSprite.scale.set(0.4)
        this.labelContainer.addChild(this.labelSprite)
      }
    }


    /**
     * Strokes
     */
    if (!equals(node.style?.stroke, this.stroke)) {
      this.stroke = node.style?.stroke
      for (const container of this.strokeSpriteContainer) {
        this.nodeContainer.removeChild(container)
        container.destroy()
      }
      this.strokeSprites = []
      this.strokeSpriteContainer = []
      this.strokeWidth = 0

      if (this.stroke) {
        this.strokeWidth = this.stroke.reduce((sum, { width = DEFAULT_NODE_STROKE_WIDTH }) => sum + width, 0)

        for (const stroke of this.stroke) {
          const strokeSprite = this.renderer.circle.create()
          strokeSprite.tint = stroke.color === undefined ? DEFAULT_NODE_STROKE : colorToNumber(stroke.color)
          this.strokeSprites.push({ sprite: strokeSprite, width: stroke.width ?? DEFAULT_NODE_STROKE_WIDTH })

          const container = new PIXI.Container()
          container.addChild(strokeSprite)
          this.strokeSpriteContainer.push(container)
          this.nodeContainer.addChildAt(container, 0) // add to bottom
        }
      }
    }


    /**
     * Icon
     */
    if (!equals(node.style?.icon, this.icon)) {
      this.icon = node.style?.icon
      this.iconSprite?.destroy()

      this.iconSprite = undefined
      this.nodeContainer.removeChild(this.nodeContainer.getChildByName('icon'))

      if (this.icon?.type === 'textIcon') {
        this.fontIconLoader?.cancel()
        this.fontIconLoader = FontLoader(this.icon.family)
        this.fontIconLoader.then((family) => {
          if (this.icon?.type !== 'textIcon' || this.icon.family !== family) return
          // TOOD - reuse icon textures
          this.iconSprite = new PIXI.Text(this.icon.text, {
            fontFamily: this.icon.family,
            fontSize: this.icon.size * 2,
            fill: this.icon.color,
          })
          this.iconSprite.name = 'icon'
          this.iconSprite.position.set(0, 0)
          this.iconSprite.anchor.set(0.5)
          this.iconSprite.scale.set(0.5)

          if (this.badgeSpriteContainer === undefined) {
            // no badges - add to top of nodeContainer
            this.nodeContainer.addChild(this.iconSprite)
          } else {
            // badges - add below badges
            this.nodeContainer.addChildAt(this.iconSprite, this.nodeContainer.children.length - 1)
          }
        })
      } else if (this.icon?.type === 'imageIcon') {
        this.iconSprite = this.renderer.image.createSprite(this.icon.url)

        this.iconSprite.name = 'icon'
        this.iconSprite.position.set(this.icon.offset?.x ?? 0, this.icon.offset?.y ?? 0)
        this.iconSprite.anchor.set(0.5)
        this.iconSprite.scale.set(this.icon.scale ?? 1)

        if (this.badgeSpriteContainer === undefined) {
          // no badges - add to top of nodeContainer
          this.nodeContainer.addChild(this.iconSprite)
        } else {
          // badges - add below badges
          this.nodeContainer.addChildAt(this.iconSprite, this.nodeContainer.children.length - 1)
        }
      }
    }


    /**
     * Badges
     */
    if (!equals(node.style?.badge, this.badge)) {
      this.badge = node.style?.badge
      this.badgeSpriteContainer?.destroy()
      this.badgeSpriteContainer = undefined
      this.badgeSprites = []

      if (this.badge !== undefined) {
        this.badgeSpriteContainer = new PIXI.Container()

        for (const badge of this.badge) {
          const badgeRadius = badge.radius ?? DEFAULT_BADGE_RADIUS
          const badgeStrokeRadius = badgeRadius + (badge.strokeWidth ?? DEFAULT_BADGE_STROKE_WIDTH)
          const badgeFillSprite = this.renderer.circle.create()
          badgeFillSprite.tint = badge.color === undefined ? DEFAULT_NODE_FILL : colorToNumber(badge.color)
          badgeFillSprite.scale.set(badgeRadius / CircleSprite.radius)

          const badgeStrokeSprite = this.renderer.circle.create()
          badgeStrokeSprite.tint = badge.stroke === undefined ? DEFAULT_NODE_STROKE : colorToNumber(badge.stroke)
          badgeStrokeSprite.scale.set(badgeStrokeRadius / CircleSprite.radius)

          let badgeIconSprite: PIXI.Sprite | undefined

          if (badge.icon?.type === 'textIcon') {
            badgeIconSprite = new PIXI.Text(badge.icon.text, {
              fontFamily: badge.icon.family,
              fontSize: badge.icon.size * 2,
              fontWeight: 'bold',
              fill: badge.icon.color,
            })
            badgeIconSprite.position.set(0, 0)
            badgeIconSprite.anchor.set(0.5)
            badgeIconSprite.scale.set(0.5)
          }
          // } else if (badge.icon?.type === 'imageIcon') // TODO

          this.badgeSprites.push({ fill: badgeFillSprite, stroke: badgeStrokeSprite, icon: badgeIconSprite, angle: (badge.position * RADIANS_PER_DEGREE) - HALF_PI })

          this.badgeSpriteContainer.addChild(badgeStrokeSprite)
          this.badgeSpriteContainer.addChild(badgeFillSprite)
          badgeIconSprite !== undefined && this.badgeSpriteContainer.addChild(badgeIconSprite)
          this.nodeContainer.addChild(this.badgeSpriteContainer) // add to top
        }
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
    if (this.renderer.animationPercent < 1 && this.renderer.clickedNode?.node.id !== this.node.id) {
      this.x = this.interpolateX(this.renderer.animationPercent)
      this.y = this.interpolateY(this.renderer.animationPercent)
      this.radius = this.interpolateRadius(this.renderer.animationPercent)
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

    this.fillSprite.scale.set(this.radius / CircleSprite.radius)

    let strokeWidths = this.radius

    if (this.stroke !== undefined) {
      for (const { sprite, width } of this.strokeSprites) {
        strokeWidths += width
        sprite.scale.set(strokeWidths / CircleSprite.radius)
      }
    }

    if (this.badge !== undefined) {
      for (const { fill, stroke, icon, angle } of this.badgeSprites) {
        const [x, y] = movePoint(0, 0, angle, this.radius + this.strokeWidth)
        fill.position.set(x, y)
        stroke.position.set(x, y)
        icon !== undefined && icon.position.set(x, y)
      }
    }

    this.nodeContainer.hitArea = new PIXI.Circle(0, 0, this.radius + this.strokeWidth)

    if (this.labelSprite) {
      this.labelSprite.y = this.radius + this.strokeWidth + LABEL_Y_PADDING
    }

    for (const subgraphNodeId in this.subgraphNodes) {
      this.subgraphNodes[subgraphNodeId].render()
    }

    return this
  }

  delete() {
    for (const subgraphNodeId in this.subgraphNodes) {
      // exit subgraph node
      this.subgraphNodes[subgraphNodeId].delete()
    }
    this.nodeContainer.destroy()
    this.labelContainer.destroy()
    delete this.renderer.nodesById[this.node.id]
  }


  private pointerEnter = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined) return

    this.renderer.hoveredNode = this

    if (this.parent === undefined) {
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
    }

    const position = this.renderer.root.toLocal(event.data.global)
    this.renderer.onNodePointerEnter?.(event, this.node, position.x, position.y)
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined || this.renderer.hoveredNode !== this) return

    this.renderer.hoveredNode = undefined

    if (this.parent === undefined) {
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
    }

    const position = this.renderer.root.toLocal(event.data.global)
    this.renderer.onNodePointerLeave?.(event, this.node, position.x, position.y)
  }

  private pointerDown = (event: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedNode = this
    this.renderer.app.renderer.plugins.interaction.on('pointermove', this.nodeMove)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()
    const position = this.renderer.root.toLocal(event.data.global)
    this.nodeMoveXOffset = position.x - this.x
    this.nodeMoveYOffset = position.y - this.y
    this.renderer.onNodePointerDown?.(event, this.node, this.x, this.y)
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    this.renderer.clickedNode = undefined
    this.renderer.app.renderer.plugins.interaction.off('pointermove', this.nodeMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()
    this.nodeMoveXOffset = 0
    this.nodeMoveYOffset = 0
    this.renderer.onNodePointerUp?.(event, this.node, this.x, this.y)

    if (this.doubleClick) {
      this.doubleClick = false
      this.renderer.onNodeDoubleClick?.(event, this.node, this.x, this.y)
    }
  }

  private nodeMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    const position = this.renderer.root.toLocal(event.data.global)
    this.renderer.onNodeDrag?.(event, this.node, position.x - this.nodeMoveXOffset, position.y - this.nodeMoveYOffset)
  }


  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
