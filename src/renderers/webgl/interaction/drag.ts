import * as PIXI from 'pixi.js'
import { InternalRenderer } from '..'
import { Node, Edge } from '../../..'


/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Drag Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/drag.js)
 */
export class Drag <N extends Node, E extends Edge>{

  private renderer: InternalRenderer<N, E>
  private onContainerDrag: (event: PIXI.InteractionEvent, x: number, y: number) => void
  private paused = false
  private last?: { x: number, y: number }
  private current?: number
  private moved = false

  constructor(renderer: InternalRenderer<N, E>, onContainerDrag: (event: PIXI.InteractionEvent, x: number, y: number) => void) {
    this.renderer = renderer
    this.onContainerDrag = onContainerDrag
  }

  down = (event: PIXI.InteractionEvent) => {
    if (this.paused) {
      return
    }

    // this.renderer.app.view.style.cursor = 'move'
    this.last = { x: event.data.global.x, y: event.data.global.y }
    this.current = event.data.pointerId
  }

  move = (event: PIXI.InteractionEvent) => {
    if (this.paused) {
      return
    }

    if (this.last && this.current === event.data.pointerId) {
      const x = event.data.global.x
      const y = event.data.global.y

      const distX = x - this.last.x
      const distY = y - this.last.y
      if (this.moved || Math.abs(distX) >= 5 || Math.abs(distY) >= 5) {
        // const centerX = this.renderer.root.x + (distX / this.renderer.root.scale.x)
        // const centerY = this.renderer.root.y + (distY / this.renderer.root.scale.x)
        const centerX = this.renderer.x + (distX / this.renderer.root.scale.x) // TODO - if position is interpolated, renderer.x is the target position.  need to use current position
        const centerY = this.renderer.y + (distY / this.renderer.root.scale.y)
        this.last = { x, y }
        this.moved = true

        this.onContainerDrag(event, centerX, centerY)
      }
    }
  }

  up = () => {
    if (this.paused) {
      return
    }

    // this.renderer.app.view.style.cursor = 'auto'

    this.last = undefined
    this.moved = false
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
  }
}
