import * as PIXI from 'pixi.js'
import { PIXIRenderer, RENDERER_OPTIONS } from '..'
import { Node, Edge } from '../../../'


/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
export class Zoom <N extends Node, E extends Edge>{

  private renderer: PIXIRenderer<N, E>
  private onContainerWheel: (e: WheelEvent, x: number, y: number, zoom: number) => void
  private paused = false

  minZoom = RENDERER_OPTIONS.minZoom
  maxZoom = RENDERER_OPTIONS.maxZoom

  constructor(renderer: PIXIRenderer<N, E>, onContainerWheel: (e: WheelEvent, x: number, y: number, zoom: number) => void) {
    this.renderer = renderer
    this.onContainerWheel = onContainerWheel
  }

  wheel = (e: WheelEvent) => {
    e.preventDefault()

    if (this.paused) {
      return
    }

    let point = new PIXI.Point()
    this.renderer.app.renderer.plugins.interaction.mapPositionToPoint(
      point,
      // account for x/y pivot
      e.clientX - (this.renderer.width / 2),
      e.clientY - (this.renderer.height / 2)
    )

    const step = -e.deltaY * (e.deltaMode ? 20 : 1) / 500
    const change = Math.pow(2, 1.1 * step)
    const zoom = this.renderer.zoom

    if (step > 0 && zoom >= this.maxZoom) {
      return
    } else if (step < 0 && zoom <= this.minZoom) {
      return
    }

    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom * change))

    let oldPoint = this.renderer.root.toLocal(point)

    this.renderer.root.scale.set(newZoom)
    const newPoint = this.renderer.root.toGlobal(oldPoint)
    this.renderer.root.scale.set(zoom)

    this.onContainerWheel(
      e,
      this.renderer.x + point.x - newPoint.x,
      this.renderer.y + point.y - newPoint.y,
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
