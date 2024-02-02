import { VIEWPORT_EVENT, clampZoom } from '../../../utils'
import { Point } from 'pixi.js'
import InteractionPlugin from './InteractionPlugin'

/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */

export default class Zoom extends InteractionPlugin {
  private _zooming = false

  wheel(event: WheelEvent) {
    if (this.events.onViewportWheel === undefined) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (this._paused) {
      return
    }

    this._zooming = true

    const viewport = this.viewport
    const step = (-event.deltaY * (event.deltaMode ? 20 : 1)) / 500
    const change = Math.pow(2, 1.1 * step)

    const zoomStart = viewport.zoom
    const zoomEnd = clampZoom(this.minZoom, this.maxZoom, zoomStart * change)

    if ((step > 0 && zoomStart >= this.maxZoom) || (step < 0 && zoomStart <= this.minZoom)) {
      return
    }

    const globalStart = new Point()
    this.events.system.mapPositionToPoint(globalStart, event.clientX, event.clientY)
    globalStart.x /= 2
    globalStart.y /= 2

    const localStart = this.root.toLocal(globalStart)
    this.setZoom(zoomEnd)

    const globalEnd = this.root.toGlobal(localStart)
    this.setZoom(zoomStart)

    this.events.onViewportWheel({
      type: VIEWPORT_EVENT.WHEEL,
      x: localStart.x,
      y: localStart.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: (viewport.x * zoomStart - viewport.x * zoomEnd - (globalStart.x - globalEnd.x)) / zoomEnd,
      dy: (viewport.y * zoomStart - viewport.y * zoomEnd - (globalStart.y - globalEnd.y)) / zoomEnd,
      dz: zoomEnd - zoomStart
    })
  }

  end() {
    this._zooming = false
  }

  get isZooming() {
    return this._zooming
  }

  private get minZoom() {
    return this.options.minZoom
  }

  private get maxZoom() {
    return this.options.maxZoom
  }

  private setZoom(_zoom: number) {
    // TODO: implement this
    // this.renderer.viewportRenderer.setZoom(zoom)
    return this
  }
}
