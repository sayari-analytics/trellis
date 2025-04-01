import { Sprite, Container, Texture } from 'pixi.js'
import { IRendererObject } from '.'
import { Color } from '../../..'

export class LineSegment implements IRendererObject {
  private sprite?: Sprite
  private shouldShow = true
  private width?: number
  private color?: Color
  private opacity?: number

  constructor(private container: Container) {}

  style(width: number, color: Color, opacity: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: Texture.WHITE,
        anchor: { x: 0.5, y: 0 }
      })
      this.container.addChild(this.sprite)
    }

    if (width !== this.width) {
      this.width = width
      this.sprite.scale.x = this.width
    }

    if (opacity !== this.opacity) {
      this.opacity = opacity
      this.sprite.alpha = opacity
    }

    if (color !== this.color) {
      this.color = color
      this.sprite.tint = this.color
    }

    return this
  }

  position(x0: number, y0: number, theta: number, distance: number) {
    if (this.sprite) {
      this.sprite.scale.y = distance
      this.sprite.rotation = theta
      this.sprite.x = x0
      this.sprite.y = y0
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
