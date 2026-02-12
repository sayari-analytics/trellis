import { Container, Sprite } from 'pixi.js'
import { FillStyle, RenderObject } from '../../../types'
import ArrowTexture from '../textures/ArrowTexture'
import { DEFAULT_FILL, DEFAULT_FILL_STYLE, DEFAULT_OPACITY } from '../../../utils/constants'

export default class Arrow implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private object: Sprite
  private style: Required<FillStyle> = DEFAULT_FILL_STYLE

  constructor(
    private container: Container,
    private texture: ArrowTexture
  ) {
    this.container = container
    this.texture = texture
    this.object = this.create()
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

  rotate(angle: number) {
    this.object.rotation = angle
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

  get width() {
    return this.texture.width
  }

  get height() {
    return this.texture.height
  }

  private get scale() {
    return 1 / this.texture.scaleFactor
  }

  private create() {
    const object = new Sprite(this.texture.get())
    object.anchor.set(0, 0.5)
    object.scale.set(this.scale)
    object.tint = this.style.color
    object.alpha = this.style.opacity
    return object
  }
}
