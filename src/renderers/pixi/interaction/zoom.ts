import * as PIXI from 'pixi.js'
import { RENDERER_OPTIONS } from '..'


/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom {

  private app: PIXI.Application
  private parent: PIXI.Container
  private onContainerWheel: (e: WheelEvent, x: number, y: number, zoom: number) => void
  private paused = false

  minZoom = RENDERER_OPTIONS.minZoom
  maxZoom = RENDERER_OPTIONS.maxZoom

  constructor(app: PIXI.Application, parent: PIXI.Container, onContainerWheel: (e: WheelEvent, x: number, y: number, zoom: number) => void) {
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

    const step = -e.deltaY * (e.deltaMode ? 20 : 1) / 500
    const change = Math.pow(2, 1.1 * step)
    const zoom = this.parent.scale.x

    if (step > 0 && zoom >= this.maxZoom) {
      return
    } else if (step < 0 && zoom <= this.minZoom) {
      return
    }

    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom * change))

    let oldPoint = this.parent.toLocal(point)

    this.parent.scale.set(newZoom)
    const newPoint = this.parent.toGlobal(oldPoint)
    this.parent.scale.set(zoom)

    this.onContainerWheel(
      e,
      this.parent.x + point.x - newPoint.x,
      this.parent.y + point.y - newPoint.y,
      newZoom
    )
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
