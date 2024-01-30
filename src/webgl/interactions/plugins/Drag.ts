import { CURSOR, VIEWPORT_EVENT } from '../../../utils'
import { ViewportDragEvent } from '../../../types/api'
import { FederatedPointerEvent } from 'pixi.js'
import InteractionPlugin from './InteractionPlugin'

export default class Drag extends InteractionPlugin {
  private _dragging = false
  private _last?: { x: number; y: number }
  private _current?: number
  private _dx = 0
  private _dy = 0

  start(event: FederatedPointerEvent) {
    if (this.disabled) {
      return
    }

    this.cursor = CURSOR.MOVE
    this._last = { x: event.global.x, y: event.global.y }
    this._current = event.pointerId
  }

  drag(event: FederatedPointerEvent) {
    if (this.disabled) {
      return
    }

    if (!!this._last && this._current === event.pointerId) {
      const { x, y } = event.global
      const dx = (this._last.x - x) / this.viewport.zoom
      const dy = (this._last.y - y) / this.viewport.zoom

      if (this.isDragging || Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        this._last = { x, y }
        this._dx = dx
        this._dy = dy

        if (!this.isDragging) {
          this.events.onViewportDragStart?.(this.getViewportDragEvent(event))
          this._dragging = true
        }

        this.events.onViewportDrag?.(this.getViewportDragEvent(event))
      }
    }
  }

  end(event: FederatedPointerEvent) {
    const isDragging = this.isDragging

    if (this.disabled) {
      return
    }

    this.cursor = CURSOR.AUTO
    this._dragging = false
    this._last = this._current = undefined
    this._dx = this._dy = 0

    if (isDragging) {
      this.events.onViewportDragEnd?.(this.getViewportDragEvent(event))
    }
  }

  get isDragging() {
    return this._dragging
  }

  private get disabled() {
    return this.events.onViewportDrag === undefined || this._paused
  }

  private getViewportDragEvent(event: FederatedPointerEvent): ViewportDragEvent {
    const local = this.root.toLocal(event.global)
    return {
      type: VIEWPORT_EVENT.DRAG,
      x: local.x,
      y: local.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: this.isDragging ? this._dx : 0,
      dy: this.isDragging ? this._dy : 0,
      target: this.viewport,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }
  }
}
