import { Sprite } from 'pixi.js-legacy'
import { StaticRenderer } from '..'


export class Arrow {

  mounted = false
  height: number
  width: number

  private renderer: StaticRenderer
  private arrow: Sprite
  
  constructor(renderer: StaticRenderer, color: string | number, opacity: number) {
    this.renderer = renderer
    this.arrow = new Sprite(this.renderer.arrow.texture)
    this.height = this.renderer.arrow.height
    this.width = this.renderer.arrow.width
    this.arrow.anchor.set(0, 0.5)
    this.arrow.scale.set(1 / this.renderer.arrow.scaleFactor)
    this.update(color, opacity)
  }

  update(color: string | number, opacity: number) {
    this.arrow.tint = color
    this.arrow.alpha = opacity

    return this
  }

  position(x: number, y: number, rotation: number) {
    this.arrow.x = x
    this.arrow.y = y
    this.arrow.rotation = rotation
    return this
  }

  mount() {
    if (!this.mounted) {
      this.renderer.edgesContainer.addChild(this.arrow)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.renderer.edgesContainer.removeChild(this.arrow)
      this.mounted = false
    }

    return this
  }

  delete() {
    if (this.mounted) {
      this.unmount()
    }

    return undefined
  }
}
