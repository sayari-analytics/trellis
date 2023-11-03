import { MIN_LABEL_ZOOM, MIN_INTERACTION_ZOOM, MIN_NODE_STROKE_ZOOM, MIN_NODE_ICON_ZOOM } from './utils'
import { FederatedPointerEvent } from 'pixi.js'
import { type Renderer } from '.'
import * as Graph from '../..'
import { Label } from './objects/label'
import { NodeFill } from './objects/nodeFill'
import { NodeStrokes } from './objects/nodeStrokes'
import { Icon } from './objects/icon'
import { NodeHitArea } from './interaction/nodeHitArea'
import { interpolate } from '../../utils'

export class NodeRenderer {
  node!: Graph.Node
  x!: number
  y!: number
  fill: NodeFill
  label?: Label
  icon?: Icon
  strokes: NodeStrokes

  private hitArea: NodeHitArea
  private renderer: Renderer
  private doubleClickTimeout: NodeJS.Timeout | undefined
  private doubleClick = false
  private nodeMoveXOffset: number = 0
  private nodeMoveYOffset: number = 0
  private isDragging = false
  private pointerLeftBeforeDragComplete = false
  private interpolateX?: (dt: number) => { value: number; done: boolean }
  private interpolateY?: (dt: number) => { value: number; done: boolean }
  private interpolateRadius?: (dt: number) => { value: number; done: boolean }
  private fillMounted = false
  private strokeMounted = false
  private labelMounted = false
  private iconMounted = false

  constructor(renderer: Renderer, node: Graph.Node) {
    this.renderer = renderer
    this.fill = new NodeFill(this.renderer.nodesContainer, this.renderer.circle)
    this.strokes = new NodeStrokes(this.renderer.nodesContainer, this.renderer.circle, this.fill)
    this.hitArea = new NodeHitArea(this.renderer.interactionContainer, this)
    this.update(node)
  }

  update(node: Graph.Node) {
    if (this.label === undefined) {
      if (node.label !== undefined) {
        this.label = new Label(this.renderer.labelsContainer, node.label, node.style?.label)
      }
    } else if (node.label === undefined || node.label.trim() === '') {
      this.renderer.labelObjectManager.delete(this.label)
      this.labelMounted = false
      this.label = undefined
    } else {
      this.label.update(node.label, node.style?.label)
    }

    if (this.icon === undefined) {
      if (node.style?.icon !== undefined) {
        this.icon = new Icon(this.renderer.nodesContainer, this.renderer.textIcon, this.renderer.imageIcon, this.fill, node.style.icon)
      }
    } else if (node.style?.icon === undefined) {
      this.icon.delete()
      this.iconMounted = false
      this.icon = undefined
    } else {
      this.icon.update(node.style.icon)
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
      this.renderer.draggedNode !== this &&
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

    // TODO - disable events if node has no event handlers
    // TODO - disable events if node pixel width < ~5px
    // TODO - disable events when dragging/scrolling
    if (isVisible && this.renderer.zoom > MIN_INTERACTION_ZOOM) {
      this.renderer.interactionObjectManager.mount(this.hitArea)
    } else {
      this.renderer.interactionObjectManager.unmount(this.hitArea)
    }

    if (isVisible) {
      if (!this.fillMounted) {
        this.fill.mount()
        this.fillMounted = true
      }
    } else {
      if (this.fillMounted) {
        this.fill.unmount()
        this.fillMounted = false
      }
    }

    if (isVisible && this.renderer.zoom > MIN_NODE_STROKE_ZOOM) {
      if (!this.strokeMounted) {
        this.renderer.nodeStrokeObjectManager.mount(this.strokes)
        this.strokeMounted = true
      }
    } else {
      if (this.strokeMounted) {
        this.renderer.nodeStrokeObjectManager.unmount(this.strokes)
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

    if (this.icon) {
      if (isVisible && this.renderer.zoom > MIN_NODE_ICON_ZOOM) {
        if (!this.iconMounted) {
          this.renderer.nodeIconObjectManager.mount(this.icon)
          this.iconMounted = true
        }
      } else {
        if (this.iconMounted) {
          this.renderer.nodeIconObjectManager.unmount(this.icon)
          this.iconMounted = false
        }
      }
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)
    this.fill.delete()
    this.renderer.nodeStrokeObjectManager.delete(this.strokes)
    this.renderer.interactionObjectManager.delete(this.hitArea)
    if (this.label) {
      this.renderer.labelObjectManager.delete(this.label)
    }
    if (this.icon) {
      this.renderer.nodeIconObjectManager.delete(this.icon)
    }
  }

  pointerEnter = (event: FederatedPointerEvent) => {
    if (this.renderer.draggedNode === this) {
      this.pointerLeftBeforeDragComplete = false
    }

    if (
      this.renderer.hoveredNode ||
      this.renderer.draggedNode ||
      this.renderer.dragInteraction.dragging ||
      this.renderer.zoomInteraction.zooming
    ) {
      return
    }

    this.renderer.hoveredNode = this

    if (
      this.renderer.onNodePointerDown ||
      this.renderer.onNodeDrag ||
      this.renderer.onNodeClick ||
      this.renderer.onNodeDoubleClick ||
      this.renderer.onNodePointerUp
    ) {
      this.renderer.container.style.cursor = 'pointer'
    }

    if (this.renderer.onNodePointerEnter) {
      const local = this.renderer.root.toLocal(event.global)
      this.renderer.onNodePointerEnter({
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
      event.stopPropagation()
      this.renderer.onNodePointerDown({
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
      this.renderer.draggedNode = this
      this.renderer.root.addEventListener('pointermove', this.pointerMove)
      this.renderer.zoomInteraction.pause()
      this.renderer.dragInteraction.pause()
      this.renderer.decelerateInteraction.pause()
    }
  }

  pointerMove = (event: FederatedPointerEvent) => {
    event.stopPropagation()

    const local = this.renderer.root.toLocal(event.global)

    if (!this.isDragging) {
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

      this.isDragging = true
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
    const local = this.renderer.root.toLocal(event.global)

    if (this.renderer.onNodeDrag) {
      this.renderer.container.style.cursor = 'auto'
      this.renderer.root.removeEventListener('pointermove', this.pointerMove)
      this.renderer.zoomInteraction.resume()
      this.renderer.dragInteraction.resume()
      this.renderer.decelerateInteraction.resume()
      this.nodeMoveXOffset = 0
      this.nodeMoveYOffset = 0

      if (this.renderer.draggedNode === this) {
        if (this.renderer.onNodeDragEnd) {
          event.stopPropagation()
          this.renderer.onNodeDragEnd({
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
    }

    this.renderer.dragInteraction.up(event)
    this.renderer.decelerateInteraction.up()

    if (this.renderer.onNodePointerUp) {
      event.stopPropagation()
      this.renderer.onNodePointerUp({
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

    if (!this.isDragging) {
      if (this.renderer.onNodeClick) {
        event.stopPropagation()
        this.renderer.onNodeClick({
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

      if (this.doubleClick) {
        this.doubleClick = false
        clearTimeout(this.doubleClickTimeout)
        if (this.renderer.onNodeDoubleClick) {
          event.stopPropagation()
          this.renderer.onNodeDoubleClick({
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

    this.isDragging = false
    this.renderer.draggedNode = undefined

    if (this.pointerLeftBeforeDragComplete) {
      this.pointerLeave(event)
    }
  }

  pointerLeave = (event: FederatedPointerEvent) => {
    if (this.renderer.hoveredNode !== this) {
      return
    }

    if (this.renderer.draggedNode === this) {
      this.pointerLeftBeforeDragComplete = true
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

    if (this.renderer.onNodePointerLeave) {
      const local = this.renderer.root.toLocal(event.global)
      this.renderer.onNodePointerLeave({
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

    this.renderer.hoveredNode = undefined
    this.pointerLeftBeforeDragComplete = false
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }

  private setPosition(node: Graph.Node, x: number, y: number, radius: number) {
    this.x = x
    this.y = y

    this.fill.update(this.x, this.y, radius, node.style)
    this.strokes.update(this.x, this.y, radius, node.style)
    if (this.label !== undefined) {
      this.label.moveTo(this.x, this.y, this.strokes.radius)
    }
    if (this.icon !== undefined) {
      this.icon.moveTo(this.x, this.y)
    }
    this.hitArea.update(x, y, radius)
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
}
