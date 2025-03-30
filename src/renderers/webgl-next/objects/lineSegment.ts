import { Sprite, Container, Texture } from 'pixi.js'
import { HALF_PI } from '../utils'
import { distance } from '../../../utils/api'
import { Color } from '../../..'

export class LineSegment {
  private sprite?: Sprite
  private shouldShow = true
  private color?: Color

  constructor(private container: Container) {}

  update(x0: number, y0: number, x1: number, y1: number, width: number, theta: number, color: Color, opacity: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: Texture.WHITE,
        anchor: { x: 0.5, y: 0 },
        width: 1,
        height: 1
      })
      this.container.addChild(this.sprite)
    }

    this.sprite.scale.x = width
    this.sprite.scale.y = distance(x0, y0, x1, y1)
    this.sprite.rotation = theta + HALF_PI
    this.sprite.alpha = opacity
    this.sprite.x = x0
    this.sprite.y = y0

    if (this.color !== color) {
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
