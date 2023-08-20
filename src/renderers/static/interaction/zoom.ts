import { Point } from 'pixi.js-legacy'
import { StaticRenderer } from '..'


/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom {

  private renderer: StaticRenderer
  private paused = false

  constructor(renderer: StaticRenderer) {
    this.renderer = renderer
  }

  wheel = (event: WheelEvent) => {
    if (this.renderer.onViewportWheel === undefined) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (this.paused) {
      return
    }

    const step = -event.deltaY * (event.deltaMode ? 20 : 1) / 500
    const change = Math.pow(2, 1.1 * step)
    const zoomStart = this.renderer.root.scale.x
    const zoomEnd = Math.max(this.renderer.minZoom, Math.min(this.renderer.maxZoom, zoomStart * change))

    if (
      (step > 0 && zoomStart >= this.renderer.maxZoom) ||
      (step < 0 && zoomStart <= this.renderer.minZoom)
    ) {
      return
    }

    const globalStart = new Point()
    this.renderer.eventSystem.mapPositionToPoint(globalStart, event.clientX, event.clientY)
    globalStart.x /= 2
    globalStart.y /= 2
    const localStart = this.renderer.root.toLocal(globalStart)

    this.renderer.root.scale.set(zoomEnd)
    const globalEnd = this.renderer.root.toGlobal(localStart)
    this.renderer.root.scale.set(zoomStart)

    this.renderer.onViewportWheel?.({
      type: 'viewportWheel',
      x: localStart.x,
      y: localStart.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: globalEnd.x - globalStart.x,
      dy: globalEnd.y - globalStart.y,
      dz: zoomEnd - zoomStart,
    })

    return false
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
