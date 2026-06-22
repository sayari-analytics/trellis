import type { Options, ViewportPointerEvent, ViewportDragEvent, NodePointerEvent, NodeDragEvent, EdgePointerEvent } from '.'
import type { GraphState } from '..'
import { screenToWorld, VIEWPORT_X, VIEWPORT_Y, VIEWPORT_ZOOM } from '../camera'
import { distanceToSegment } from '../path'

// Extra hover tolerance around thin edges, in CSS px.
const EDGE_PICK_CSS_PX = 4

const pointToSegmentDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const DRAG_INERTIA = 0.85
const MIN_SPEED = 0.01
const DRAG_THRESHOLD = 4
const DOUBLE_CLICK_MS = 500

type HoverTarget = { kind: 'node' | 'edge'; slot: number } | null

/**
 * DOM pointer/wheel adapter for viewport pan/zoom, node dragging, and hover events.
 * Hit-testing scans slots from topmost to bottom; node hits take precedence over edges.
 */
export class DOMInteractionHandler {
  public readonly canvas: HTMLCanvasElement
  public readonly minZoom: number
  public readonly maxZoom: number
  public selectionMode = false

  private state: GraphState
  private isPointerDown = false
  private dragging = false
  private downX = 0
  private downY = 0
  private lastX = 0
  private lastY = 0
  private lastMoveTime = 0
  private velocityX = 0
  private velocityY = 0
  private momentumRAF = 0
  private doubleClickPending = false
  private doubleClickTimeout?: ReturnType<typeof setTimeout>
  private hovered: HoverTarget = null
  private draggedNode = -1
  private grabOffsetX = 0
  private grabOffsetY = 0
  private metrics: { left: number; top: number; dpr: number } | null = null

  constructor(private options: Options) {
    this.canvas = options.canvas
    this.state = options.state
    this.minZoom = options.state.minZoom
    this.maxZoom = options.state.maxZoom

    this.canvas.style.touchAction = 'none' // TODO - add support for pinch zoom
    this.canvas.addEventListener('pointerenter', this.pointerEnter)
    this.canvas.addEventListener('pointerdown', this.pointerDown)
    this.canvas.addEventListener('pointermove', this.pointerMove)
    this.canvas.addEventListener('pointerup', this.pointerUp)
    this.canvas.addEventListener('pointercancel', this.pointerUp)
    this.canvas.addEventListener('pointerleave', this.pointerLeave)
    this.canvas.addEventListener('wheel', this.wheel, { passive: false })
    // Scroll does not bubble, so use capture to invalidate canvas metrics.
    window.addEventListener('scroll', this.invalidateMetrics, true)
    window.addEventListener('resize', this.invalidateMetrics)
  }

  destroy() {
    this.canvas.removeEventListener('pointerenter', this.pointerEnter)
    this.canvas.removeEventListener('pointerdown', this.pointerDown)
    this.canvas.removeEventListener('pointermove', this.pointerMove)
    this.canvas.removeEventListener('pointerup', this.pointerUp)
    this.canvas.removeEventListener('pointercancel', this.pointerUp)
    this.canvas.removeEventListener('pointerleave', this.pointerLeave)
    this.canvas.removeEventListener('wheel', this.wheel)
    window.removeEventListener('scroll', this.invalidateMetrics, true)
    window.removeEventListener('resize', this.invalidateMetrics)
    cancelAnimationFrame(this.momentumRAF)
    clearTimeout(this.doubleClickTimeout)
  }

  private invalidateMetrics = () => {
    this.metrics = null
  }

  private getMetrics() {
    if (this.metrics === null) {
      const rect = this.canvas.getBoundingClientRect()
      this.metrics = { left: rect.left, top: rect.top, dpr: this.canvas.width / this.canvas.clientWidth }
    }
    return this.metrics
  }

  private project(clientX: number, clientY: number): { x: number; y: number; dpr: number } {
    const { left, top, dpr } = this.getMetrics()
    const { x, y } = screenToWorld(this.state.viewport, this.canvas.width, this.canvas.height, dpr, clientX - left, clientY - top)
    return { x, y, dpr }
  }

  private viewportPointer(event: PointerEvent, world: { x: number; y: number }): ViewportPointerEvent {
    const { viewport } = this.state
    return {
      type: 'viewportPointer',
      x: world.x,
      y: world.y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: { x: viewport[VIEWPORT_X], y: viewport[VIEWPORT_Y], zoom: viewport[VIEWPORT_ZOOM] },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }

  private viewportDrag(event: PointerEvent, world: { x: number; y: number }, dx: number, dy: number): ViewportDragEvent {
    return {
      type: 'viewportDrag',
      x: world.x,
      y: world.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx,
      dy,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }

  // Topmost node containing the world point; tombstoned NaN positions never match.
  private pickNode(worldX: number, worldY: number): number {
    const { nodePositions, nodeRadii, nodeSlotCount } = this.state
    for (let i = nodeSlotCount - 1; i >= 0; i--) {
      const dx = worldX - nodePositions[i * 2]
      const dy = worldY - nodePositions[i * 2 + 1]
      const r = nodeRadii[i]
      if (dx * dx + dy * dy <= r * r) return i
    }
    return -1
  }

  // Topmost edge within hover tolerance; shaped edges test distance to each path segment.
  private pickEdge(worldX: number, worldY: number): number {
    if (this.options.onEdgePointerEnter === undefined && this.options.onEdgePointerLeave === undefined) return -1
    const { edgeEndpoints, edgeWidths, edgePath, edgeSlotCount, nodePositions } = this.state
    const slack = (EDGE_PICK_CSS_PX * this.getMetrics().dpr) / this.state.viewport[VIEWPORT_ZOOM]
    const point = { x: worldX, y: worldY }
    for (let i = edgeSlotCount - 1; i >= 0; i--) {
      const source = edgeEndpoints[i * 2]
      const target = edgeEndpoints[i * 2 + 1]
      if (source === target) continue // tombstoned / collapsed edge
      const tolerance = edgeWidths[i] / 2 + slack
      const path = edgePath[i]
      let dist = Infinity
      if (path !== undefined && path.length > 0) {
        for (const segment of path) dist = Math.min(dist, distanceToSegment(point, segment))
      } else {
        dist = pointToSegmentDistance(
          worldX,
          worldY,
          nodePositions[source * 2],
          nodePositions[source * 2 + 1],
          nodePositions[target * 2],
          nodePositions[target * 2 + 1]
        )
      }
      if (dist <= tolerance) return i
    }
    return -1
  }

  private edgePointer(event: PointerEvent, world: { x: number; y: number }, idx: number): EdgePointerEvent {
    return {
      type: 'edgePointer',
      id: this.state.edgeIds[idx],
      x: world.x,
      y: world.y,
      clientX: event.clientX,
      clientY: event.clientY,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }

  private nodePointer(event: PointerEvent, world: { x: number; y: number }, idx: number): NodePointerEvent {
    return {
      type: 'nodePointer',
      id: this.state.nodeIds[idx],
      x: world.x,
      y: world.y,
      clientX: event.clientX,
      clientY: event.clientY,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }

  private dragTarget(world: { x: number; y: number }): { x: number; y: number } {
    return { x: world.x + this.grabOffsetX, y: world.y + this.grabOffsetY }
  }

  private nodeDrag(event: PointerEvent, world: { x: number; y: number }, idx: number, dx: number, dy: number): NodeDragEvent {
    return {
      type: 'nodeDrag',
      id: this.state.nodeIds[idx],
      x: world.x,
      y: world.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx,
      dy,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }

  private pick(worldX: number, worldY: number): HoverTarget {
    const node = this.pickNode(worldX, worldY)
    if (node !== -1) return { kind: 'node', slot: node }
    const edge = this.pickEdge(worldX, worldY)
    if (edge !== -1) return { kind: 'edge', slot: edge }
    return null
  }

  private emit(transition: 'Enter' | 'Leave', target: HoverTarget, event: PointerEvent, world: { x: number; y: number }) {
    if (target === null) return
    if (target.kind === 'node') this.options[`onNodePointer${transition}`]?.(this.nodePointer(event, world, target.slot))
    else this.options[`onEdgePointer${transition}`]?.(this.edgePointer(event, world, target.slot))
  }

  private updateHover(event: PointerEvent, world: { x: number; y: number }) {
    const next = this.pick(world.x, world.y)
    const prev = this.hovered
    if (prev?.kind === next?.kind && prev?.slot === next?.slot) return // unchanged (incl. both null)
    this.emit('Leave', prev, event, world)
    this.hovered = next
    this.emit('Enter', next, event, world)
    this.canvas.style.cursor = next === null ? '' : next.kind === 'node' ? 'grab' : 'pointer'
  }

  private pointerEnter = (event: PointerEvent) => {
    if (this.options.onViewportPointerEnter === undefined) return
    this.options.onViewportPointerEnter(this.viewportPointer(event, this.project(event.clientX, event.clientY)))
  }

  private pointerDown = (event: PointerEvent) => {
    this.canvas.setPointerCapture(event.pointerId)
    cancelAnimationFrame(this.momentumRAF)
    this.isPointerDown = true
    this.dragging = false
    this.velocityX = this.velocityY = 0
    this.downX = this.lastX = event.clientX
    this.downY = this.lastY = event.clientY
    this.lastMoveTime = performance.now()

    const world = this.project(event.clientX, event.clientY)
    this.draggedNode = this.pickNode(world.x, world.y)
    if (this.draggedNode !== -1) {
      this.grabOffsetX = this.state.nodePositions[this.draggedNode * 2] - world.x
      this.grabOffsetY = this.state.nodePositions[this.draggedNode * 2 + 1] - world.y
    }

    if (this.options.onViewportDoubleClick || this.options.onNodeDoubleClick) {
      if (this.doubleClickTimeout === undefined) {
        this.doubleClickTimeout = setTimeout(this.clearDoubleClick, DOUBLE_CLICK_MS)
      } else {
        this.doubleClickPending = true
      }
    }

    if (this.draggedNode !== -1) {
      this.canvas.style.cursor = 'grabbing'
      this.options.onNodePointerDown?.(this.nodePointer(event, world, this.draggedNode))
    } else {
      this.options.onViewportPointerDown?.(this.viewportPointer(event, world))
    }
  }

  private pointerMove = (event: PointerEvent) => {
    if (!this.isPointerDown) {
      const world = this.project(event.clientX, event.clientY)
      this.options.onViewportPointerMove?.(this.viewportPointer(event, world))
      this.updateHover(event, world)
      return
    }

    const { viewport } = this.state
    const world = this.project(event.clientX, event.clientY)

    if (this.draggedNode !== -1) {
      if (!this.dragging) {
        if (Math.abs(event.clientX - this.downX) < DRAG_THRESHOLD && Math.abs(event.clientY - this.downY) < DRAG_THRESHOLD) {
          return
        }
        this.dragging = true
        this.lastX = event.clientX
        this.lastY = event.clientY
        this.options.onNodeDragStart?.(this.nodeDrag(event, this.dragTarget(world), this.draggedNode, 0, 0))
      }
      const dx = ((event.clientX - this.lastX) * world.dpr) / viewport[VIEWPORT_ZOOM]
      const dy = -((event.clientY - this.lastY) * world.dpr) / viewport[VIEWPORT_ZOOM]
      this.lastX = event.clientX
      this.lastY = event.clientY
      this.options.onNodeDrag?.(this.nodeDrag(event, this.dragTarget(world), this.draggedNode, dx, dy))
      return
    }

    this.options.onViewportPointerMove?.(this.viewportPointer(event, world))

    if (!this.dragging) {
      if (Math.abs(event.clientX - this.downX) < DRAG_THRESHOLD && Math.abs(event.clientY - this.downY) < DRAG_THRESHOLD) {
        return
      }
      this.dragging = true
      this.lastX = event.clientX
      this.lastY = event.clientY
      this.lastMoveTime = performance.now()
      this.options.onViewportDragStart?.(this.viewportDrag(event, world, 0, 0))
    }

    const dx = -((event.clientX - this.lastX) * world.dpr) / viewport[VIEWPORT_ZOOM]
    const dy = ((event.clientY - this.lastY) * world.dpr) / viewport[VIEWPORT_ZOOM]
    if (this.selectionMode) {
      this.velocityX = this.velocityY = 0
    } else {
      this.state.updateViewport({ x: viewport[VIEWPORT_X] + dx, y: viewport[VIEWPORT_Y] + dy, zoom: viewport[VIEWPORT_ZOOM] })
      const now = performance.now()
      const elapsed = Math.max(1, now - this.lastMoveTime)
      this.velocityX = dx / elapsed
      this.velocityY = dy / elapsed
      this.lastMoveTime = now
    }
    this.lastX = event.clientX
    this.lastY = event.clientY

    this.options.onViewportDrag?.(this.viewportDrag(event, world, dx, dy))
  }

  private pointerUp = (event: PointerEvent) => {
    if (!this.isPointerDown) return
    this.isPointerDown = false
    const world = this.project(event.clientX, event.clientY)

    if (this.draggedNode !== -1) {
      const idx = this.draggedNode
      this.draggedNode = -1
      this.canvas.style.cursor = this.hovered === null ? '' : this.hovered.kind === 'node' ? 'grab' : 'pointer'
      this.options.onNodePointerUp?.(this.nodePointer(event, world, idx))
      if (this.dragging) {
        this.dragging = false
        this.options.onNodeDragEnd?.(this.nodeDrag(event, this.dragTarget(world), idx, 0, 0))
        return
      }
      this.options.onNodeClick?.(this.nodePointer(event, world, idx))
      if (this.doubleClickPending) {
        this.doubleClickPending = false
        clearTimeout(this.doubleClickTimeout)
        this.doubleClickTimeout = undefined
        this.options.onNodeDoubleClick?.(this.nodePointer(event, world, idx))
      }
      return
    }

    this.options.onViewportPointerUp?.(this.viewportPointer(event, world))

    if (this.dragging) {
      this.dragging = false
      this.options.onViewportDragEnd?.(this.viewportDrag(event, world, 0, 0))
      if (performance.now() - this.lastMoveTime > 100) this.velocityX = this.velocityY = 0
      this.startMomentum()
      return
    }

    this.options.onViewportClick?.(this.viewportPointer(event, world))
    if (this.doubleClickPending) {
      this.doubleClickPending = false
      clearTimeout(this.doubleClickTimeout)
      this.doubleClickTimeout = undefined
      this.options.onViewportDoubleClick?.(this.viewportPointer(event, world))
    }
  }

  private pointerLeave = (event: PointerEvent) => {
    const world = this.project(event.clientX, event.clientY)
    if (this.draggedNode === -1 && this.hovered !== null) {
      this.emit('Leave', this.hovered, event, world)
      this.hovered = null
      this.canvas.style.cursor = ''
    }
    this.options.onViewportPointerLeave?.(this.viewportPointer(event, world))
  }

  private wheel = (event: WheelEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const { viewport } = this.state
    const { minZoom, maxZoom } = this

    const step = (-event.deltaY * (event.deltaMode ? 20 : 1)) / 500
    const currentZoom = viewport[VIEWPORT_ZOOM]
    if ((step > 0 && currentZoom >= maxZoom) || (step < 0 && currentZoom <= minZoom)) return

    const { left, top, dpr } = this.getMetrics()
    const screenX = event.clientX - left
    const screenY = event.clientY - top
    const before = screenToWorld(viewport, this.canvas.width, this.canvas.height, dpr, screenX, screenY)
    const zoom = Math.min(maxZoom, Math.max(minZoom, currentZoom * 2 ** (1.1 * step)))
    const dz = zoom - currentZoom
    viewport[VIEWPORT_ZOOM] = zoom
    const after = screenToWorld(viewport, this.canvas.width, this.canvas.height, dpr, screenX, screenY)
    const dx = before.x - after.x
    const dy = before.y - after.y
    this.state.updateViewport({ x: viewport[VIEWPORT_X] + dx, y: viewport[VIEWPORT_Y] + dy, zoom })

    this.options.onViewportWheel?.({
      type: 'viewportWheel',
      x: before.x,
      y: before.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx,
      dy,
      dz,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private startMomentum() {
    if (Math.abs(this.velocityX) < MIN_SPEED && Math.abs(this.velocityY) < MIN_SPEED) return
    let last = performance.now()
    const step = (now: number) => {
      const elapsed = now - last
      last = now
      const { viewport } = this.state
      const dx = this.velocityX * elapsed
      const dy = this.velocityY * elapsed
      this.state.updateViewport({ x: viewport[VIEWPORT_X] + dx, y: viewport[VIEWPORT_Y] + dy, zoom: viewport[VIEWPORT_ZOOM] })
      // Normalize decay to a 60fps frame.
      const decay = DRAG_INERTIA ** (elapsed / 16.6667)
      this.velocityX *= decay
      this.velocityY *= decay
      this.options.onViewportDrag?.({ type: 'viewportDragDecelarate', dx, dy })
      if (Math.abs(this.velocityX) < MIN_SPEED && Math.abs(this.velocityY) < MIN_SPEED) {
        this.momentumRAF = 0
        return
      }
      this.momentumRAF = requestAnimationFrame(step)
    }
    this.momentumRAF = requestAnimationFrame(step)
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClickPending = false
  }
}
