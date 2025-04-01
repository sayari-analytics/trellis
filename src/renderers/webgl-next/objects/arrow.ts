import { Container, Sprite } from 'pixi.js'
import { IRendererObject } from '.'
import { ArrowTexture } from '../textures/arrowTexture'
import { Color } from '../../..'

export class Arrow implements IRendererObject {
  height: number
  width: number

  private sprite?: Sprite
  private shouldShow = true
  private color?: Color
  private opacity?: number

  constructor(
    private container: Container,
    private arrowTexture: ArrowTexture
  ) {
    this.height = this.arrowTexture.height
    this.width = this.arrowTexture.width
  }

  style(color: Color, opacity: number) {
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

    if (color !== this.color) {
      this.color = color
      this.sprite.tint = this.color
    }

    if (opacity !== this.opacity) {
      this.opacity = opacity
      this.sprite.alpha = this.opacity
    }

    return this
  }

  position(x: number, y: number, theta: number) {
    if (this.sprite) {
      this.sprite.rotation = theta
      this.sprite.x = x
      this.sprite.y = y
    }

    return this
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
