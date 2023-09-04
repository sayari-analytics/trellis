import {
  BitmapFont, BitmapText, FederatedPointerEvent, Graphics, IBitmapTextStyle,
  MSAA_QUALITY, Matrix, RenderTexture, Renderer, Sprite
} from 'pixi.js-legacy'
import { MIN_LABEL_ZOOM, MIN_NODE_INTERACTION_ZOOM, MIN_NODE_STROKE_ZOOM, StaticRenderer } from '.'
import * as Graph from '../../'


const NODE_RESOLUTION_RADIUS = 10 * 5 // maxRadius * minZoom -- TODO make configurable
const DEFAULT_NODE_FILL = 0xaaaaaa
const DEFAULT_NODE_STROKE_WIDTH = 2


export class NodeRenderer {

  static createCircleTexture(renderer: StaticRenderer) {
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

  static fontSize = 10
  static font = BitmapFont.from('Label', {
    fontFamily: 'Arial',
    fontSize: NodeRenderer.fontSize * 2 * 5, // font size * retina * minZoom
    fill: 0x000000,
    stroke: 0xffffff,
    strokeThickness: 1.5 * 2 * 5, // strokeThickness * retina * minZoom
  }, { chars: BitmapFont.ASCII })
  static TEXT_STYLE: Partial<IBitmapTextStyle> = {
    fontName: 'Label', fontSize: NodeRenderer.fontSize, align: 'center'
  }

  node?: Graph.Node
  
  #renderer: StaticRenderer
  #fill: Sprite
  #label?: BitmapText
  #strokes?: Sprite[]
  #maxStrokeRadius?: number
  #minX!: number
  #minY!: number
  #maxX!: number
  #maxY!: number
  #doubleClickTimeout: number | undefined
  #doubleClick = false
  #nodeMoveXOffset: number = 0
  #nodeMoveYOffset: number = 0
  fillMounted = false
  strokesMounted = false
  labelMounted = false

  constructor(renderer: StaticRenderer, node: Graph.Node) {
    this.#renderer = renderer

    this.#fill = new Sprite(this.#renderer.circleTexture)
    this.#fill.anchor.set(0.5)
    this.#fill.visible = false
    this.#renderer.nodesContainer.addChild(this.#fill)

    // TODO - disable events if node has no event handlers
    // TODO - disable events if node diameter > ~5px
    // TODO - disable events when dragging/scrolling
    this.#fill.eventMode = 'static'
    // why doesn't this work? does this need a container?
    // this.#fill.hitArea = new Circle(this.node.x ?? 0, this.node.y ?? 0, fullRadius)
    this.#fill.addEventListener('pointerover', this.pointerEnter)
    this.#fill.addEventListener('pointerdown', this.pointerDown)
    this.#fill.addEventListener('pointerup', this.pointerUp)
    this.#fill.addEventListener('pointerupoutside', this.pointerUp)
    this.#fill.addEventListener('pointercancel', this.pointerUp)
    this.#fill.addEventListener('pointerout', (event) => this.pointerLeave(event))

    this.update(node)
  }

  update(node: Graph.Node) {
    if (node.style?.color !== this.node?.style?.color) {
      this.#fill.tint = node.style?.color ?? DEFAULT_NODE_FILL
    }
    if (node.radius !== this.node?.radius) {
      this.#fill.scale.set(node.radius / NODE_RESOLUTION_RADIUS)
    }
    if (node.x !== this.node?.x) {
      this.#fill.x = node.x ?? 0
    }
    if (node.y !== this.node?.y) {
      this.#fill.y = node.y ?? 0
    }


    /**
     * Update Stroke
     */
    if (node.style?.stroke !== this.node?.style?.stroke) {
      if (this.#strokes !== undefined) {
        // exit
        for (let i = this.#strokes.length - 1; i >= 0; i--) {
          this.#renderer.nodesContainer.removeChild(this.#strokes[i])
        }
        this.strokesMounted = false

        for (const stroke of this.#strokes) {
          stroke.destroy()
        }
        this.#strokes = undefined
      }

      if (node.style?.stroke?.length) {
        // enter
        this.#strokes = Array(node.style.stroke.length)
  
        let radius = node.radius
  
        for (let i = 0; i < node.style.stroke.length; i++) {
          radius += node.style.stroke[i].width ?? DEFAULT_NODE_STROKE_WIDTH
          const stroke = new Sprite(this.#renderer.circleTexture)
          stroke.anchor.set(0.5)
          stroke.scale.set(radius / NODE_RESOLUTION_RADIUS)
          stroke.tint = node.style.stroke[i].color ?? DEFAULT_NODE_FILL
          stroke.x = node.x ?? 0
          stroke.y = node.y ?? 0
          this.#strokes[i] = stroke
          this.#maxStrokeRadius = radius
        }
      } else {
        this.#maxStrokeRadius = node.radius
      }
    } else if (this.#strokes) {
      for (let i = 0; i < this.#strokes.length; i++) {
        this.#strokes[i].x = node.x ?? 0
        this.#strokes[i].y = node.y ?? 0
      }
    }


    /**
     * Update Label
     */
    if (node.label !== this.node?.label) {
      if (node.label) {
        if (this.#label === undefined) {
          // enter
          this.#label = new BitmapText(node.label, NodeRenderer.TEXT_STYLE)
          this.#label.anchor.set(0.5, 0)
        }

        this.#label.text = node.label
        this.#label.x = this.#fill.x
        this.#label.y = this.#fill.y + (this.#maxStrokeRadius ?? node.radius)
      } else if (this.#label) {
        // exit
        this.#renderer.labelsContainer.removeChild(this.#label)
        this.labelMounted = false
        this.#label.destroy()
        this.#label = undefined
      }
    } else if (this.#label) {
      this.#label.x = this.#fill.x
      this.#label.y = this.#fill.y + (this.#maxStrokeRadius ?? node.radius)
    }

    // TODO - consider label to calculate min/max // this.#label?.getBounds(true).width
    this.#minX = this.#fill.x - (this.#maxStrokeRadius ?? node.radius)
    this.#minY = this.#fill.y - (this.#maxStrokeRadius ?? node.radius)
    this.#maxX = this.#fill.x + (this.#maxStrokeRadius ?? node.radius)
    this.#maxY = this.#fill.y + (this.#maxStrokeRadius ?? node.radius)

    this.node = node

    return this
  }

  render() {
    const isVisible = this.visible(this.#minX, this.#minY, this.#maxX, this.#maxY)

    // TODO - enable/disable events based on node screen pixel width, not fixed zoom
    if (isVisible && this.#renderer.zoom > MIN_NODE_INTERACTION_ZOOM) {
      this.#fill.eventMode = 'static'
    } else {
      this.#fill.eventMode = 'none'
    }

    // TODO - why is mounting/unmouting fill Sprite less efficient?
    if (isVisible){
      if (!this.fillMounted) {
        this.#fill.visible = true
        // this.#renderer.nodesContainer.addChild(this.#fill)
        this.fillMounted = true
      }
    } else {
      if (this.fillMounted) {
        this.#fill.visible = false
        // this.#renderer.nodesContainer.removeChild(this.#fill)
        this.fillMounted = false
      }
    }

    if (this.#strokes) {
      if (isVisible && this.#renderer.zoom > MIN_NODE_STROKE_ZOOM) {
        if (!this.strokesMounted) {
          const strokeContainerIndex = this.#renderer.nodesContainer.getChildIndex(this.#fill)

          for (let i = this.#strokes.length - 1; i >= 0; i--) {
            this.#renderer.nodesContainer.addChildAt(this.#strokes[i], strokeContainerIndex)
          }

          this.strokesMounted = true
        }
      } else {
        if (this.strokesMounted) {
          for (let i = this.#strokes.length - 1; i >= 0; i--) {
            this.#renderer.nodesContainer.removeChild(this.#strokes[i])
          }

          this.strokesMounted = false
        }
      }
    }

    if (this.#label) {
      if (isVisible && this.#renderer.zoom > MIN_LABEL_ZOOM) {
        // this.#label.alpha = this.#renderer.zoom <= MIN_LABEL_ZOOM + 0.1 ?
        //   (this.#renderer.zoom - MIN_LABEL_ZOOM) / MIN_LABEL_ZOOM + 0.1 : 1

        if (!this.labelMounted) {
          this.#renderer.labelsContainer.addChild(this.#label)
          this.labelMounted = true
        }
      } else {
        if (this.labelMounted) {
          this.#renderer.labelsContainer.removeChild(this.#label)
          this.labelMounted = false
        }
      }
    }
  }

  delete() {
    clearTimeout(this.#doubleClickTimeout)
  }

  private visible(minX: number, minY: number, maxX: number, maxY: number) {
    return maxX >= this.#renderer.minX && minX <= this.#renderer.maxX &&
      maxY >= this.#renderer.minY && minY <= this.#renderer.maxY
  }

  private pointerEnter = (event: FederatedPointerEvent) => {
    if (this.#renderer.dragInteraction.dragging || this.#renderer.zoomInteraction.zooming) {
      return
    }

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
      target: this.node!,
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
        target: this.node!,
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
      this.#nodeMoveXOffset = local.x - (this.node!.x ?? 0)
      this.#nodeMoveYOffset = local.y - (this.node!.y ?? 0)
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
        target: this.node!,
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
      dx: local.x - (this.node!.x ?? 0) - this.#nodeMoveXOffset,
      dy: local.y - (this.node!.y ?? 0) - this.#nodeMoveYOffset,
      target: this.node!,
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
          target: this.node!,
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
      target: this.node!,
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
        target: this.node!,
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
          target: this.node!,
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
    if (this.#renderer.dragInteraction.dragging || this.#renderer.zoomInteraction.zooming) {
      return
    }

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
      target: this.node!,
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

// class Circle implements IHitArea {

//   x: number
//   y: number
//   minX: number
//   minY: number
//   maxX: number
//   maxY: number
//   radius: number
//   // squaredDistance: number

//   constructor(x: number, y: number, radius: number) {
//     this.x = x
//     this.y = y
//     this.minX = x - radius
//     this.minY = y - radius
//     this.maxX = x + radius
//     this.maxY = y + radius
//     this.radius = radius
//     // this.squaredDistance = Math.pow(radius, 2)
//   }

//   update(x: number, y: number, radius: number) {
//     this.x = x
//     this.y = y
//     this.minX = x - radius
//     this.minY = y - radius
//     this.maxX = x + radius
//     this.maxY = y + radius
//     this.radius = radius
//   }

//   contains(x: number, y: number): boolean {
//     return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY
//     // return Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2) < this.squaredDistance
//   }
// }
