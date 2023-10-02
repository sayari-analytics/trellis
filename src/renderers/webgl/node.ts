import { FederatedPointerEvent } from 'pixi.js'
import { MIN_LABEL_ZOOM, MIN_NODE_INTERACTION_ZOOM, MIN_NODE_STROKE_ZOOM, Renderer } from '.'
import * as Graph from '../..'
import { Label } from './objects/label'
import { positionNodeLabel } from './utils'
import { NodeFill } from './objects/nodeFill'
import { NodeStrokes } from './objects/nodeStrokes'
import { interpolate } from '../../utils'

export class NodeRenderer {
  node!: Graph.Node
  x!: number
  y!: number
  fill: NodeFill
  label?: Label
  strokes: NodeStrokes

  private renderer: Renderer
  private doubleClickTimeout: number | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0
  private interpolateX?: (dt: number) => { value: number; done: boolean }
  private interpolateY?: (dt: number) => { value: number; done: boolean }
  private interpolateRadius?: (dt: number) => { value: number; done: boolean }
  private fillMounted = false
  private strokeMounted = false
  private labelMounted = false

  constructor(renderer: Renderer, node: Graph.Node) {
    this.renderer = renderer
    this.fill = new NodeFill(this.renderer, this)
    this.strokes = new NodeStrokes(this.renderer, this)
    this.update(node)
  }

  update(node: Graph.Node) {
    if (this.label === undefined) {
      if (node.label) {
        this.label = new Label(this.renderer, node.label)
      }
    } else {
      if (node.label === undefined) {
        this.renderer.labelObjectManager.delete(this.label)
        this.labelMounted = false
        this.label = undefined
      }
    }

    /**
     * interpolate position/radius if all of the following are true:
     * - x/y/node has changed
     * - not dragging
     * - the animateViewport option is not disabled
     * - it's not the first render
     */
    const x = node.x ?? 0
    const y = node.y ?? 0
    const xChanged = x !== this.x
    const yChanged = y !== this.y
    const radiusChanged = node.radius !== this.node?.radius

    if (
      (xChanged || yChanged || radiusChanged) &&
      !this.renderer.dragInteraction.dragging &&
      this.renderer.animateNodePosition &&
      this.renderer.renderedNodes
    ) {
      if (xChanged && this.renderer.animateNodePosition) {
        this.interpolateX = interpolate(this.x, x, this.renderer.animateNodePosition)
      }
      if (yChanged && this.renderer.animateNodePosition) {
        this.interpolateY = interpolate(this.y, y, this.renderer.animateNodePosition)
      }
      if (radiusChanged && this.renderer.animateNodeRadius) {
        this.interpolateRadius = interpolate(this.y, y, this.renderer.animateNodeRadius)
      }
    } else {
      this.setPosition(node, x, y, node.radius)
      this.interpolateX = undefined
      this.interpolateY = undefined
      this.interpolateRadius = undefined
    }

    this.node = node

    return this
  }

  render(dt: number) {
    let _x: number | undefined
    let _y: number | undefined
    let _radius: number | undefined

    if (this.interpolateX) {
      const { value, done } = this.interpolateX(dt)
      _x = value

      if (done) {
        this.interpolateX = undefined
      }
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY(dt)
      _y = value

      if (done) {
        this.interpolateY = undefined
      }
    }

    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(dt)
      _radius = value

      if (done) {
        this.interpolateRadius = undefined
      }
    }

    if (_x !== undefined || _y !== undefined || _radius !== undefined) {
      this.setPosition(this.node, _x ?? this.x, _y ?? this.y, _radius ?? this.node.radius)
    }

    const isVisible = this.visible()

    // TODO - enable/disable events based on node screen pixel width, not fixed zoom
    if (isVisible && this.renderer.zoom > MIN_NODE_INTERACTION_ZOOM) {
      this.fill.circle.eventMode = 'static'
    } else {
      this.fill.circle.eventMode = 'none'
    }

    if (isVisible) {
      if (!this.fillMounted) {
        this.renderer.nodeObjectManager.mount(this.fill)
        this.fillMounted = true
      }
    } else {
      if (!this.fillMounted) {
        this.renderer.nodeObjectManager.unmount(this.fill)
        this.fillMounted = false
      }
    }

    if (isVisible && this.renderer.zoom > MIN_NODE_STROKE_ZOOM) {
      if (!this.strokeMounted) {
        this.renderer.nodeObjectManager.mount(this.strokes)
        this.strokeMounted = true
      }
    } else {
      if (this.strokeMounted) {
        this.renderer.nodeObjectManager.unmount(this.strokes)
        this.strokeMounted = false
      }
    }

    if (this.label) {
      if (isVisible && this.renderer.zoom > MIN_LABEL_ZOOM) {
        if (!this.labelMounted) {
          this.renderer.labelObjectManager.mount(this.label)
          this.labelMounted = true
        }
      } else {
        if (this.labelMounted) {
          this.renderer.labelObjectManager.unmount(this.label)
          this.labelMounted = false
        }
      }
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)
    this.renderer.nodeObjectManager.delete(this.fill)
    this.renderer.nodeObjectManager.delete(this.strokes)
    if (this.label) {
      this.renderer.labelObjectManager.delete(this.label)
    }
  }

  private setPosition(node: Graph.Node, x: number, y: number, radius: number) {
    this.x = x
    this.y = y

    this.fill.update(this.x, this.y, radius, node.style)
    this.strokes.update(this.x, this.y, radius, node.style)
    if (this.label && node.label) {
      const labelPosition = positionNodeLabel(this.x, this.y, node.label, this.strokes.radius, node.style?.label?.position)
      this.label.update(node.label, labelPosition[0], labelPosition[1], node.style?.label)
    }
  }

  private visible() {
    // TODO - consider label to calculate min/max // this.label?.getBounds(true).width
    return (
      this.x + this.strokes.radius >= this.renderer.minX &&
      this.x - this.strokes.radius <= this.renderer.maxX &&
      this.y + this.strokes.radius >= this.renderer.minY &&
      this.y - this.strokes.radius <= this.renderer.maxY
    )
  }

  pointerEnter = (event: FederatedPointerEvent) => {
    if (this.renderer.dragInteraction.dragging || this.renderer.zoomInteraction.zooming) {
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

    const local = this.renderer.root.toLocal(event.global)
    this.renderer.onNodePointerEnter?.({
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
    const local = this.renderer.root.toLocal(event.global)

    if (this.renderer.onNodeDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.doubleClick = true
      }
    }

    if (this.renderer.onNodePointerDown) {
      this.renderer.onNodePointerDown?.({
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

    if (this.renderer.onNodeDrag) {
      event.stopPropagation()

      this.renderer.container.style.cursor = 'move'
      this.nodeMoveXOffset = local.x - (this.node!.x ?? 0)
      this.nodeMoveYOffset = local.y - (this.node!.y ?? 0)
      this.renderer.root.addEventListener('pointermove', this.pointerMove)
      this.renderer.zoomInteraction.pause()
      this.renderer.dragInteraction.pause()
      this.renderer.decelerateInteraction.pause()
    }
  }

  pointerMove = (event: FederatedPointerEvent) => {
    event.stopPropagation()

    const local = this.renderer.root.toLocal(event.global)

    if (!this.renderer.dragInteraction.dragging) {
      this.renderer.dragInteraction.dragging = true
      this.renderer.onNodeDragStart?.({
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

    this.renderer.onNodeDrag?.({
      type: 'nodeDrag',
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: local.x - (this.node!.x ?? 0) - this.nodeMoveXOffset,
      dy: local.y - (this.node!.y ?? 0) - this.nodeMoveYOffset,
      target: this.node!,
      targetIdx: 0, // TODO
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  pointerUp = (event: FederatedPointerEvent) => {
    const isDragging = this.renderer.dragInteraction.dragging
    const local = this.renderer.root.toLocal(event.global)

    // if (
    //   this.renderer.onNodeDrag || this.renderer.onNodePointerUp ||
    //   this.renderer.onNodeClick || this.renderer.onNodeDoubleClick
    // ) {
    //   event.stopPropagation()
    // }

    if (this.renderer.onNodeDrag) {
      event.stopPropagation()
      this.renderer.container.style.cursor = 'auto'
      this.renderer.root.removeEventListener('pointermove', this.pointerMove)
      this.renderer.zoomInteraction.resume()
      this.renderer.dragInteraction.resume()
      this.renderer.decelerateInteraction.resume()
      this.nodeMoveXOffset = 0
      this.nodeMoveYOffset = 0

      if (this.renderer.dragInteraction.dragging) {
        this.renderer.dragInteraction.dragging = false
        this.renderer.onNodeDragEnd?.({
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

    this.renderer.onNodePointerUp?.({
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
      this.renderer.onNodeClick?.({
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
      if (this.doubleClick) {
        this.doubleClick = false
        clearTimeout(this.doubleClickTimeout)
        this.renderer.onNodeDoubleClick?.({
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
    if (this.renderer.dragInteraction.dragging || this.renderer.zoomInteraction.zooming) {
      return
    }

    if (
      !this.renderer.dragInteraction.dragging &&
      (this.renderer.onNodePointerDown ||
        this.renderer.onNodeDrag ||
        this.renderer.onNodeClick ||
        this.renderer.onNodeDoubleClick ||
        this.renderer.onNodePointerUp)
    ) {
      this.renderer.container.style.cursor = 'auto'
    }

    const local = this.renderer.root.toLocal(event.global)
    this.renderer.onNodePointerLeave?.({
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
    this.doubleClickTimeout = undefined
    this.doubleClick = false
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
