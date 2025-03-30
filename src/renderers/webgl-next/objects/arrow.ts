import { Container, Sprite } from 'pixi.js'
import { ArrowTexture } from '../textures/arrowTexture'
import { HALF_PI } from '../utils'
import { Color } from '../../..'

export class Arrow {
  height: number
  width: number

  private sprite?: Sprite
  private shouldShow = true
  private color?: Color

  constructor(
    private container: Container,
    private arrowTexture: ArrowTexture
  ) {
    this.height = this.arrowTexture.height
    this.width = this.arrowTexture.width
  }

  update(x: number, y: number, theta: number, color: Color, opacity: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: this.arrowTexture.getTexture(),
        anchor: { x: 0.5, y: 1 },
        width: this.arrowTexture.width,
        height: this.arrowTexture.height,
        scale: 1 / this.arrowTexture.scaleFactor
      })
      this.container.addChild(this.sprite)
    }
    this.sprite.rotation = theta + HALF_PI
    this.sprite.alpha = opacity
    this.sprite.x = x
    this.sprite.y = y

    if (color !== this.color) {
      this.color = color
      this.sprite.tint = this.color
    }
  }

  show() {
    if (!this.shouldShow && this.sprite) {
      this.shouldShow = true
      // this.sprite.visible = true
      this.sprite.alpha = 1
    }
  }

  hide() {
    if (this.shouldShow && this.sprite) {
      this.shouldShow = false
      // this.sprite.visible = false
      this.sprite.alpha = 0
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
