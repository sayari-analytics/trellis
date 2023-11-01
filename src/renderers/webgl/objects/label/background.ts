import utils, { RESOLUTION, STYLE_DEFAULTS } from './utils'
import type { BackgroundPadding, LabelBackgroundStyle } from './utils'
import { BitmapText, ColorSource, Container, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { equals } from '../../../..'

export class LabelBackground {
  mounted = false

  private x?: number
  private y?: number
  private dirty = false
  private sprite: Sprite
  private label: Text | BitmapText
  private container: Container
  private style: Required<LabelBackgroundStyle>
  private rect: Rectangle

  constructor(container: Container, label: Text | BitmapText, style: LabelBackgroundStyle) {
    this.label = label
    this.container = container
    this.style = utils.mergeBackgroundDefaults(style)
    this.sprite = Sprite.from(Texture.WHITE, { resolution: RESOLUTION })
    this.sprite.anchor.set(this.label.anchor.x, this.label.anchor.y)
    this.sprite.alpha = this.style.opacity
    this.sprite.tint = this.style.color
    this.rect = label.getLocalBounds()
    this.resize()
  }

  update(label: Text | BitmapText, style: LabelBackgroundStyle) {
    this.label = label
    this.color = style.color
    this.bounds = label.getLocalBounds()
    this.opacity = style.opacity ?? STYLE_DEFAULTS.OPACITY
    this.padding = style.padding ?? STYLE_DEFAULTS.PADDING
    this.sprite.anchor.set(this.label.anchor.x, this.label.anchor.y)

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
    const [vertical, horizontal] = utils.getBackgroundPadding(this.style.padding)

    const height = this.rect.height + vertical
    if (height !== this.sprite.height) {
      this.sprite.height = height
    }

    const width = this.rect.width + horizontal
    if (width !== this.sprite.width) {
      this.sprite.width = width
    }

    return this
  }

  private set color(color: ColorSource) {
    if (color !== this.style.color) {
      this.style.color = color
      this.sprite.tint = color
    }
  }

  private set opacity(opacity: number) {
    if (opacity !== this.style.opacity) {
      this.style.opacity = opacity
      this.sprite.alpha = opacity
    }
  }

  private set padding(padding: BackgroundPadding) {
    if (!equals(padding, this.style.padding)) {
      this.style.padding = padding
      this.dirty = true
    }
  }

  private set bounds(bounds: Rectangle) {
    if (this.rect.width !== bounds.width || this.rect.height !== bounds.height) {
      this.rect = bounds
      this.dirty = true
    }
  }
}
