import { FederatedPointerEvent } from 'pixi.js'
import { InternalRenderer } from '..'


/**
 * drag logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
export class Drag {

  dragging = false

  private renderer: InternalRenderer
  private paused = false
  private last?: { x: number, y: number }
  private current?: number
  private moved = false

  constructor(renderer: InternalRenderer<any, any>) {
    this.renderer = renderer
  }

  down = (event: FederatedPointerEvent) => {
    if (this.paused) {
      return
    }

    if (this.renderer.onViewportDrag) {
      this.renderer.container.style.cursor = 'move'
    }

    this.last = { x: event.global.x, y: event.global.y }
    this.current = event.pointerId
  }

  move = (event: FederatedPointerEvent) => {
    if (this.paused) {
      return
    }

    if (this.last && this.current === event.pointerId) {
      const x = event.global.x
      const y = event.global.y

      const dx = x - this.last.x
      const dy = y - this.last.y

      if (this.moved || Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        const viewportX = this.renderer.x + (dx / this.renderer.zoom)
        const viewportY = this.renderer.y + (dy / this.renderer.zoom)
        this.last = { x, y }
        this.moved = true

        this.renderer.expectedViewportXPosition = viewportX
        this.renderer.expectedViewportYPosition = viewportY

        const local = this.renderer.root.toLocal(event.global)

        if (!this.dragging) {
          this.dragging = true
          this.renderer.onViewportDragStart?.({
            type: 'viewportDrag',
            x: local.x,
            y: local.y,
            clientX: event.clientX,
            clientY: event.clientY,
            viewportX,
            viewportY,
            target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom },
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
          viewportX,
          viewportY,
          target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom },
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        })
      }
    }
  }

  up = (event: FederatedPointerEvent) => {
    if (this.paused) {
      return
    }

    if (this.renderer.onViewportDrag) {
      this.renderer.container.style.cursor = 'auto'
    }

    if (this.dragging) {
      this.dragging = false
      const { x, y } = this.renderer.root.toLocal(event.global)

      this.renderer.onViewportDragEnd?.({
        type: 'viewportDrag',
        x,
        y: y,
        clientX: event.clientX,
        clientY: event.clientY,
        viewportX: this.renderer.x,
        viewportY: this.renderer.y,
        target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom },
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }

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
