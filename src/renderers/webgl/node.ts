import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer, NodeStyle } from '.'
import { colorToNumber, RADIANS_PER_DEGREE, HALF_PI, movePoint, parentInFront } from './utils'
import { Node, Edge } from '../..'
import { equals, interpolate } from '../../utils'
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
  dirty = false

  private renderer: InternalRenderer<N, E>
  private depth: number
  private targetX: number
  private interpolateX?: () => { value: number, done: boolean }
  private expectedNodeXPosition?: number
  private targetY: number
  private interpolateY?: () => { value: number, done: boolean }
  private expectedNodeYPosition?: number
  private targetRadius: number
  private interpolateRadius?: () => { value: number, done: boolean }
  private label?: string
  private labelFamily?: string
  private labelColor?: number
  private labelSize?: number
  private labelWordWrap?: number
  private labelBackground?: string
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
    this.targetY= this.y = y
    this.targetRadius = this.radius = radius ?? DEFAULT_RADIUS
    this.update(node)
  }

  update(node: N) {
    this.node = node
    this.dirty = true

    const x = this.node.x ?? 0
    if (x !== this.targetX) {
      if (x === this.expectedNodeXPosition || !this.renderer.animatePosition) {
        this.interpolateX = undefined
        this.x = x
      } else {
        this.interpolateX = interpolate(this.x, x, this.renderer.animatePosition)
      }

      this.expectedNodeXPosition = undefined
      this.targetX = x
    }

    const y = this.node.y ?? 0
    if (y !== this.targetY) {
      if (y === this.expectedNodeYPosition || !this.renderer.animatePosition) {
        this.interpolateY = undefined
        this.y = y
      } else {
        this.interpolateY = interpolate(this.y, y, this.renderer.animatePosition)
      }

      this.expectedNodeYPosition = undefined
      this.targetY = y
    }

    const radius = this.node.radius
    if (radius !== this.targetRadius) {
      if (!this.renderer.animateRadius) {
        this.interpolateRadius = undefined
        this.radius = radius
      } else {
        this.interpolateRadius = interpolate(this.radius, radius, this.renderer.animateRadius)
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
    const labelFamily = node.style?.labelFamily ?? DEFAULT_LABEL_FAMILY
    const labelColor = node.style?.labelColor === undefined ? DEFAULT_LABEL_COLOR : colorToNumber(node.style?.labelColor)
    const labelSize = node.style?.labelSize ?? DEFAULT_LABEL_SIZE
    const labelWordWrap = node.style?.labelWordWrap
    const labelBackground = node.style?.labelBackground

    if (
      node.label !== this.label ||
      labelFamily !== this.labelFamily ||
      labelColor !== this.labelColor ||
      labelSize !== this.labelSize ||
      labelWordWrap !== this.labelWordWrap ||
      labelBackground !== this.labelBackground
    ) {
      this.label = node.label
      this.labelFamily = labelFamily
      this.labelColor = labelColor
      this.labelSize = labelSize
      this.labelWordWrap = labelWordWrap
      this.labelBackground = labelBackground
      this.labelContainer.removeChildren()
      this.labelSprite?.destroy()
      this.labelSprite = undefined
      this.labelLoader?.()

      if (this.label) {
        this.labelLoader = this.renderer.fontLoader.load(this.labelFamily)((family) => {
          if (this.label === undefined || this.labelFamily !== family) return

          this.renderer.dirty = true

          this.labelSprite = new PIXI.Text(this.label, {
            fontFamily: this.labelFamily,
            fontSize: (this.labelSize ?? labelSize) * 2.5, // TODO: is there a way to avoid this?
            fill: this.labelColor,
            lineJoin: 'round',
            stroke: this.labelBackground === undefined ? '#fff' : undefined,
            strokeThickness: this.labelBackground === undefined ? (2.5 * 2.5) : 0,
            align: 'center',
            wordWrap: labelWordWrap !== undefined,
            wordWrapWidth: labelWordWrap,
          })
          this.labelSprite.anchor.set(0.5, 0)
          this.labelSprite.scale.set(0.4)
          this.labelContainer.addChild(this.labelSprite)

          if (this.labelBackground) {
            this.labelBackgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE)
            this.labelBackgroundSprite.width = this.labelSprite.width + 4
            this.labelBackgroundSprite.height = this.labelSprite.height
            this.labelBackgroundSprite.tint = colorToNumber(this.labelBackground)
            this.labelBackgroundSprite.anchor.set(0.5, 0)
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
     * Badges
     */
    if (!equals(node.style?.badge, this.badge)) {
      this.badge = node.style?.badge
      this.badgeSpriteContainer?.destroy()
      this.badgeSpriteContainer = undefined
      this.badgeSprites = []
      this.badgeIconLoader.forEach((loader) => loader())

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
            const badgeIconLoader = this.renderer.fontLoader.load(badge.icon.family)((family) => {
              if (this.badgeSpriteContainer === undefined || badge.icon?.type !== 'textIcon' || badge.icon?.family !== family) return

              this.renderer.dirty = true

              badgeIconSprite = this.renderer.fontIcon.create(badge.icon.text, badge.icon.family, badge.icon.size, 'bold', badge.icon.color)

              this.badgeSprites.push({ fill: badgeFillSprite, stroke: badgeStrokeSprite, icon: badgeIconSprite, angle: (badge.position * RADIANS_PER_DEGREE) - HALF_PI })
              this.badgeSpriteContainer.addChild(badgeStrokeSprite)
              this.badgeSpriteContainer.addChild(badgeFillSprite)
              badgeIconSprite !== undefined && this.badgeSpriteContainer.addChild(badgeIconSprite)
              this.nodeContainer.addChild(this.badgeSpriteContainer) // add to top
            })
            this.badgeIconLoader.push(badgeIconLoader)
          } else if (badge.icon?.type === 'imageIcon') {
            const badgeIconLoader = this.renderer.imageLoader.load(badge.icon.url)((url) => {
              if (this.badgeSpriteContainer === undefined || badge.icon?.type !== 'imageIcon' || badge.icon?.url !== url) return

              this.renderer.dirty = true

              badgeIconSprite = this.renderer.image.create(badge.icon.url)
              this.badgeSprites.push({ fill: badgeFillSprite, stroke: badgeStrokeSprite, icon: badgeIconSprite, angle: (badge.position * RADIANS_PER_DEGREE) - HALF_PI })

              this.badgeSpriteContainer.addChild(badgeStrokeSprite)
              this.badgeSpriteContainer.addChild(badgeFillSprite)
              badgeIconSprite !== undefined && this.badgeSpriteContainer.addChild(badgeIconSprite)
              this.nodeContainer.addChild(this.badgeSpriteContainer) // add to top
            })
            this.badgeIconLoader.push(badgeIconLoader)
          }
        }
      }
    }


    /**
     * Icon
     */
    if (!equals(node.style?.icon, this.icon)) {
      this.icon = node.style?.icon
      if (this.iconSprite !== undefined) {
        this.nodeContainer.removeChild(this.iconSprite)
        this.iconSprite.destroy()
        this.iconSprite = undefined
        this.iconLoader?.()
      }

      if (this.icon?.type === 'textIcon') {
        this.iconLoader = this.renderer.fontLoader.load(this.icon.family)((family) => {
          if (this.icon?.type !== 'textIcon' || this.icon.family !== family) return

          this.renderer.dirty = true

          this.iconSprite = this.renderer.fontIcon.create(this.icon.text, this.icon.family, this.icon.size, 'normal', this.icon.color)

          /**
           * TODO - ensure that icons are added below badges
           */
          // if (this.badgeSpriteContainer === undefined) {
          //   this.nodeContainer.addChild(this.iconSprite) // no badges - add to top of nodeContainer
          // } else {
          //   this.nodeContainer.addChildAt(this.iconSprite, this.nodeContainer.children.length - 1) // badges - add below badges
          // }
          this.nodeContainer.addChild(this.iconSprite)
        })
      } else if (this.icon?.type === 'imageIcon') {
        this.iconLoader = this.renderer.imageLoader.load(this.icon.url)((url) => {
          if (this.icon?.type !== 'imageIcon' || this.icon.url !== url) return

          this.renderer.dirty = true

          this.iconSprite = this.renderer.image.create(this.icon.url, this.icon.scale, this.icon.offsetX, this.icon.offsetY)

          /**
           * TODO - ensure that icons are added below badges
           */
          // if (this.badgeSpriteContainer === undefined) {
          //   this.nodeContainer.addChild(this.iconSprite) // no badges - add to top of nodeContainer
          // } else {
          //   this.nodeContainer.addChildAt(this.iconSprite, this.nodeContainer.children.length - 1) // badges - add below badges
          // }
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
      const { value, done } = this.interpolateX()
      this.x = value

      if (done) {
        this.interpolateX = undefined
      } else {
        this.dirty = true
      }
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY()
      this.y = value

      if (done) {
        this.interpolateY = undefined
      } else {
        this.dirty = true
      }
    }

    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius()
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

    if (this.labelBackgroundSprite) {
      this.labelBackgroundSprite.y = this.radius + this.strokeWidth + LABEL_Y_PADDING
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
    }

    const position = this.renderer.root.toLocal(event.data.global)
    this.renderer.onNodePointerEnter?.(event, this.node, position.x, position.y)
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode !== undefined || this.renderer.hoveredNode !== this) return

    this.renderer.hoveredNode = undefined

    if (this.parent === undefined) {
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
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', this.nodeMove)
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
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).off('pointermove', this.nodeMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()
    this.nodeMoveXOffset = 0
    this.nodeMoveYOffset = 0

    if (this.renderer.dragging) {
      this.renderer.dragging = false
      this.renderer.onNodeDragEnd?.(event, this.node, this.x, this.y)
    } else {
      this.renderer.onNodePointerUp?.(event, this.node, this.x, this.y)

      if (this.doubleClick) {
        this.doubleClick = false
        this.renderer.onNodeDoubleClick?.(event, this.node, this.x, this.y)
      }
    }
  }

  private nodeMove = (event: PIXI.InteractionEvent) => {
    if (this.renderer.clickedNode === undefined) return

    const position = this.renderer.root.toLocal(event.data.global)
    const x = position.x - this.nodeMoveXOffset
    const y = position.y - this.nodeMoveYOffset

    this.expectedNodeXPosition = x
    this.expectedNodeYPosition = y

    if (!this.renderer.dragging) {
      this.renderer.dragging = true
      this.renderer.onNodeDragStart?.(event, this.node, x, y)
    }

    this.renderer.onNodeDrag?.(event, this.node, x, y)
  }


  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
