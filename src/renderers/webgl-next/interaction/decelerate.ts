import { Renderer } from '..'

/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Decelerate Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/decelerate.js)
 */
export class Decelerate {
  decelerating = false

  private paused = false
  private saved: { x: number; y: number; time: number }[] = []
  private i: number = 0
  private x: number = 0
  private y: number = 0
  private minSpeed = 0.01

  constructor(private renderer: Renderer) {}

  down = () => {
    if (this.renderer.components.events.onViewportDrag === undefined || this.paused) {
      return
    }

    this.saved = new Array(60)
    this.x = this.y = this.i = 0
  }

  move = () => {
    if (this.paused) {
      return
    }

    this.saved[this.i++] = { x: this.renderer.components.viewport.x, y: this.renderer.components.viewport.y, time: performance.now() }

    if (this.i > 60) {
      this.saved.splice(0, 30)
      this.i = 30
    }
  }

  up = () => {
    if (this.i > 0) {
      const now = performance.now()
      for (const save of this.saved) {
        if (save !== undefined && save.time >= now - 100) {
          const time = now - save.time
          this.x = (this.renderer.components.viewport.x - save.x) / time
          this.y = (this.renderer.components.viewport.y - save.y) / time
          break
        }
      }
    }
  }

  render = (elapsed: number) => {
    if (
      this.renderer.components.events.onViewportDrag === undefined ||
      this.paused ||
      this.renderer.components.viewport.dragInertia === 0
    ) {
      return
    }

    let x: number | undefined, y: number | undefined

    if (this.x) {
      x = this.x * elapsed * 8
      this.x *= this.renderer.components.viewport.dragInertia
      if (Math.abs(this.x) < this.minSpeed) {
        this.x = 0
      }
    }

    if (this.y) {
      y = this.y * elapsed * 8
      this.y *= this.renderer.components.viewport.dragInertia
      if (Math.abs(this.y) < this.minSpeed) {
        this.y = 0
      }
    }

    if (x || y) {
      this.decelerating = true
      this.renderer.components.events.onViewportDrag({
        type: 'viewportDragDecelarate',
        dx: x ?? 0,
        dy: y ?? 0
      })
    } else {
      this.decelerating = false
    }
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
