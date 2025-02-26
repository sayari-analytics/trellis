import { Sprite, Container } from 'pixi.js'
import { CircleTexture } from '../textures/circleTexture'
import { DEFAULT_NODE_FILL } from '../../../utils/constants'

export class NodeFill {
  sprite?: Sprite

  constructor(
    private container: Container,
    private circleTexture: CircleTexture
  ) {}

  update(x: number, y: number, color: string | undefined, radius: number) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: this.circleTexture.getTexture(),
        anchor: 0.5
      })
      this.sprite.tint = color ?? DEFAULT_NODE_FILL
      this.sprite.scale = radius / this.circleTexture.scaleFactor
      this.sprite.x = x
      this.sprite.y = y
      this.container.addChild(this.sprite)
    } else {
      this.sprite!.tint = color ?? DEFAULT_NODE_FILL
      this.sprite!.scale = radius / this.circleTexture.scaleFactor
      this.sprite!.x = x
      this.sprite!.y = y
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
