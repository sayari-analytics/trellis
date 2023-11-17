import utils, { STYLE_DEFAULTS } from './utils'
import type { LabelBackgroundStyle, LabelBounds } from './utils'
import { BitmapText, ColorSource, Container, Sprite, Text, Texture } from 'pixi.js'
import { equals } from '../../../..'

export class LabelBackground {
  mounted = false

  private x?: number
  private y?: number
  private dirty = false
  private sprite: Sprite
  private container: Container
  private label: Text | BitmapText
  private labelWidth: number
  private labelHeight: number
  private assignedStyle!: LabelBackgroundStyle
  private activeStyle!: Required<LabelBackgroundStyle>
  private backgroundBounds!: LabelBounds

  constructor(container: Container, label: Text | BitmapText, style: LabelBackgroundStyle) {
    this.label = label
    this.style = style
    this.container = container
    this.labelWidth = this.label.width
    this.labelHeight = this.label.height
    this.sprite = this.create()
    this.setBounds()
  }

  update(size: [width: number, height: number], anchor: [number, number], style: LabelBackgroundStyle) {
    this.dirty = !equals(style.padding, this.style.padding)
    this.size = size
    this.anchor = anchor

    if (!equals(style, this.assignedStyle)) {
      this.style = style
      this.color = style.color
      this.opacity = style.opacity ?? STYLE_DEFAULTS.OPACITY
    }

    if (this.dirty) {
      this.dirty = false
      this.resize()
      this.setBounds()
    }

    return this
  }

  moveTo(x: number, y: number) {
    let dirty = false

    if (this.x !== x) {
      this.x = x
      this.sprite.x = x
      dirty = true
    }

    if (this.y !== y) {
      this.y = y
      this.sprite.y = y
      dirty = true
    }

    if (dirty) {
      this.setBounds()
    }

    return this
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

  get text() {
    return this.label
  }

  set text(text: Text | BitmapText) {
    this.label = text
  }

  get bounds() {
    return this.backgroundBounds
  }

  private create() {
    const [width, height] = this.size

    const sprite = Sprite.from(Texture.WHITE)
    sprite.height = height
    sprite.width = width
    sprite.anchor.set(this.label.anchor.x, this.label.anchor.y)
    sprite.alpha = this.style.opacity
    sprite.tint = this.style.color
    return sprite
  }

  private resize() {
    const [width, height] = this.size

    if (height !== this.sprite.height) {
      this.sprite.height = height
    }
    if (width !== this.sprite.width) {
      this.sprite.width = width
    }

    return [width, height]
  }

  private setBounds() {
    this.backgroundBounds = utils.getLabelBounds(
      this.x ?? 0,
      this.y ?? 0,
      this.sprite.width,
      this.sprite.height,
      this.sprite.anchor.x,
      this.sprite.anchor.y
    )

    return this.backgroundBounds
  }

  private set style(style: LabelBackgroundStyle) {
    this.assignedStyle = style
    this.activeStyle = utils.mergeBackgroundDefaults(style)
  }

  private get style(): Required<LabelBackgroundStyle> {
    return this.activeStyle
  }

  private get size(): [width: number, height: number] {
    const [top, right, bottom, left] = utils.getBackgroundPadding(this.style.padding)
    return [this.labelWidth + right + left, this.labelHeight + top + bottom]
  }

  private set size([width, height]: [width: number, height: number]) {
    if (this.labelWidth !== width) {
      this.labelWidth = width
      this.dirty = true
    }
    if (this.labelHeight !== height) {
      this.labelHeight = height
      this.dirty = true
    }
  }

  private set anchor([x, y]: [number, number]) {
    if (!this.sprite.anchor.equals({ x, y })) {
      this.sprite.anchor.set(x, y)
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
}
