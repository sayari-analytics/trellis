import { Point } from 'pixi.js-legacy'
import { InternalRenderer } from '..'


/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom {

  private renderer: InternalRenderer
  private paused = false

  constructor(renderer: InternalRenderer<any, any>) {
    this.renderer = renderer
  }

  wheel = (event: WheelEvent) => {
    if (this.renderer.onViewportWheel !== undefined) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (this.paused) {
      return
    }

    const step = -event.deltaY * (event.deltaMode ? 20 : 1) / 500
    const change = Math.pow(2, 1.1 * step)
    const zoomStart = this.renderer.zoom
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
    const rootX = this.renderer.root.x + globalStart.x - globalEnd.x
    const rootY = this.renderer.root.y + globalStart.y - globalEnd.y
    this.renderer.root.scale.set(zoomStart)

    const viewportX = (rootX - (this.renderer.width / 2)) / zoomEnd
    const viewportY = (rootY - (this.renderer.height / 2)) / zoomEnd

    this.renderer.expectedViewportXPosition = viewportX
    this.renderer.expectedViewportYPosition = viewportY
    this.renderer.expectedViewportZoom = zoomEnd

    this.renderer.onViewportWheel?.({
      type: 'viewportWheel',
      x: localStart.x, // these don't really make sense do they?
      y: localStart.y,
      clientX: event.clientX,
      clientY: event.clientY,
      viewportX,
      viewportY,
      viewportZoom: zoomEnd,
      target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom }
    })

    if (this.renderer.onViewportWheel !== undefined) {
      return false
    }
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
