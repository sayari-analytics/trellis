import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { Node, Edge } from '../../..'
import { clientPositionFromEvent } from '../utils'

/**
 * drag logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
export class Drag<N extends Node, E extends Edge> {
  private renderer: InternalRenderer<N, E>
  private paused = false
  private last?: { x: number; y: number }
  private current?: number
  private moved = false

  constructor(renderer: InternalRenderer<N, E>) {
    this.renderer = renderer
  }

  down = (event: PIXI.InteractionEvent) => {
    if (this.paused) {
      return
    }

    this.renderer.container.style.cursor = 'move'
    this.last = { x: event.data.global.x, y: event.data.global.y }
    this.current = event.data.pointerId
  }

  move = (event: PIXI.InteractionEvent) => {
    if (this.paused) {
      return
    }

    if (this.last && this.current === event.data.pointerId) {
      const x = event.data.global.x
      const y = event.data.global.y

      const dx = x - this.last.x
      const dy = y - this.last.y

      if (this.moved || Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        const viewportX = this.renderer.x + dx / this.renderer.zoom
        const viewportY = this.renderer.y + dy / this.renderer.zoom
        this.last = { x, y }
        this.moved = true

        this.renderer.expectedViewportXPosition = viewportX
        this.renderer.expectedViewportYPosition = viewportY

        const local = this.renderer.root.toLocal(event.data.global)
        const client = clientPositionFromEvent(event.data.originalEvent)

        if (!this.renderer.dragging) {
          this.renderer.dragging = true
          this.renderer.onViewportDragStart?.({
            type: 'viewportDrag',
            x: local.x,
            y: local.y,
            clientX: client.x,
            clientY: client.y,
            viewportX,
            viewportY,
            target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom },
            altKey: this.renderer.altKey,
            ctrlKey: this.renderer.ctrlKey,
            metaKey: this.renderer.metaKey,
            shiftKey: this.renderer.shiftKey,
          })
        }

        this.renderer.onViewportDrag?.({
          type: 'viewportDrag',
          x: local.x,
          y: local.y,
          clientX: client.x,
          clientY: client.y,
          viewportX,
          viewportY,
          target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom },
          altKey: this.renderer.altKey,
          ctrlKey: this.renderer.ctrlKey,
          metaKey: this.renderer.metaKey,
          shiftKey: this.renderer.shiftKey,
        })
      }
    }
  }

  up = () => {
    if (this.paused) {
      return
    }

    this.renderer.container.style.cursor = 'auto'
    this.last = undefined
    this.moved = false
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
