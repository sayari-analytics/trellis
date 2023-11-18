import { Container, Sprite } from 'pixi.js'
import { CircleTexture } from '../textures/circle'
import { NodeFill } from './fill'
import { equals } from '../../..'
import { RenderObject } from '../objectManager'
import { Stroke } from '../../../types'

export class NodeStrokes implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private nodeRadius = 0
  private strokesRadius = 0
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

  update(strokes: Stroke[] = []) {
    if (!equals(this.strokes, strokes)) {
      const isMounted = this.mounted
      this.delete()
      this.setStrokes(strokes)

      if (isMounted) {
        this.mount()
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

    return this
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

    this.strokesRadius = 0
    this.sprites = []
    this.strokes = []

    return undefined
  }

  get radius() {
    return this.strokesRadius
  }

  set radius(radius: number) {
    if (this.nodeRadius !== radius) {
      this.nodeRadius = radius
      this.strokesRadius = radius
      for (const index in this.strokes) {
        this.strokesRadius += this.strokes[index].width
        this.sprites[index].scale.set(this.scale)
      }
    }
  }

  private setStrokes(strokes: Stroke[]) {
    const sprites: Sprite[] = []
    let radius = this.nodeRadius

    for (const stroke of strokes) {
      radius += stroke.width
      const sprite = new Sprite(this.circleTexture.texture)
      sprite.anchor.set(0.5)
      sprite.scale.set(this.scale)
      sprite.tint = stroke.color
      sprite.x = this.x
      sprite.y = this.y
      sprites.push(sprite)
    }

    this.strokesRadius = radius
    this.sprites = sprites
    this.strokes = strokes
  }

  private get scale() {
    return this.strokesRadius / this.circleTexture.scaleFactor
  }
}
