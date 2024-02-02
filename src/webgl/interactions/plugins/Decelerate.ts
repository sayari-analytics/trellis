import { VIEWPORT_EVENT } from '../../../utils'
import InteractionPlugin from './InteractionPlugin'

export default class Decelerate extends InteractionPlugin {
  private _decelerating = false
  private _i = 0
  private _dx = 0
  private _dy = 0
  private _minSpeed = 0.01
  private _saved: ({ x: number; y: number; time: number } | undefined)[] = []

  down() {
    if (this.disabled) {
      return
    }

    this._saved = new Array(60)
    this._dx = this._dy = this._i = 0
  }

  move() {
    if (this.disabled) {
      return
    }

    this._saved[this._i++] = {
      x: this.viewport.x,
      y: this.viewport.y,
      time: performance.now()
    }

    if (this._i > 60) {
      this._saved.splice(0, 30)
      this._i = 30
    }
  }

  up() {
    if (this._i > 0) {
      const now = performance.now()
      for (const saved of this._saved) {
        if (saved !== undefined && saved.time >= now - 100) {
          const time = now - saved.time
          this._dx = (this.viewport.x - saved.x) / time
          this._dy = (this.viewport.y - saved.y) / time
          break
        }
      }
    }
  }

  update(elapsed: number) {
    if (this.disabled || this.dragInertia === 0) {
      return
    }

    let dx: number | undefined, dy: number | undefined

    if (this._dx) {
      dx = this._dx * elapsed * 8
      this._dx *= this.dragInertia
      if (Math.abs(this._dx) < this._minSpeed) {
        this._dx = 0
      }
    }

    if (this._dy) {
      dy = this._dy * elapsed * 8
      this._dy *= this.dragInertia
      if (Math.abs(this._dy) < this._minSpeed) {
        this._dy = 0
      }
    }

    if (dx || dy) {
      this._decelerating = true
      this.events.onViewportDrag?.({
        type: VIEWPORT_EVENT.DRAG_DECELERATE,
        dx: dx ?? 0,
        dy: dy ?? 0
      })
    } else {
      this._decelerating = false
    }
  }

  get isDecelerating() {
    return this._decelerating
  }

  private get disabled() {
    return this.events.onViewportDrag === undefined || this._paused
  }

  private get dragInertia() {
    return this.options.dragInertia
  }
}
