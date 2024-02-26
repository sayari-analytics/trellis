import { Container, Sprite } from 'pixi.js'
import ArrowTexture from '../textures/ArrowTexture'

export class Arrow {
  mounted = false
  height: number
  width: number

  private container: Container
  private arrowTexture: ArrowTexture
  private arrow: Sprite

  constructor(container: Container, arrowTexture: ArrowTexture) {
    this.container = container
    this.arrowTexture = arrowTexture
    this.arrow = new Sprite(this.arrowTexture.get())
    this.height = this.arrowTexture.height
    this.width = this.arrowTexture.width
    this.arrow.anchor.set(0, 0.5)
    this.arrow.scale.set(1 / this.arrowTexture.scaleFactor)
  }

  update(x: number, y: number, rotation: number, color: string | number, opacity: number) {
    this.arrow.x = x
    this.arrow.y = y
    this.arrow.rotation = rotation
    this.arrow.tint = color
    this.arrow.alpha = opacity

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChild(this.arrow)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.arrow)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.arrow.destroy()

    return undefined
  }
}
