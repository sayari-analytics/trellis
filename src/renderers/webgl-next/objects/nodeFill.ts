import { Sprite, Container } from 'pixi.js'
import { IRendererObject } from '.'
import { CircleTexture } from '../textures/circleTexture'
import { DEFAULT_NODE_FILL } from '../../../utils/constants'
import { Color } from '../../../types'

export class NodeFill implements IRendererObject {
  sprite?: Sprite

  private color?: Color

  constructor(
    private container: Container,
    private circleTexture: CircleTexture
  ) {}

  style(color: Color | undefined, radius: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: this.circleTexture.getTexture(),
        anchor: 0.5
      })
      this.container.addChild(this.sprite)
    }

    this.sprite.scale = radius / this.circleTexture.scaleFactor

    const _color = color ?? DEFAULT_NODE_FILL
    if (this.color !== _color) {
      this.color = _color
      this.sprite.tint = this.color
    }

    return this
  }

  position(x: number, y: number) {
    if (this.sprite) {
      this.sprite.x = x
      this.sprite.y = y
    }

    return this
  }

  exit() {
    if (this.sprite) {
      this.container.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = undefined
    }
  }
}
