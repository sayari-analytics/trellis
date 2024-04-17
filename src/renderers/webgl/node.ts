import { DEFAULT_LABEL_STYLE, MIN_LABEL_ZOOM, MIN_INTERACTION_ZOOM, MIN_STROKE_ZOOM, MIN_NODE_ICON_ZOOM } from '../../utils/constants'
import { FederatedPointerEvent } from 'pixi.js'
import { NodeHitArea } from './interaction/nodeHitArea'
import { interpolate } from '../../utils/helpers'
import { type Renderer } from '.'
import type { Node } from '../../types'
import Circle from './objects/circle/Circle'
import CircleStrokes from './objects/circle/CircleStrokes'
import Text from './objects/text/Text'
import Icon from './objects/Icon'

export class NodeRenderer {
  x = 0
  y = 0

  node: Node
  fill: Circle
  strokes?: CircleStrokes
  label?: Text
  icon?: Icon

  private _radius = 0
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

  constructor(renderer: Renderer, node: Node) {
    this.renderer = renderer
    this.fill = new Circle(renderer.nodesContainer, renderer.circle, node.style)
    this.hitArea = new NodeHitArea(this.renderer.interactionContainer, this)
    this.resize(node.radius).moveTo(node.x ?? 0, node.y ?? 0)
    this.node = node
  }

  update(node: Node) {
    this.node = node

    this.fill.update(node.style?.color, node.style?.opacity)

    if (this.strokes) {
      this.strokes.update(node.style?.stroke)
    }

    if (this.label) {
      if (node.label === undefined || node.label.trim() === '') {
        this.managers.labels.delete(this.label)
        this.label = undefined
      } else {
        this.label.update(node.label, node.style?.label)
      }
    }

    if (this.icon) {
      if (node.style?.icon === undefined) {
        this.icon.delete()
        this.icon = undefined
      } else {
        this.icon.update(node.style.icon)
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
    const radius = node.radius
    const xChanged = x !== this.x
    const yChanged = y !== this.y
    const radiusChanged = radius !== this._radius

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
        this.interpolateRadius = interpolate(this._radius, radius, this.renderer.animateNodeRadius)
      }
    } else {
      this.resize(radius).moveTo(x, y)
      this.interpolateX = undefined
      this.interpolateY = undefined
      this.interpolateRadius = undefined
    }

    return this
  }

  render(dt: number) {
    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(dt)

      this.resize(value)

      if (done) {
        this.interpolateRadius = undefined
      }

      if (this.label && !this.interpolateX && !this.interpolateY) {
        this.label.moveTo(this.x, this.y)
      }
    }

    if (this.interpolateX || this.interpolateY) {
      let x = this.x
      let y = this.y

      if (this.interpolateX) {
        const { value, done } = this.interpolateX(dt)
        x = value

        if (done) {
          this.interpolateX = undefined
        }
      }

      if (this.interpolateY) {
        const { value, done } = this.interpolateY(dt)
        y = value

        if (done) {
          this.interpolateY = undefined
        }
      }

      this.moveTo(x, y)
    }

    const isVisible = this.visible()

    // TODO - disable events if node has no event handlers
    // TODO - disable events if node pixel width < ~5px
    // TODO - disable events when dragging/scrolling
    const shouldHitAreaMount = isVisible && this.renderer.zoom > MIN_INTERACTION_ZOOM
    const hitAreaMounted = this.managers.interactions.isMounted(this.hitArea)

    if (shouldHitAreaMount && !hitAreaMounted) {
      this.managers.interactions.mount(this.hitArea)
    } else if (!shouldHitAreaMount && hitAreaMounted) {
      this.managers.interactions.unmount(this.hitArea)
    }

    const fillMounted = this.managers.nodes.isMounted(this.fill)

    if (isVisible && !fillMounted) {
      this.managers.nodes.mount(this.fill)
    } else if (!isVisible && fillMounted) {
      this.managers.nodes.unmount(this.fill)
    }

    const shouldStrokesMount = isVisible && this.renderer.zoom > MIN_STROKE_ZOOM

    if (shouldStrokesMount && !this.strokes && this.node.style?.stroke) {
      this.strokes = new CircleStrokes(this.renderer.nodesContainer, this.renderer.circle, this.fill, this.node.style.stroke).moveTo(
        this.x,
        this.y
      )
    }

    if (this.strokes) {
      const strokesMounted = this.managers.nodes.isMounted(this.strokes)

      if (shouldStrokesMount && !strokesMounted) {
        this.managers.nodes.mount(this.strokes)
      } else if (!shouldStrokesMount && strokesMounted) {
        this.managers.nodes.unmount(this.strokes)
      }
    }

    const shouldLabelMount = isVisible && this.renderer.zoom > MIN_LABEL_ZOOM

    if (shouldLabelMount) {
      this.applyLabel()
    }

    if (this.label) {
      const labelMounted = this.managers.labels.isMounted(this.label)
      if (shouldLabelMount && !labelMounted) {
        this.managers.labels.mount(this.label)
      } else if (!shouldLabelMount && labelMounted) {
        this.managers.labels.unmount(this.label)
      }
    }

    const shouldIconMount = isVisible && this.renderer.zoom > MIN_NODE_ICON_ZOOM

    if (shouldIconMount) {
      this.applyIcon()
    }

    if (this.icon) {
      const iconMounted = this.managers.icons.isMounted(this.icon)
      if (shouldIconMount && !iconMounted) {
        this.managers.icons.mount(this.icon)
      } else if (!shouldIconMount && iconMounted) {
        this.managers.icons.unmount(this.icon)
      }
    }
  }

  delete() {
    clearTimeout(this.doubleClickTimeout)

    this.managers.nodes.delete(this.fill)

    this.managers.interactions.delete(this.hitArea)

    if (this.strokes) {
      this.strokes = this.managers.nodes.delete(this.strokes)
    }

    if (this.label) {
      this.managers.labels.delete(this.label)
    }
    if (this.icon) {
      this.managers.icons.delete(this.icon)
    }
  }

  get radius() {
    return this.strokes?.radius ?? this._radius
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
        clearTimeout(this.doubleClickTimeout)
        this.doubleClick = false
        this.doubleClickTimeout = undefined
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

  private resize(radius: number) {
    if (radius !== this._radius) {
      this._radius = radius
      this.fill.resize(radius)
      this.strokes?.resize(radius)

      if (this.label) {
        this.label.offset = this.radius
      }

      this.hitArea.update(this.x, this.y, radius)
    }

    return this
  }

  private moveTo(x: number, y: number) {
    if (x !== this.x || y !== this.y) {
      this.x = x
      this.y = y
      this.fill.moveTo(x, y)
      this.strokes?.moveTo(x, y)
      this.label?.moveTo(x, y)
      this.icon?.moveTo(x, y)
      this.hitArea.update(x, y, this._radius)
    }

    return this
  }

  private visible() {
    let left: number, right: number, top: number, bottom: number

    if (this.label) {
      left = this.x - Math.max(this.radius, this.label.rect.left)
      right = this.x + Math.max(this.radius, this.label.rect.right)
      top = this.y - Math.max(this.radius, this.label.rect.top)
      bottom = this.y + Math.max(this.radius, this.label.rect.bottom)
    } else {
      left = this.x - this.radius
      right = this.x + this.radius
      top = this.y - this.radius
      bottom = this.y + this.radius
    }

    const { minX, maxX, minY, maxY } = this.renderer

    return right >= minX && left <= maxX && bottom >= minY && top <= maxY
  }

  private get managers() {
    return this.renderer.managers
  }

  private applyLabel() {
    const label = this.node.label
    const style = this.node.style?.label
    if (label !== undefined && label.trim() !== '' && this.label === undefined) {
      this.label = new Text(this.renderer.assets, this.renderer.labelsContainer, label, style, DEFAULT_LABEL_STYLE)
      this.label.offset = this.radius
      this.label.moveTo(this.x, this.y)
    }

    return this
  }

  private applyIcon() {
    const icon = this.node.style?.icon
    if (icon !== undefined && this.icon === undefined) {
      this.icon = new Icon(this.renderer.assets, this.renderer.textIcon, this.renderer.nodesContainer, this.fill, icon).moveTo(
        this.x,
        this.y
      )
    }

    return this
  }
}
