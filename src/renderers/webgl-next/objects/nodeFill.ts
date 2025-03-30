import { Sprite, Container } from 'pixi.js'
import { CircleTexture } from '../textures/circleTexture'
import { DEFAULT_NODE_FILL } from '../../../utils/constants'
import { Color } from '../../../types'

export class NodeFill {
  sprite?: Sprite

  private color?: Color

  constructor(
    private container: Container,
    private circleTexture: CircleTexture
  ) {}

  update(x: number, y: number, color: Color | undefined, radius: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: this.circleTexture.getTexture(),
        anchor: 0.5
      })
      this.container.addChild(this.sprite)
    }

    this.sprite.scale = radius / this.circleTexture.scaleFactor
    this.sprite.x = x
    this.sprite.y = y

    const _color = color ?? DEFAULT_NODE_FILL
    if (this.color !== _color) {
      this.color = _color
      this.sprite.tint = this.color
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
