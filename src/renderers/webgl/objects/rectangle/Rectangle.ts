import { Dimensions, FillStyle, RenderObject } from '../../../../types'
import { DEFAULT_FILL, DEFAULT_OPACITY } from '../../../../utils/constants'
import { Container, Sprite, Texture } from 'pixi.js'
import { isNumber } from '../../../../utils/helpers'

export default class Rectangle implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private width = 0
  private height = 0
  private object: Sprite
  private style: Required<FillStyle>

  constructor(
    private container: Container,
    { color = DEFAULT_FILL, opacity = DEFAULT_OPACITY }: Partial<FillStyle> = {}
  ) {
    this.container = container
    this.style = { color, opacity }
    this.object = this.create()
  }

  update(color = DEFAULT_FILL, opacity = DEFAULT_OPACITY) {
    this.style = { color, opacity }
    this.object.tint = color
    this.object.alpha = opacity

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

  resize({ width, height }: Dimensions) {
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

  mount(index?: number) {
    if (!this.mounted) {
      this.mounted = true

      if (isNumber(index)) {
        this.container.addChildAt(this.object, index)
      } else {
        this.container.addChild(this.object)
      }
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.mounted = false
      this.container.removeChild(this.object)
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

  get size(): Dimensions {
    return { width: this.width, height: this.height }
  }

  get anchor() {
    return this.object.anchor
  }

  private create() {
    const object = new Sprite(Texture.WHITE)

    object.anchor.set(0, 0)
    object.x = this.x
    object.y = this.y
    object.tint = this.style.color
    object.alpha = this.style.opacity

    return object
  }
}
