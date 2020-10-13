import * as PIXI from 'pixi.js'
import { RENDERER_OPTIONS } from '..'


/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom {

  private app: PIXI.Application
  private parent: PIXI.Container
  private onContainerWheel: (x: number, y: number, zoom: number) => void
  private paused = false

  minZoom = RENDERER_OPTIONS.minZoom
  maxZoom = RENDERER_OPTIONS.maxZoom

  constructor(app: PIXI.Application, parent: PIXI.Container, onContainerWheel: (x: number, y: number, zoom: number) => void) {
    this.app = app
    this.parent = parent
    this.onContainerWheel = onContainerWheel
  }

  wheel = (e: WheelEvent) => {
    e.preventDefault()

    if (this.paused) {
      return
    }

    let point = new PIXI.Point()
    this.app.renderer.plugins.interaction.mapPositionToPoint(point, e.clientX, e.clientY)

    // TODO - move to zoom control?
    const step = -e.deltaY * (e.deltaMode ? 20 : 1) / 500
    const change = Math.pow(2, 1.1 * step)
    const scale = this.parent.scale.x

    if (step > 0 && scale >= this.maxZoom) {
      return
    } else if (step < 0 && scale <= this.minZoom) {
      return
    }

    const newScale = Math.max(this.minZoom, Math.min(this.maxZoom, this.parent.scale.x * change))

    let oldPoint = this.parent.toLocal(point)

    this.parent.scale.set(newScale)
    const newPoint = this.parent.toGlobal(oldPoint)
    this.parent.scale.set(scale)

    this.onContainerWheel(
      this.parent.x + point.x - newPoint.x,
      this.parent.y + point.y - newPoint.y,
      newScale
    )
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
