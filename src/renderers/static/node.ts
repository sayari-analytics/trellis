import {
  BitmapFont, BitmapText, FederatedPointerEvent, Graphics, IBitmapTextStyle,
  MSAA_QUALITY, Matrix, RenderTexture, Renderer, Sprite
} from 'pixi.js-legacy'
import { StaticRenderer } from '.'
import * as Graph from '../../'


const NODE_RESOLUTION_RADIUS = 10 * 5 // maxRadius * minZoom -- TODO make configurable


export class Node {

  static fontSize = 10
  static font = BitmapFont.from('Label', {
    fontFamily: 'Arial',
    fontSize: Node.fontSize * 2 * 5, // font size * retina * minZoom
    fill: 0x000000,
    stroke: 0xffffff,
    strokeThickness: 2 * 2 * 5,
  }, { chars: BitmapFont.ASCII })
  static TEXT_STYLE: Partial<IBitmapTextStyle> = { fontName: 'Label', fontSize: Node.fontSize, align: 'center' }

  node: Graph.Node
  
  #renderer: StaticRenderer
  #circle: Sprite
  #label: BitmapText
  #minX: number
  #minY: number
  #maxX: number
  #maxY: number
  #doubleClickTimeout: number | undefined
  #doubleClick = false
  #nodeMoveXOffset: number = 0
  #nodeMoveYOffset: number = 0

  constructor(renderer: StaticRenderer, node: Graph.Node) {
    this.node = node
    this.#renderer = renderer
    this.#circle = new Sprite(this.#renderer.circleTexture)
    this.#circle.anchor.set(0.5)
    this.#circle.tint = 0xff4444
    this.#circle.scale.set(this.node.radius / NODE_RESOLUTION_RADIUS)
    this.#circle.x = node.x ?? 0
    this.#circle.y = node.y ?? 0
    this.#minX = this.#circle.x - this.node.radius
    this.#minY = this.#circle.y - this.node.radius
    this.#maxX = this.#circle.x + this.node.radius
    this.#maxY = this.#circle.y + this.node.radius
    // TODO - disable events if node has no event handlers
    // TODO - disable events if node diameter > ~5px
    // TODO - disable events when dragging/scrolling
    this.#circle.eventMode = 'static'
    this.#circle.addEventListener('pointerover', this.pointerEnter)
    this.#circle.addEventListener('pointerdown', this.pointerDown)
    this.#circle.addEventListener('pointerup', this.pointerUp)
    this.#circle.addEventListener('pointerupoutside', this.pointerUp)
    this.#circle.addEventListener('pointercancel', this.pointerUp)
    this.#circle.addEventListener('pointerout', (event) => this.pointerLeave(event))
    this.#renderer.root.addChild(this.#circle)

    this.#label = new BitmapText('88.26.3876', Node.TEXT_STYLE)
    this.#label.anchor.set(0.5, 0)
    this.#label.x = this.#circle.x
    this.#label.y = this.#circle.y + this.node.radius
    this.#renderer.labelContainer.addChild(this.#label)
  }

  render() {
    if (
      this.#maxX < this.#renderer.minX ||
      this.#maxY < this.#renderer.minY ||
      this.#minX > this.#renderer.maxX ||
      this.#minY > this.#renderer.maxY
    ) {
      this.#circle.visible = false
      this.#label.visible = false
    } else {
      this.#circle.visible = true
      this.#label.visible = true
    }
  }

  delete() {
    clearTimeout(this.#doubleClickTimeout)
  }

  private pointerEnter = (event: FederatedPointerEvent) => {
    if (
      this.#renderer.onNodePointerDown ||
      this.#renderer.onNodeDrag ||
      this.#renderer.onNodeClick ||
      this.#renderer.onNodeDoubleClick ||
      this.#renderer.onNodePointerUp
    ) {
      this.#renderer.container.style.cursor = 'pointer'
    }

    const local = this.#renderer.root.toLocal(event.global)
    this.#renderer.onNodePointerEnter?.({
      type: 'nodePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.node,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerDown = (event: FederatedPointerEvent) => {
    const local = this.#renderer.root.toLocal(event.global)

    if (this.#renderer.onNodeDoubleClick) {
      if (this.#doubleClickTimeout === undefined) {
        this.#doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.#doubleClick = true
      }
    }

    if (this.#renderer.onNodePointerDown) {
      this.#renderer.onNodePointerDown?.({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.node,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }
    
    if (this.#renderer.onNodeDrag) {
      event.stopPropagation()

      this.#renderer.container.style.cursor = 'move'
      this.#nodeMoveXOffset = local.x - (this.node.x ?? 0)
      this.#nodeMoveYOffset = local.y - (this.node.y ?? 0)
      this.#renderer.root.addEventListener('pointermove', this.pointerMove)
      this.#renderer.zoomInteraction.pause()
      this.#renderer.dragInteraction.pause()
      this.#renderer.decelerateInteraction.pause()
    }
  }

  private pointerMove = (event: FederatedPointerEvent) => {
    event.stopPropagation()

    const local = this.#renderer.root.toLocal(event.global)

    if (!this.#renderer.dragInteraction.dragging) {
      this.#renderer.dragInteraction.dragging = true
      this.#renderer.onNodeDragStart?.({
        type: 'nodeDrag',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        dx: 0,
        dy: 0,
        target: this.node,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    this.#renderer.onNodeDrag?.({
      type: 'nodeDrag',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: local.x - (this.node.x ?? 0) - this.#nodeMoveXOffset,
      dy: local.y - (this.node.y ?? 0) - this.#nodeMoveYOffset,
      target: this.node,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerUp = (event: FederatedPointerEvent) => {
    const isDragging = this.#renderer.dragInteraction.dragging
    const local = this.#renderer.root.toLocal(event.global)

    if (this.#renderer.onNodeDrag) {
      event.stopPropagation()
      this.#renderer.container.style.cursor = 'auto'
      this.#renderer.root.removeEventListener('pointermove', this.pointerMove)
      this.#renderer.zoomInteraction.resume()
      this.#renderer.dragInteraction.resume()
      this.#renderer.decelerateInteraction.resume()
      this.#nodeMoveXOffset = 0
      this.#nodeMoveYOffset = 0

      if (this.#renderer.dragInteraction.dragging) {
        this.#renderer.dragInteraction.dragging = false
        this.#renderer.onNodeDragEnd?.({
          type: 'nodeDrag',
          x: local.x,
          y: local.y,
          clientX: event.clientX,
          clientY: event.clientY,
          dx: 0,
          dy: 0,
          target: this.node,
          targetIdx: 0, // TODO
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        })
      }
    }

    this.#renderer.onNodePointerUp?.({
      type: 'nodePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.node,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })

    if (!isDragging) {
      this.#renderer.onNodeClick?.({
        type: 'nodePointer',
        x: local.x,
        y: local.y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.node,
        targetIdx: 0, // TODO
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
      if (this.#doubleClick) {
        this.#doubleClick = false
        clearTimeout(this.#doubleClickTimeout)
        this.#renderer.onNodeDoubleClick?.({
          type: 'nodePointer',
          x: local.x,
          y: local.y,
          clientX: event.clientX,
          clientY: event.clientY,
          target: this.node,
          targetIdx: 0, // TODO
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
      !this.#renderer.dragInteraction.dragging && (
        this.#renderer.onNodePointerDown ||
        this.#renderer.onNodeDrag ||
        this.#renderer.onNodeClick ||
        this.#renderer.onNodeDoubleClick ||
        this.#renderer.onNodePointerUp
      )
    ) {
      this.#renderer.container.style.cursor = 'auto'
    }

    const local = this.#renderer.root.toLocal(event.global)
    this.#renderer.onNodePointerLeave?.({
      type: 'nodePointer',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.node,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private clearDoubleClick = () => {
    this.#doubleClickTimeout = undefined
    this.#doubleClick = false
  }
}


export const createCircleTexture = (renderer: StaticRenderer) => {
  const GRAPHIC = new Graphics()
    .beginFill(0xffffff)
    .drawCircle(0, 0, NODE_RESOLUTION_RADIUS)

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
