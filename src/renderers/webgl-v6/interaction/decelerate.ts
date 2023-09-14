import { InternalRenderer } from '..'
import { Node, Edge } from '../../..'


/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Decelerate Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/decelerate.js)
 */
export class Decelerate <N extends Node, E extends Edge>{

  private renderer: InternalRenderer<N, E>
  private paused = false
  private saved: { x: number, y: number, time: number }[] = []
  private x?: number
  private y?: number
  private minSpeed = 0.01
  private percentChangeX: number
  private percentChangeY: number

  constructor(renderer: InternalRenderer<N, E>) {
    this.renderer = renderer
    this.percentChangeX = renderer.dragInertia
    this.percentChangeY = renderer.dragInertia
  }

  down = () => {
    this.saved = []
    this.x = this.y = undefined
  }

  move = () => {
    if (this.paused) {
      return
    }

    this.saved.push({ x: this.renderer.x, y: this.renderer.y, time: performance.now() })
    if (this.saved.length > 60) {
      this.saved.splice(0, 30)
    }
  }

  up = () => {
    if (this.saved.length) {
      const now = performance.now()
      for (const save of this.saved) {
        if (save.time >= now - 100) {
          const time = now - save.time
          this.x = (this.renderer.x - save.x) / time
          this.y = (this.renderer.y - save.y) / time
          this.percentChangeX = this.percentChangeY = this.renderer.dragInertia
          break
        }
      }
    }
  }

  update = (elapsed: number) => {
    if (this.paused || this.renderer.dragInertia === 0) {
      return
    }

    let x
    let y

    if (this.x) {
      x = this.renderer.x + this.x * elapsed
      this.x *= this.percentChangeX
      if (Math.abs(this.x) < this.minSpeed) {
        this.x = 0
      }
    }

    if (this.y) {
      y = this.renderer.y + this.y * elapsed
      this.y *= this.percentChangeY
      if (Math.abs(this.y) < this.minSpeed) {
        this.y = 0
      }
    }

    if (x || y) {
      this.renderer.expectedViewportXPosition = x ?? this.renderer.x
      this.renderer.expectedViewportYPosition = y ?? this.renderer.y
      this.renderer.onViewportDrag?.({
        type: 'viewportDragDecelarate',
        viewportX: x ?? this.renderer.x,
        viewportY: y ?? this.renderer.y,
        target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom }
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
