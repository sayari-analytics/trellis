import { Container, Sprite } from 'pixi.js'
import { CircleTexture } from '../textures/circleTexture'
import type { Stroke } from '../../../types'
import { NodeFill } from './nodeFill'

export class NodeStrokes {
  radius?: number

  private sprites: Sprite[] = []
  private strokes?: Stroke[]
  private nodeRadius?: number

  constructor(
    private container: Container,
    private circleTexture: CircleTexture,
    private nodeFill: NodeFill
  ) {}

  update(x: number, y: number, strokes: Stroke[], nodeRadius: number) {
    if (strokes !== this.strokes || nodeRadius !== this.nodeRadius) {
      this.radius = nodeRadius

      for (let i = 0; i < strokes.length; i++) {
        this.radius += strokes[i].width
        let circle = this.sprites[i]

        if (circle === undefined) {
          circle = new Sprite({
            texture: this.circleTexture.getTexture(),
            anchor: 0.5
          })
          this.sprites[i] = circle
          this.container.addChildAt(this.sprites[i], this.container.getChildIndex(this.nodeFill.sprite!))
        }

        circle.scale = this.radius / this.circleTexture.scaleFactor
        circle.tint = strokes[i].color
        circle.x = x
        circle.y = y
      }

      for (let i = strokes.length; i < this.sprites.length; i++) {
        const circle = this.sprites[i]
        this.container.removeChild(circle)
        circle.destroy()
      }
    } else {
      for (let i = 0; i < this.sprites.length; i++) {
        this.sprites[i].x = x
        this.sprites[i].y = y
      }
    }

    this.strokes = strokes
    this.nodeRadius = nodeRadius
  }

  exit() {
    if (this.sprites) {
      while (this.sprites.length > 0) {
        const sprite = this.sprites.pop()!
        this.container.removeChild(sprite)
        sprite.destroy()
      }
    }
  }
}
