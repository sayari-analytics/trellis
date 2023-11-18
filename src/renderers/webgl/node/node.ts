import { MIN_LABEL_ZOOM, MIN_INTERACTION_ZOOM, MIN_NODE_STROKE_ZOOM, MIN_NODE_ICON_ZOOM } from '../utils'
import { FederatedPointerEvent } from 'pixi.js'
import { type Renderer } from '..'
import { Stroke } from '../../../types'
import { Label, LabelStyle } from './label'
import { NodeFill } from './fill'
import { NodeStrokes } from './strokes'
import { Icon, NodeIcon } from './icon'
import { NodeHitArea } from './hitArea'
import { interpolate } from '../../../utils'
import { NodeBadge } from './badges'

export type NodeStyle = {
  color?: string
  icon?: NodeIcon
  stroke?: Stroke[]
  badge?: NodeBadge[]
  label?: LabelStyle
}

export type Node = {
  id: string
  radius: number
  x?: number
  y?: number
  fx?: number
  fy?: number
  label?: string
  style?: NodeStyle
  // subgraph?: {
  //   nodes: Node[]
  //   edges: Edge[]
  //   options?: {}
  // }
}

export class NodeRenderer {
  x = 0
  y = 0
  radius = 0
  node!: Node
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
  private hitAreaMounted = false
  private fillMounted = false
  private strokeMounted = false
  private labelMounted = false
  private labelLoading = false
  private iconMounted = false
  private iconLoading = false

  constructor(renderer: Renderer, node: Node) {
    this.renderer = renderer
    this.fill = new NodeFill(this.renderer.nodesContainer, this.renderer.circle)
    this.strokes = new NodeStrokes(this.renderer.nodesContainer, this.renderer.circle, this.fill)
    this.hitArea = new NodeHitArea(this.renderer.interactionContainer, this)
    this.update(node)
  }

  update(node: Node) {
    this.strokes.update(node.style?.stroke)
    this.fill.update(node.style?.color)

    const nodeLabel = node.label
    const labelStyle = node.style?.label
    if (nodeLabel === undefined || nodeLabel.trim() === '') {
      if (this.label) {
        this.renderer.labelObjectManager.delete(this.label)
        this.labelMounted = false
        this.label = undefined
      }
    } else if (this.label === undefined) {
      this.labelLoading = true
      Label.init(this.renderer.fontBook, this.renderer.labelsContainer, nodeLabel, labelStyle).then((label) => {
        this.label = label
        this.labelLoading = false
        this.label?.moveTo(this.x, this.y, this.strokes.radius)
        this.mountLabel(this.visible() && this.renderer.zoom > MIN_LABEL_ZOOM)
      })
    } else {
      this.label.update(nodeLabel, labelStyle)
    }

    const iconStyle = node.style?.icon
    if (iconStyle === undefined) {
      if (this.icon) {
        this.icon.delete()
        this.iconMounted = false
        this.icon = undefined
      }
    } else if (this.icon === undefined) {
      this.iconLoading = true
      Icon.init(this.renderer.nodesContainer, this.renderer.textIcon, this.renderer.imageIcon, this.fill, iconStyle).then((icon) => {
        this.icon = icon
        this.iconLoading = false
        this.icon?.moveTo(this.x, this.y)
        this.mountIcon(this.visible() && this.renderer.zoom > MIN_NODE_ICON_ZOOM)
      })
    } else {
      this.icon.update(iconStyle)
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
    const radiusChanged = node.radius !== this.radius

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
        this.interpolateRadius = interpolate(this.radius, node.radius, this.renderer.animateNodeRadius)
      }
    } else {
      this.setRadius(node.radius)
      this.moveTo(x, y)
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

    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(dt)
      _radius = value

      if (done) {
        this.interpolateRadius = undefined
      }
    }

    if (_radius !== undefined) {
      this.setRadius(_radius)
    }

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

    if (_x !== undefined || _y !== undefined) {
      this.moveTo(_x ?? this.x, _y ?? this.y)
    }

    const isVisible = this.visible()
    this.mountHitArea(isVisible && this.renderer.zoom > MIN_INTERACTION_ZOOM)
    this.mountFill(isVisible)
    this.mountStrokes(isVisible && this.renderer.zoom > MIN_NODE_STROKE_ZOOM)
    this.mountLabel(isVisible && this.renderer.zoom > MIN_LABEL_ZOOM)
    this.mountIcon(isVisible && this.renderer.zoom > MIN_NODE_ICON_ZOOM)
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

  private setRadius(radius: number) {
    this.radius = radius
    this.fill.radius = radius
    this.strokes.radius = radius
    this.hitArea.radius = radius
  }

  private moveTo(x: number, y: number) {
    this.x = x
    this.y = y

    this.fill.moveTo(this.x, this.y)
    this.strokes.moveTo(this.x, this.y)
    this.hitArea.moveTo(this.x, this.y)
    this.label?.moveTo(this.x, this.y, this.strokes.radius)
    this.icon?.moveTo(this.x, this.y)
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }

  private visible() {
    let left = this.x - this.strokes.radius
    let right = this.x + this.strokes.radius
    let top = this.y - this.strokes.radius
    let bottom = this.y + this.strokes.radius

    if (this.label) {
      left = Math.min(left, this.label.bounds.left)
      right = Math.max(right, this.label.bounds.right)
      top = Math.min(top, this.label.bounds.top)
      bottom = Math.max(bottom, this.label.bounds.bottom)
    }

    return right >= this.renderer.minX && left <= this.renderer.maxX && bottom >= this.renderer.minY && top <= this.renderer.maxY
  }

  // TODO - disable events if node has no event handlers
  // TODO - disable events if node pixel width < ~5px
  // TODO - disable events when dragging/scrolling
  private mountHitArea(shouldMount: boolean) {
    if (shouldMount && !this.hitAreaMounted) {
      this.renderer.interactionObjectManager.mount(this.hitArea)
      this.hitAreaMounted = true
    } else if (!shouldMount && this.hitAreaMounted) {
      this.renderer.interactionObjectManager.unmount(this.hitArea)
      this.hitAreaMounted = false
    }
  }

  private mountFill(shouldMount: boolean) {
    if (shouldMount && !this.fillMounted) {
      this.fill.mount()
      this.fillMounted = true
    } else if (!shouldMount && this.fillMounted) {
      this.fill.unmount()
      this.fillMounted = false
    }
  }

  private mountStrokes(shouldMount: boolean) {
    if (shouldMount && !this.strokeMounted) {
      this.renderer.nodeStrokeObjectManager.mount(this.strokes)
      this.strokeMounted = true
    } else if (!shouldMount && this.strokeMounted) {
      this.renderer.nodeStrokeObjectManager.unmount(this.strokes)
      this.strokeMounted = false
    }
  }

  private mountLabel(shouldMount: boolean) {
    if (!this.labelLoading && this.label) {
      if (shouldMount && !this.labelMounted) {
        this.renderer.labelObjectManager.mount(this.label)
        this.labelMounted = true
      } else if (!shouldMount && this.labelMounted) {
        this.renderer.labelObjectManager.unmount(this.label)
        this.labelMounted = false
      }
    }
  }

  private mountIcon(shouldMount: boolean) {
    if (!this.iconLoading && this.icon) {
      if (shouldMount && !this.iconMounted) {
        this.renderer.nodeIconObjectManager.mount(this.icon)
        this.iconMounted = true
      } else if (!shouldMount && this.iconMounted) {
        this.renderer.nodeIconObjectManager.unmount(this.icon)
        this.iconMounted = false
      }
    }
  }
}
