import { FillStyle, RenderObject } from '../../../../types'
import { DEFAULT_FILL_STYLE } from '../../../../utils/constants'
import { Container, Sprite } from 'pixi.js'
import CircleTexture from '../../textures/CircleTexture'

export default class Circle implements RenderObject {
  mounted = false

  private _x = 0
  private _y = 0
  private _radius = 0

  private object: Sprite
  private style: Required<FillStyle> = DEFAULT_FILL_STYLE

  constructor(
    private container: Container,
    private texture: CircleTexture,
    color?: string,
    opacity?: number
  ) {
    this.container = container
    this.texture = texture

    this.style = {
      color: color ?? this.style.color,
      opacity: opacity ?? this.style.opacity
    }

    this.object = this.create()
  }

  update(color = this.style.color, opacity = this.style.opacity) {
    if (color !== this.style.color) {
      this.style.color = color
      this.object.tint = color
    }

    if (opacity !== this.style.opacity) {
      this.style.opacity = opacity
      this.object.alpha = opacity
    }

    return this
  }

  moveTo(x: number, y: number) {
    if (x !== this.x) {
      this._x = x
      this.object.x = x
    }

    if (y !== this.y) {
      this._y = y
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
      this.object.visible = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.mounted = false
      this.object.visible = false
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

  get x() {
    return this._x
  }

  get y() {
    return this._y
  }

  get radius() {
    return this._radius
  }

  private create() {
    const object = new Sprite(this.texture.get())
    object.anchor.set(0.5)
    object.x = this._x
    object.y = this._y
    object.visible = this.mounted
    object.tint = this.style.color
    object.alpha = this.style.opacity
    this.container.addChild(object)
    return object
  }
}
