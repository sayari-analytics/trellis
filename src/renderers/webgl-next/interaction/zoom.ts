import { Point } from 'pixi.js'
import { Renderer } from '..'

/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom {
  zooming = false

  private paused = false

  constructor(private renderer: Renderer) {}

  wheel = (event: WheelEvent) => {
    if (this.renderer.components.events.onViewportWheel === undefined) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (this.paused) {
      return
    }

    const x = this.renderer.components.viewport.x
    const y = this.renderer.components.viewport.y
    const zoom = this.renderer.components.viewport.zoom
    const minZoom = this.renderer.components.viewport.minZoom
    const maxZoom = this.renderer.components.viewport.maxZoom

    this.zooming = true
    const step = (-event.deltaY * (event.deltaMode ? 20 : 1)) / 500
    const change = Math.pow(2, 1.1 * step)
    const zoomStart = zoom
    const zoomEnd = Math.max(minZoom, Math.min(maxZoom, zoomStart * change))

    if ((step > 0 && zoomStart >= maxZoom) || (step < 0 && zoomStart <= minZoom)) {
      return
    }

    const globalStart = new Point()
    this.renderer.components.events.eventSystem.mapPositionToPoint(globalStart, event.clientX, event.clientY)
    globalStart.x /= 2
    globalStart.y /= 2
    const localStart = this.renderer.containers.root.toLocal(globalStart)
    this.renderer.containers.root.scale.set(zoomEnd)
    const globalEnd = this.renderer.containers.root.toGlobal(localStart)
    this.renderer.containers.root.scale.set(zoomStart)

    this.renderer.components.events.onViewportWheel?.({
      type: 'viewportWheel',
      x: localStart.x,
      y: localStart.y,
      clientX: event.clientX,
      clientY: event.clientY,
      dx: (x * zoomStart - x * zoomEnd - (globalStart.x - globalEnd.x)) / zoomEnd,
      dy: (y * zoomStart - y * zoomEnd - (globalStart.y - globalEnd.y)) / zoomEnd,
      dz: zoomEnd - zoomStart
    })

    return false
  }

  render() {
    this.zooming = false
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
