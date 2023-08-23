import { FederatedPointerEvent } from 'pixi.js-legacy'
import { StaticRenderer } from '..'


/**
 * drag logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
export class Drag {

  dragging = false

  private renderer: StaticRenderer
  private paused = false
  private last?: { x: number, y: number }
  private current?: number

  constructor(renderer: StaticRenderer) {
    this.renderer = renderer
  }

  down = (event: FederatedPointerEvent) => {
    if (this.renderer.onViewportDrag === undefined || this.paused) {
      return
    }

    this.renderer.container.style.cursor = 'move'

    this.last = { x: event.global.x, y: event.global.y }
    this.current = event.pointerId
  }

  move = (event: FederatedPointerEvent) => {
    if (this.renderer.onViewportDrag === undefined || this.paused) {
      return
    }

    if (this.last && this.current === event.pointerId) {
      const x = event.global.x
      const y = event.global.y

      const dx = (this.last.x - x) / this.renderer.zoom
      const dy = (this.last.y - y) / this.renderer.zoom

      if (this.dragging || Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        this.last = { x, y }
        const local = this.renderer.root.toLocal(event.global)

        if (!this.dragging) {
          this.dragging = true
          this.renderer.onViewportDragStart?.({
            type: 'viewportDrag',
            x: local.x,
            y: local.y,
            clientX: event.clientX,
            clientY: event.clientY,
            dx,
            dy,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
          })
        }

        this.renderer.onViewportDrag?.({
          type: 'viewportDrag',
          x: local.x,
          y: local.y,
          clientX: event.clientX,
          clientY: event.clientY,
          dx,
          dy,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        })
      }
    }
  }

  up = (event: FederatedPointerEvent) => {
    if (this.renderer.onViewportDrag === undefined || this.paused) {
      return
    }

    this.renderer.container.style.cursor = 'auto'

    if (this.dragging) {
      const { x, y } = this.renderer.root.toLocal(event.global)

      this.renderer.onViewportDragEnd?.({
        type: 'viewportDrag',
        x,
        y,
        clientX: event.clientX,
        clientY: event.clientY,
        dx: 0,
        dy: 0,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

    this.dragging = false
    this.last = this.current = undefined
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
