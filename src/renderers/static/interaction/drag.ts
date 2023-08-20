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
  private moved = false

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

      /**
       * make x,y coordinate scale relative to app.stage, ignoring zoom transforms applied to root
       * this only positions the graph correctly when zoom === 1
       * repositioning on wheel zoom works
       */
      const dx = this.last.x - x
      const dy = this.last.y - y

      /**
       * make x,y coordinate scale relative to root
       * this positions the graph correctly when zoom !== 1
       * but repositioning on wheel zoom is broken
       */
      // const dx = (this.last.x - x) / this.renderer.zoom
      // const dy = (this.last.y - y) / this.renderer.zoom

      if (this.moved || Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        this.last = { x, y }
        this.moved = true
        const local = this.renderer.root.toLocal(event.global)
        this.dragging = true

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

  up = () => {
    if (this.renderer.onViewportDrag === undefined || this.paused) {
      return
    }

    this.renderer.container.style.cursor = 'auto'
    this.dragging = this.moved = false
    this.last = this.current = undefined
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
