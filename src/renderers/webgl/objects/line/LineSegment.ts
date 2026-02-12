import { Container, Sprite, Texture } from 'pixi.js'
import { RenderObject, Stroke } from '../../../../types'
import { DEFAULT_FILL, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH, HALF_PI } from '../../../../utils/constants'
import { isNumber } from '../../../../utils/helpers'

// TODO -> let LineSegment own arrow rendering
export default class LineSegment implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private _length = 0
  private object: Sprite
  private style: Required<Stroke>

  constructor(
    private container: Container,
    { color = DEFAULT_FILL, width = DEFAULT_STROKE_WIDTH, opacity = DEFAULT_OPACITY }: Partial<Stroke> = {}
  ) {
    this.container = container
    this.style = { color, width, opacity }
    this.object = this.create()
  }

  update(color = DEFAULT_FILL, width = DEFAULT_STROKE_WIDTH, opacity = DEFAULT_OPACITY) {
    this.style = { color, width, opacity }
    this.object.tint = color
    this.object.width = width
    this.object.alpha = opacity

    return this
  }

  rotate(angle: number) {
    this.object.rotation = angle + HALF_PI
    return this
  }

  resize(length: number) {
    if (length !== this._length) {
      this._length = length
      this.object.height = length
    }

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
    this.object.destroy()

    return undefined
  }

  getContainerIndex() {
    if (this.mounted) {
      return this.container.getChildIndex(this.object)
    }

    return -1
  }

  get width() {
    return this.style.width
  }

  get length() {
    return this._length
  }

  private create() {
    const object = new Sprite(Texture.WHITE)
    object.tint = this.style.color
    object.alpha = this.style.opacity
    object.width = this.style.width
    object.height = this._length
    object.anchor.set(0.5, 0)

    return object
  }
}
