import { StaticRenderer } from '..'


export class Decelerate {

  private renderer: StaticRenderer
  private paused = false
  private saved: { x: number, y: number, time: number }[] = []
  private i: number = 0
  private x: number = 0
  private y: number = 0
  private minSpeed = 0.01

  constructor(renderer: StaticRenderer) {
    this.renderer = renderer
  }

  down = () => {
    this.saved = new Array(60)
    this.x = this.y = this.i = 0
  }

  move = () => {
    if (this.paused) {
      return
    }

    this.saved[this.i++] = { x: -this.renderer.root.x, y: -this.renderer.root.y, time: performance.now() }

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
          this.x = (- this.renderer.root.x - save.x) / time
          this.y = (- this.renderer.root.y - save.y) / time
          break
        }
      }
    }
  }

  update = (elapsed: number) => {
    if (this.renderer.onViewportDrag === undefined || this.paused || this.renderer.dragInertia === 0) {
      return
    }
    
    let x: number | undefined, y: number | undefined

    if (this.x) {
      x = this.x * elapsed * 8
      this.x *= this.renderer.dragInertia
      if (Math.abs(this.x) < this.minSpeed) {
        this.x = 0
      }
    }

    if (this.y) {
      y = this.y * elapsed * 8
      this.y *= this.renderer.dragInertia
      if (Math.abs(this.y) < this.minSpeed) {
        this.y = 0
      }
    }
    
    if (x || y) {
      this.renderer.onViewportDrag({
        type: 'viewportDragDecelarate',
        dx: x ?? 0,
        dy: y ?? 0,
      })
    }
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
