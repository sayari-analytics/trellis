import { Container, Sprite } from 'pixi.js'
import { CircleTexture } from '../textures/circle'
import { NodeFill } from './fill'
import { equals } from '../../..'
import type { Stroke } from '../../../types'

export class NodeStrokes {
  mounted = false
  radius = 0

  private x = 0
  private y = 0
  private fill: NodeFill
  private container: Container
  private circleTexture: CircleTexture
  private sprites: Sprite[] = []
  private strokes: Stroke[] = []

  constructor(container: Container, circleTexture: CircleTexture, fill: NodeFill) {
    this.container = container
    this.circleTexture = circleTexture
    this.fill = fill
  }

  update(radius: number, strokes: Stroke[] = []) {
    if (!equals(this.strokes, strokes)) {
      const isMounted = this.mounted
      this.delete()

      this.radius = radius
      this.setStrokes(strokes)

      if (isMounted) {
        this.mount()
      }
    } else if (this.radius !== radius) {
      this.radius = radius
      for (const index in this.strokes) {
        this.radius += this.strokes[index].width
        this.sprites[index].scale.set(this.scale)
      }
    }
  }

  moveTo(x: number, y: number) {
    let dirty = false

    if (this.x !== x) {
      this.x = x
      dirty = true
    }

    if (this.y !== y) {
      this.y = y
      dirty = true
    }

    if (dirty) {
      for (const sprite of this.sprites) {
        sprite.x = x
        sprite.y = y
      }
    }
  }

  mount() {
    if (!this.mounted) {
      const strokeContainerIndex = this.fill.getContainerIndex()

      for (const sprite of this.sprites) {
        this.container.addChildAt(sprite, strokeContainerIndex)
      }

      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      for (const sprite of this.sprites) {
        this.container.removeChild(sprite)
      }

      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()

    for (const sprite of this.sprites) {
      sprite.destroy()
    }

    this.radius = 0
    this.sprites = []
    this.strokes = []

    return undefined
  }

  private setStrokes(strokes: Stroke[]) {
    const sprites: Sprite[] = []

    for (const stroke of strokes) {
      this.radius += stroke.width
      const sprite = new Sprite(this.circleTexture.texture)
      sprite.anchor.set(0.5)
      sprite.scale.set(this.scale)
      sprite.tint = stroke.color
      sprite.x = this.x
      sprite.y = this.y
      sprites.push(sprite)
    }

    this.sprites = sprites
    this.strokes = strokes
  }

  private get scale() {
    return this.radius / this.circleTexture.scaleFactor
  }
}
