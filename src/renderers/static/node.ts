import { FederatedPointerEvent, Sprite } from 'pixi.js-legacy'
import { MIN_LABEL_ZOOM, MIN_NODE_INTERACTION_ZOOM, MIN_NODE_STROKE_ZOOM, StaticRenderer } from '.'
import * as Graph from '../../'
import { Label } from './objects/label'
import { positionNodeLabel } from './utils'
import { NodeFill } from './objects/nodeFill'


export class NodeRenderer {

  node?: Graph.Node
  x!: number
  y!: number
  
  #renderer: StaticRenderer
  fill: NodeFill
  label?: Label
  #strokes?: Sprite[]
  maxStrokeRadius!: number
  #minX!: number
  #minY!: number
  #maxX!: number
  #maxY!: number
  #doubleClickTimeout: number | undefined
  #doubleClick = false
  #nodeMoveXOffset: number = 0
  #nodeMoveYOffset: number = 0
  strokesMounted = false

  constructor(renderer: StaticRenderer, node: Graph.Node) {
    this.#renderer = renderer
    this.fill = new NodeFill(this.#renderer, this, node)
    this.update(node)
  }

  update(node: Graph.Node) {
    /**
     * Update Fill
     */
    this.x = node.x ?? 0
    this.y = node.y ?? 0
    this.fill.update(node)
    this.maxStrokeRadius = node.radius

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
          radius += node.style.stroke[i].width
          const stroke = new Sprite(this.#renderer.circle.texture)
          stroke.anchor.set(0.5)
          stroke.scale.set(radius / this.#renderer.circle.scaleFactor)
          stroke.tint = node.style.stroke[i].color
          stroke.x = node.x ?? 0
          stroke.y = node.y ?? 0
          this.#strokes[i] = stroke
          this.maxStrokeRadius = radius
        }
      }
    } else if (this.#strokes) {
      // reposition
      for (let i = 0; i < this.#strokes.length; i++) {
        this.#strokes[i].x = this.x
        this.#strokes[i].y = this.y
      }
    }


    /**
     * Update Label
     */
    if (node.label !== this.node?.label || node.style?.label !== this.node?.style?.label) {
      if (this.label === undefined) {
        if (node.label) {
          // enter
          this.label = new Label(this.#renderer, node.label, node.style?.label)
            .position(...positionNodeLabel(
              this.x, this.y, this.maxStrokeRadius ?? node.radius, node.style?.label?.orientation
            ))
        }
      } else {
        if (node.label) {
          // update
          this.label
            .update(node.label, node.style?.label)
            .position(...positionNodeLabel(
              this.x, this.y, this.maxStrokeRadius ?? node.radius, node.style?.label?.orientation
            ))
        } else {
          // exit
          this.label = this.label.delete()
        }
      }
    } else if (this.label) {
      // reposition
      this.label.position(...positionNodeLabel(
        this.x, this.y, this.maxStrokeRadius ?? node.radius, node.style?.label?.orientation
      ))
    }

    // TODO - consider label to calculate min/max // this.label?.getBounds(true).width
    this.#minX = this.x - (this.maxStrokeRadius ?? node.radius)
    this.#minY = this.y - (this.maxStrokeRadius ?? node.radius)
    this.#maxX = this.x + (this.maxStrokeRadius ?? node.radius)
    this.#maxY = this.y + (this.maxStrokeRadius ?? node.radius)

    this.node = node

    return this
  }

  render() {
    const isVisible = this.visible(this.#minX, this.#minY, this.#maxX, this.#maxY)

    // TODO - enable/disable events based on node screen pixel width, not fixed zoom
    if (isVisible && this.#renderer.zoom > MIN_NODE_INTERACTION_ZOOM) {
      this.fill.circle.eventMode = 'static'
    } else {
      this.fill.circle.eventMode = 'none'
    }

    if (isVisible){
      this.fill.mount()
    } else {
      this.fill.unmount()
    }

    if (this.#strokes) {
      if (isVisible && this.#renderer.zoom > MIN_NODE_STROKE_ZOOM) {
        if (!this.strokesMounted) {
          const strokeContainerIndex = this.#renderer.nodesContainer.getChildIndex(this.fill.circle)

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

    if (this.label) {
      if (isVisible && this.#renderer.zoom > MIN_LABEL_ZOOM) {
        // this.label.alpha = this.#renderer.zoom <= MIN_LABEL_ZOOM + 0.1 ?
        //   (this.#renderer.zoom - MIN_LABEL_ZOOM) / MIN_LABEL_ZOOM + 0.1 : 1
        this.label.mount()
      } else {
        this.label.unmount()
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

  pointerEnter = (event: FederatedPointerEvent) => {
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

  pointerDown = (event: FederatedPointerEvent) => {
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

  pointerMove = (event: FederatedPointerEvent) => {
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

  pointerUp = (event: FederatedPointerEvent) => {
    const isDragging = this.#renderer.dragInteraction.dragging
    const local = this.#renderer.root.toLocal(event.global)

    // if (
    //   this.#renderer.onNodeDrag || this.#renderer.onNodePointerUp ||
    //   this.#renderer.onNodeClick || this.#renderer.onNodeDoubleClick
    // ) {
    //   event.stopPropagation()
    // }

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

  pointerLeave = (event: FederatedPointerEvent) => {
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

  clearDoubleClick = () => {
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
