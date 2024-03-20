import { FillStyle, RenderObject } from '../../../../types'
import { DEFAULT_FILL, DEFAULT_OPACITY } from '../../../../utils/constants'
import { Container, Sprite } from 'pixi.js'
import CircleTexture from '../../textures/CircleTexture'
import { isNumber } from '../../../../utils/helpers'

export default class Circle implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private _radius = 0

  private object: Sprite
  private style: Required<FillStyle>

  constructor(
    private container: Container,
    private texture: CircleTexture,
    { color = DEFAULT_FILL, opacity = DEFAULT_OPACITY }: Partial<FillStyle> = {},
    index?: number
  ) {
    this.container = container
    this.texture = texture
    this.style = { color, opacity }
    this.object = this.create(index)
  }

  update(color = DEFAULT_FILL, opacity = DEFAULT_OPACITY) {
    this.style = { color, opacity }
    this.object.tint = this.style.color
    this.object.alpha = this.style.opacity
    return this
  }

  moveTo(x: number, y: number) {
    if (x !== this.x) {
      this.x = x
      this.object.x = x
    }

    if (y !== this.y) {
      this.y = y
      this.object.y = y
    }

    return this
  }

  resize(radius: number) {
    if (this._radius !== radius) {
      this._radius = radius
      this.object.scale.set(radius / this.texture.scaleFactor)
    }

    return this
  }

  mount() {
    // TODO - why is mounting/unmouting fill Sprite less efficient?
    if (!this.mounted) {
      this.mounted = true
      this.object.visible = this.mounted
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.mounted = false
      this.object.visible = this.mounted
    }

    return this
  }

  delete() {
    this.unmount()
    this.container.removeChild(this.object)
    this.object.destroy()

    return undefined
  }

  getContainerIndex() {
    return this.container.getChildIndex(this.object)
  }

  get radius() {
    return this._radius
  }

  private create(index?: number) {
    const object = new Sprite(this.texture.get())

    object.anchor.set(0.5, 0.5)
    object.x = this.x
    object.y = this.y
    object.visible = this.mounted
    object.tint = this.style.color
    object.alpha = this.style.opacity

    if (isNumber(index)) {
      this.container.addChildAt(object, index)
    } else {
      this.container.addChild(object)
    }

    return object
  }
}
