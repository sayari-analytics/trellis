import { Container, Sprite } from 'pixi.js'
import type { NodeStyle } from '../../../types'
import CircleTexture from '../textures/CircleTexture'

const DEFAULT_NODE_FILL = 0xaaaaaa

export class NodeFill {
  mounted = false
  fill: Sprite // TODO - make private

  private container: Container
  private circleTexture: CircleTexture
  private radius?: number
  private style?: NodeStyle

  constructor(container: Container, circleTexture: CircleTexture) {
    this.container = container
    this.circleTexture = circleTexture
    this.fill = new Sprite(this.circleTexture.get())
    this.fill.anchor.set(0.5)
    this.fill.visible = false

    this.container.addChild(this.fill)
  }

  update(x: number, y: number, radius: number, style?: NodeStyle) {
    if ((style?.color ?? DEFAULT_NODE_FILL) !== (this.style?.color ?? DEFAULT_NODE_FILL)) {
      this.fill.tint = style?.color ?? DEFAULT_NODE_FILL
    }

    if (radius !== this.radius) {
      this.fill.scale.set(radius / this.circleTexture.scaleFactor)
      this.radius = radius
    }

    this.fill.x = x
    this.fill.y = y

    this.style = style

    return this
  }

  mount() {
    if (!this.mounted) {
      // TODO - why is mounting/unmouting fill Sprite less efficient?
      this.fill.visible = true
      // this.container.addChild(this.fill)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.fill.visible = false
      // this.container.removeChild(this.fill)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.container.removeChild(this.fill)
    this.fill.destroy()

    return undefined
  }

  getContainerIndex() {
    return this.container.getChildIndex(this.fill)
  }
}
