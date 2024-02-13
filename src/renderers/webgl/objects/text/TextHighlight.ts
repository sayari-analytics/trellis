import { Container, Sprite, Texture } from 'pixi.js'
import { FillStyle, RenderObject, TextObject } from '../../../../types'

export default class TextHighlight implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private object: Sprite
  private width: number
  private height: number

  constructor(
    private container: Container,
    private textObject: TextObject,
    private style: Required<FillStyle>
  ) {
    this.container = container
    this.textObject = textObject
    this.style = style
    this.width = this.text.width
    this.height = this.text.height
    this.object = this.create()
  }

  update(style: Required<FillStyle>) {
    this.style = style
    this.object.tint = style.color
    this.object.alpha = style.opacity

    return this
  }

  resize(width: number, height: number) {
    if (this.width !== width) {
      this.width = width
      this.object.width = width
    }

    if (this.height !== height) {
      this.height = height
      this.object.height = height
    }

    return this
  }

  moveTo(x: number, y: number) {
    if (this.x !== x) {
      this.x = x
      this.object.x = x
    }

    if (this.y !== y) {
      this.y = y
      this.object.y = y
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChild(this.object)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.object)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.object.destroy()

    return undefined
  }

  get text() {
    return this.textObject
  }

  set text(text: TextObject) {
    this.textObject = text
  }

  get anchor() {
    return this.object.anchor
  }

  get rotation() {
    return this.object.rotation
  }

  set rotation(rotation: number) {
    this.object.rotation = rotation
  }

  private create() {
    const object = Sprite.from(Texture.WHITE)
    object.width = this.width
    object.height = this.height
    object.anchor.set(this.text.anchor.x, this.text.anchor.y)
    object.alpha = this.style.opacity
    object.tint = this.style.color
    return object
  }
}
