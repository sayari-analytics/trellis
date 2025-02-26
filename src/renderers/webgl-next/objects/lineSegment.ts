import { Sprite, Container, Texture } from 'pixi.js'
import { HALF_PI } from '../utils'
import { angle, distance } from '../../../utils/api'

export class LineSegment {
  private sprite?: Sprite

  constructor(private container: Container) {}

  update(x0: number, y0: number, x1: number, y1: number, width: number, theta: number, color: string, opacity: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: Texture.WHITE,
        anchor: { x: 0.5, y: 0 },
        width: 1,
        height: 1
      })
      this.container.addChild(this.sprite)
      this.sprite.scale.x = width
      this.sprite.scale.y = distance(x0, y0, x1, y1)
      this.sprite.rotation = angle(x0, y0, x1, y1) + HALF_PI
      this.sprite.tint = color
      this.sprite.alpha = opacity
      this.sprite.x = x0
      this.sprite.y = y0
    } else {
      this.sprite.scale.x = width
      this.sprite.scale.y = distance(x0, y0, x1, y1)
      this.sprite.rotation = angle(x0, y0, x1, y1) + HALF_PI
      this.sprite.tint = color
      this.sprite.alpha = opacity
      this.sprite.x = x0
      this.sprite.y = y0
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
