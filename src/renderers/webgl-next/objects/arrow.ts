import { Container, Sprite } from 'pixi.js'
import { ArrowTexture } from '../textures/arrowTexture'
import { HALF_PI } from '../utils'

export class Arrow {
  height: number
  width: number

  private sprite?: Sprite

  constructor(
    private container: Container,
    private arrowTexture: ArrowTexture
  ) {
    this.height = this.arrowTexture.height
    this.width = this.arrowTexture.width
  }

  update(x: number, y: number, rotation: number, color: string, opacity: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: this.arrowTexture.getTexture(),
        anchor: { x: 0.5, y: 1 },
        width: this.arrowTexture.width,
        height: this.arrowTexture.height,
        scale: 1 / this.arrowTexture.scaleFactor
      })
      this.sprite.rotation = rotation + HALF_PI
      this.sprite.tint = color
      this.sprite.alpha = opacity
      this.sprite.x = x
      this.sprite.y = y
      this.container.addChild(this.sprite)
    } else {
      this.sprite.rotation = rotation + HALF_PI
      this.sprite.tint = color
      this.sprite.alpha = opacity
      this.sprite.x = x
      this.sprite.y = y
    }
  }

  exit() {
    if (this.sprite) {
      this.container.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = undefined
    }
  }
}
