import {
  Container, FederatedPointerEvent, Graphics, MSAA_QUALITY, Matrix, RenderTexture, Renderer, Sprite
} from 'pixi.js-legacy'
import { InternalRenderer } from '.'
import { EMPTY_ARRAY, parentInFront } from './utils'
import * as Graph from '../..'
import { interpolate } from '../../utils'


const MAX_RADIUS_RESOLUTION = 250
const LABEL_Y_PADDING = 2
const DEFAULT_NODE_FILL = '#666'
const DEFAULT_NODE_STROKE = '#aaa'
const DEFAULT_NODE_STROKE_WIDTH = 2
const DEFAULT_LABEL_FAMILY = 'Helvetica'
const DEFAULT_LABEL_COLOR = '#444'
const DEFAULT_LABEL_SIZE = 11
const DEFAULT_RADIUS = 18
const DEFAULT_BADGE_RADIUS = 8
const DEFAULT_BADGE_STROKE_WIDTH = 2

export class NodeRenderer<N extends Graph.Node> {

  node: N
  x: number
  y: number
  radius: number
  strokeWidth = 0
  subgraphNodes: { [id: string]: NodeRenderer<N> } = {}
  parent?: NodeRenderer<N>

  private renderer: InternalRenderer<N>
  private depth: number
  private targetX: number
  private interpolateX?: (time: number) => { value: number; done: boolean }
  private expectedNodeXPosition?: number
  private targetY: number
  private interpolateY?: (time: number) => { value: number; done: boolean }
  private expectedNodeYPosition?: number
  private targetRadius: number
  private interpolateRadius?: (time: number) => { value: number; done: boolean }
  private container = new Container()
  private fillSprite: Sprite
  private strokeSprites: readonly { sprite: Sprite; width: number }[] = EMPTY_ARRAY
  // private strokeSpriteContainer: Container[] = EMPTY_ARRAY
  // private label?: string
  // private labelFamily?: string
  // private labelColor?: number
  // private labelSize?: number
  // private labelWordWrap?: number
  // private labelBackground?: string
  // private labelBackgroundOpacity?: number
  // private stroke?: NodeStyle['stroke']
  // private icon?: NodeStyle['icon']
  // private badge?: NodeStyle['badge']
  // private badgeSpriteContainer?: Container
  // private badgeSprites: {
  //   fill: Sprite
  //   stroke: Sprite
  //   icon?: Sprite
  //   angle: number
  //   iconXOffset?: number
  //   iconYOffset?: number
  // }[] = EMPTY_ARRAY
  // private labelContainer = new Container() // TODO - create lazily
  // private labelSprite?: Text
  // private labelBackgroundSprite?: Sprite
  // private iconSprite?: Sprite
  // private labelLoader?: () => void
  // private iconLoader?: () => void
  // private badgeIconLoader: (() => void)[] = EMPTY_ARRAY
  private doubleClickTimeout: number | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0

  // constructor(renderer: InternalRenderer<N, any>, node: N) {

  //   this.fillSprite.anchor.set(0.5)
  //   this.fillSprite.cullable = true
  //   this.container.addChild(this.fillSprite)
  //   this.update(this.node)
  // }

  constructor (renderer: InternalRenderer<N, any>, node: N, x?: number, y?: number, parent?: NodeRenderer<N>) {
    this.renderer = renderer

    this.parent = parent
    this.depth = parent ? parent.depth + 1 : 0

    this.fillSprite = new Sprite(this.renderer.circleTexture)
    this.fillSprite.anchor.set(0.5)
    this.container.eventMode = 'static'
    this.container.zIndex = this.depth
    this.container.cullable = true
    this.container.addEventListener('pointerover', this.pointerEnter) // pointerenter?
    this.container.addEventListener('pointerdown', this.pointerDown)
    this.container.addEventListener('pointerup', this.pointerUp)
    this.container.addEventListener('pointerupoutside', this.pointerUp)
    this.container.addEventListener('pointercancel', this.pointerUp)
    this.container.addEventListener('pointerout', (event) => this.pointerLeave(event)) // pointerleave?
    this.container.addChild(this.fillSprite)

    /**
     * if any ancestor is in front layer, add to front
     * otherwise, add to regular layers
     */
    // if (parentInFront(this.renderer, this.parent)) {
    //   this.renderer.frontNodeLayer.addChild(this.container)
    //   this.renderer.frontLabelLayer.addChild(this.labelContainer)
    // } else {
    //   this.renderer.nodesLayer.addChild(this.container)
    //   this.renderer.labelsLayer.addChild(this.labelContainer)
    // }
    this.renderer.nodesLayer.addChild(this.container)

    this.node = node
    this.targetX = this.x = x ?? node.x ?? 0
    this.targetY = this.y = y ?? node.y ?? 0
    this.targetRadius = this.radius = node.radius ?? DEFAULT_RADIUS
    this.update(node)
  }

  update = (node: N) => {
    this.node = node

    const x = this.node.x ?? 0
    if (x !== this.targetX) {
      if (x === this.expectedNodeXPosition || !this.renderer.animateNodePosition || this.renderer.clickedNode) {
        this.interpolateX = undefined
        this.x = x
      } else {
        this.interpolateX = interpolate( this.x, x, this.renderer.animateNodePosition,)
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
        this.interpolateY = interpolate(this.y, y, this.renderer.animateNodePosition)
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
        this.interpolateRadius = interpolate(this.radius, radius, this.renderer.animateNodeRadius,)
      }

      this.targetRadius = radius
    }

    // if (this.parent) {
    //   this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x
    //   this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y
    // } else {
    //   this.nodeContainer.x = this.labelContainer.x = this.x
    //   this.nodeContainer.y = this.labelContainer.y = this.y
    // }
    this.container.x = this.x
    this.container.y = this.y

    /**
     * Styles
     */
    this.fillSprite.tint = this.node.style?.color ?? 0x000000

    return this
  }

  render = (dt: number) => {
    if (this.interpolateX) {
      const { value, done } = this.interpolateX(dt)
      this.x = value

      if (done) {
        this.interpolateX = undefined
      }
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY(dt)
      this.y = value

      if (done) {
        this.interpolateY = undefined
      }
    }

    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(dt)
      this.radius = value

      if (done) {
        this.interpolateRadius = undefined
      }
    }

    // if (this.parent) {
    //   this.nodeContainer.x = this.labelContainer.x = this.x + this.parent.x
    //   this.nodeContainer.y = this.labelContainer.y = this.y + this.parent.y
    // } else {
    //   this.nodeContainer.x = this.labelContainer.x = this.x
    //   this.nodeContainer.y = this.labelContainer.y = this.y
    // }

    this.fillSprite.scale.set(this.radius / MAX_RADIUS_RESOLUTION)
  }

  delete = () => {

  }

  private pointerEnter = (event: FederatedPointerEvent) => {
    if (
      this.renderer.hoveredNode === this ||
      this.renderer.clickedNode !== undefined ||
      this.renderer.dragInteraction.dragging
    ) {
      return
    }

    if (
      this.renderer.onNodePointerDown ||
      this.renderer.onNodeDrag ||
      this.renderer.onNodeClick ||
      this.renderer.onNodeDoubleClick ||
      this.renderer.onNodePointerUp
    ) {
      this.renderer.container.style.cursor = 'pointer'
    }

    this.renderer.hoveredNode = this

    // this.renderer.nodesLayer.removeChild(this.nodeContainer)
    // this.renderer.labelsLayer.removeChild(this.labelContainer)
    // this.renderer.frontNodeLayer.addChild(this.nodeContainer)
    // this.renderer.frontLabelLayer.addChild(this.labelContainer)

    // for (const subgraphNodeId in this.subgraphNodes) {
    //   this.renderer.nodesLayer.removeChild(
    //     this.subgraphNodes[subgraphNodeId].nodeContainer
    //   )
    //   this.renderer.labelsLayer.removeChild(
    //     this.subgraphNodes[subgraphNodeId].labelContainer
    //   )
    //   this.renderer.frontNodeLayer.addChild(
    //     this.subgraphNodes[subgraphNodeId].nodeContainer
    //   )
    //   this.renderer.frontLabelLayer.addChild(
    //     this.subgraphNodes[subgraphNodeId].labelContainer
    //   )
    // }

    const local = this.renderer.root.toLocal(event.global)
    this.renderer.onNodePointerEnter?.({
      type: 'nodePointer',
      x: local.x, // necessary?
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.node,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerDown = (event: FederatedPointerEvent) => {
    event.stopPropagation()

    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.renderer.clickedNode = this
    this.renderer.root.addEventListener('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.pause()
    this.renderer.dragInteraction.pause()
    this.renderer.decelerateInteraction.pause()

    const local = this.renderer.root.toLocal(event.global)
    this.nodeMoveXOffset = local.x - this.x
    this.nodeMoveYOffset = local.y - this.y
    this.renderer.onNodePointerDown?.({
      type: 'nodePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.node,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerMove = (event: FederatedPointerEvent) => {
    if (this.renderer.clickedNode === undefined) return

    const local = this.renderer.root.toLocal(event.global)
    const nodeX = local.x - this.nodeMoveXOffset
    const nodeY = local.y - this.nodeMoveYOffset

    this.expectedNodeXPosition = nodeX
    this.expectedNodeYPosition = nodeY

    if (!this.renderer.dragInteraction.dragging) {
      this.renderer.dragInteraction.dragging = true
      this.renderer.onNodeDragStart?.({
        type: 'nodeDrag',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        nodeX,
        nodeY,
        target: this.node,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    this.renderer.onNodeDrag?.({
      type: 'nodeDrag',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      nodeX, // necessary
      nodeY,
      target: this.node,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerUp = (event: FederatedPointerEvent) => {
    if (this.renderer.clickedNode === undefined) {
      return
    }

    event.stopPropagation()

    this.renderer.clickedNode = undefined
    this.renderer.root.removeEventListener('pointermove', this.pointerMove)
    this.renderer.zoomInteraction.resume()
    this.renderer.dragInteraction.resume()
    this.renderer.decelerateInteraction.resume()
    this.nodeMoveXOffset = 0
    this.nodeMoveYOffset = 0

    const local = this.renderer.root.toLocal(event.data.global)

    if (this.renderer.dragInteraction.dragging) {
      this.renderer.dragInteraction.dragging = false
      this.renderer.onNodeDragEnd?.({
        type: 'nodeDrag',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        nodeX: this.node.x ?? 0,
        nodeY: this.node.y ?? 0,
        target: this.node,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
      this.renderer.onNodePointerUp?.({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.node,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    } else {
      this.renderer.onNodePointerUp?.({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.node,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
      this.renderer.onNodeClick?.({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.node,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.renderer.onNodeDoubleClick?.({
          type: 'nodePointer',
          x: local.x,
          y: local.y,
          clientX: event.clientX,
          clientY: event.clientY,
          target: this.node,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        })
      }
    }
  }

  private pointerLeave = (event: FederatedPointerEvent) => {
    if (
      !this.renderer.dragInteraction.dragging && (
        this.renderer.onNodePointerDown ||
        this.renderer.onNodeDrag ||
        this.renderer.onNodeClick ||
        this.renderer.onNodeDoubleClick ||
        this.renderer.onNodePointerUp
      )
    ) {
      this.renderer.container.style.cursor = 'auto'
    }

    if (
      this.renderer.hoveredNode !== this ||
      this.renderer.clickedNode !== undefined ||
      this.renderer.dragInteraction.dragging
    ) {
      return
    }

    this.renderer.hoveredNode = undefined

    // this.renderer.frontNodeLayer.removeChild(this.nodeContainer)
    // this.renderer.frontLabelLayer.removeChild(this.labelContainer)
    // this.renderer.nodesLayer.addChild(this.nodeContainer)
    // this.renderer.labelsLayer.addChild(this.labelContainer)

    // for (const subgraphNodeId in this.subgraphNodes) {
    //   this.renderer.frontNodeLayer.removeChild(
    //     this.subgraphNodes[subgraphNodeId].nodeContainer
    //   )
    //   this.renderer.frontLabelLayer.removeChild(
    //     this.subgraphNodes[subgraphNodeId].labelContainer
    //   )
    //   this.renderer.nodesLayer.addChild(
    //     this.subgraphNodes[subgraphNodeId].nodeContainer
    //   )
    //   this.renderer.labelsLayer.addChild(
    //     this.subgraphNodes[subgraphNodeId].labelContainer
    //   )
    // }

    const local = this.renderer.root.toLocal(event.global)
    this.renderer.onNodePointerLeave?.({
      type: 'nodePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.node,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}


export const createCircleTexture = (renderer: InternalRenderer<any, any>) => {
  const GRAPHIC = new Graphics()
    .beginFill(0xffffff)
    .drawCircle(0, 0, MAX_RADIUS_RESOLUTION)

  const renderTexture = RenderTexture.create({
    width: GRAPHIC.width,
    height: GRAPHIC.height,
    multisample: MSAA_QUALITY.HIGH,
    resolution: 2
  })

  renderer.app.renderer.render(GRAPHIC, {
    renderTexture,
    transform: new Matrix(1, 0, 0, 1, GRAPHIC.width / 2, GRAPHIC.height / 2)
  })

  if (renderer.app.renderer instanceof Renderer) {
    renderer.app.renderer.framebuffer.blit()
  }

  GRAPHIC.destroy(true)

  return renderTexture
}
