import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer, ViewportWheelEvent } from '..'
import { Node, Edge } from '../../..'


/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom <N extends Node, E extends Edge>{

  private renderer: InternalRenderer<N, E>
  private onViewportWheel: (event: ViewportWheelEvent) => void
  private paused = false

  constructor(renderer: InternalRenderer<N, E>, onViewportWheel: (event: ViewportWheelEvent) => void) {
    this.renderer = renderer
    this.onViewportWheel = onViewportWheel
  }

  wheel = (event: WheelEvent) => {
    event.preventDefault()

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

    const globalStart = new PIXI.Point()
    ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).mapPositionToPoint(globalStart, event.clientX, event.clientY)
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

    this.onViewportWheel({
      type: 'viewportWheel',
      x: localStart.x,
      y: localStart.y,
      clientX: event.clientX,
      clientY: event.clientY,
      viewportX,
      viewportY,
      viewportZoom: zoomEnd,
      target: { x: this.renderer.x, y: this.renderer.y, zoom: this.renderer.zoom }
    })
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
