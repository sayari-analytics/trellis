import utils, { STYLE_DEFAULTS } from './utils'
import type { LabelBackgroundStyle } from './utils'
import { BitmapText, ColorSource, Container, Point, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { equals } from '../../../..'

export class LabelBackground {
  mounted = false

  private x?: number
  private y?: number
  private dirty = false
  private sprite: Sprite
  private label: Text | BitmapText
  private container: Container
  private rect: Rectangle
  private _style: LabelBackgroundStyle

  constructor(container: Container, label: Text | BitmapText, style: LabelBackgroundStyle) {
    this.label = label
    this.container = container
    this._style = style
    this.rect = this.label.getLocalBounds()

    const { width, height } = this.size

    this.sprite = Sprite.from(Texture.WHITE)
    this.sprite.height = height
    this.sprite.width = width
    this.sprite.anchor.set(this.label.anchor.x, this.label.anchor.y)
    this.sprite.alpha = this.style.opacity
    this.sprite.tint = this.style.color
  }

  update(label: Text | BitmapText, style: LabelBackgroundStyle) {
    this.dirty = !equals(style.padding, this._style.padding)
    this.bounds = label.getLocalBounds()
    this.anchor = label.anchor.clone()

    if (this.label !== label) {
      this.label = label
    }

    if (this._style !== style) {
      this._style = style
      this.color = style.color
      this.opacity = style.opacity ?? STYLE_DEFAULTS.OPACITY
    }

    if (this.dirty) {
      this.dirty = false
      this.resize()
    }

    return this
  }

  moveTo(x: number, y: number) {
    if (this.x !== x) {
      this.x = x
      this.sprite.x = x
    }

    if (this.y !== y) {
      this.y = y
      this.sprite.y = y
    }
  }

  mount() {
    if (!this.mounted) {
      this.container.addChild(this.sprite)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.sprite)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.sprite.destroy()

    return undefined
  }

  private resize() {
    const { height, width } = this.size
    if (height !== this.sprite.height) {
      this.sprite.height = height
    }
    if (width !== this.sprite.width) {
      this.sprite.width = width
    }
    return this
  }

  private get style() {
    return utils.mergeBackgroundDefaults(this._style)
  }

  private get size() {
    const [top, right, bottom, left] = utils.getBackgroundPadding(this._style.padding)
    const height = this.rect.height + top + bottom
    const width = this.rect.width + right + left
    return { width, height }
  }

  private set anchor(anchor: Point) {
    if (!this.sprite.anchor.equals(anchor)) {
      this.sprite.anchor.copyFrom(anchor)
    }
  }

  private set color(color: ColorSource) {
    if (this.sprite.tint !== color) {
      this.sprite.tint = color
    }
  }

  private set opacity(opacity: number) {
    if (this.sprite.alpha !== opacity) {
      this.sprite.alpha = opacity
    }
  }

  private set bounds(bounds: Rectangle) {
    if (this.rect.width !== bounds.width || this.rect.height !== bounds.height) {
      this.rect = bounds
      this.dirty = true
    }
  }
}
