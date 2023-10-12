import { Container, Sprite } from 'pixi.js'
import * as Graph from '../../..'
import { NodeRenderer } from '../node'
import { CircleTexture } from '../textures/circle'

export class NodeStrokes {
  mounted = false
  radius = 0
  sprites?: Sprite[] // TODO - make private

  private container: Container
  private circleTexture: CircleTexture
  private nodeRenderer: NodeRenderer
  private style?: Graph.NodeStyle

  constructor(container: Container, circleTexture: CircleTexture, nodeRenderer: NodeRenderer) {
    this.container = container
    this.circleTexture = circleTexture
    this.nodeRenderer = nodeRenderer
  }

  update(x: number, y: number, radius: number, style?: Graph.NodeStyle) {
    if (style?.stroke !== this.style?.stroke) {
      // exit
      const isMounted = this.mounted
      this.delete()

      if (style?.stroke?.length) {
        // enter

        this.sprites = Array(style.stroke.length)

        this.radius = radius

        for (let i = 0; i < style.stroke.length; i++) {
          this.radius += style.stroke[i].width
          const circle = new Sprite(this.circleTexture.texture)
          circle.anchor.set(0.5)
          circle.scale.set(this.radius / this.circleTexture.scaleFactor)
          circle.tint = style.stroke[i].color
          circle.x = x
          circle.y = y
          this.sprites[i] = circle
        }
        if (isMounted) {
          this.mount()
        }
      }
    } else if (this.sprites && this.style?.stroke) {
      // reposition
      this.radius = radius

      for (let i = 0; i < this.sprites.length; i++) {
        this.radius += this.style.stroke[i].width
        const scale = this.radius / this.circleTexture.scaleFactor
        if (scale !== this.sprites[i].scale.x) {
          this.sprites[i].scale.set(this.radius / this.circleTexture.scaleFactor)
        }
        this.sprites[i].x = x
        this.sprites[i].y = y
      }
    }

    this.style = style

    return this
  }

  mount() {
    if (!this.mounted && this.sprites) {
      const strokeContainerIndex = this.nodeRenderer.fill.containerIndex

      for (let i = this.sprites.length - 1; i >= 0; i--) {
        this.container.addChildAt(this.sprites[i], strokeContainerIndex)
      }
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted && this.sprites) {
      for (let i = this.sprites.length - 1; i >= 0; i--) {
        this.container.removeChild(this.sprites[i])
      }
      this.mounted = false
    }

    return this
  }

  delete() {
    this.radius = 0
    this.unmount()

    if (this.sprites) {
      for (const stroke of this.sprites) {
        stroke.destroy()
      }
    }

    return undefined
  }
}
