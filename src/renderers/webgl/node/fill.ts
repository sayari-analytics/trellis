import { Container, Sprite } from 'pixi.js'
import { CircleTexture } from '../textures/circle'
import { RenderObject } from '../objectManager'

const DEFAULT_NODE_FILL = '#AAAAAA'

export class NodeFill implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private _radius = 0
  private fill: Sprite
  private container: Container
  private circleTexture: CircleTexture
  private color = DEFAULT_NODE_FILL

  constructor(container: Container, circleTexture: CircleTexture) {
    this.container = container
    this.circleTexture = circleTexture
    this.fill = this.create()
  }

  set radius(radius: number) {
    if (this._radius !== radius) {
      this._radius = radius
      this.fill.scale.set(this.scale)
    }
  }

  update(color = DEFAULT_NODE_FILL) {
    if (this.color !== color) {
      this.color = color
      this.fill.tint = color
    }

    return this
  }

  moveTo(x: number, y: number) {
    if (this.x !== x) {
      this.x = x
      this.fill.x = x
    }
    if (this.y !== y) {
      this.y = y
      this.fill.y = y
    }

    return this
  }

  mount() {
    // TODO - why is mounting/unmouting fill Sprite less efficient?
    if (!this.mounted) {
      this.fill.visible = true
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.fill.visible = false
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

  private create() {
    const fill = new Sprite(this.circleTexture.texture)
    fill.tint = this.color
    fill.anchor.set(0.5)
    fill.visible = false
    fill.x = this.x
    fill.y = this.y
    this.container.addChild(fill)
    return fill
  }

  private get scale() {
    return this._radius / this.circleTexture.scaleFactor
  }
}
