import { Container, Sprite, Texture } from 'pixi.js'
import { angle, distance, HALF_PI } from './../../../utils'
import { RenderObject } from './../../../types'

export class LineSegment implements RenderObject {
  mounted = false

  private container: Container
  private lineSegment: Sprite

  constructor(container: Container) {
    this.container = container
    this.lineSegment = new Sprite(Texture.WHITE)
  }

  update(x0: number, y0: number, x1: number, y1: number, width: number, color: string | number, opacity: number) {
    this.lineSegment.x = x0
    this.lineSegment.y = y0
    this.lineSegment.width = width
    this.lineSegment.height = distance(x0, y0, x1, y1)
    this.lineSegment.rotation = angle(x0, y0, x1, y1) + HALF_PI
    this.lineSegment.tint = color
    this.lineSegment.alpha = opacity
    this.lineSegment.anchor.set(0.5, 0)

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChild(this.lineSegment)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.lineSegment)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.lineSegment.destroy()

    return undefined
  }
}
