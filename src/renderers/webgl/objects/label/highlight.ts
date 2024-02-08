import { BitmapText, ColorSource, Container, Sprite, Text, Texture } from 'pixi.js'
import type { TextHighlightStyle } from '../../../../types'
import utils, { DEFAULT_LABEL_BG_STYLE } from './utils'

export class LabelHighlight {
  mounted = false

  private x?: number
  private y?: number
  private sprite: Sprite

  private _width: number
  private _height: number
  private _style: Required<TextHighlightStyle> = DEFAULT_LABEL_BG_STYLE

  constructor(
    private container: Container,
    private label: Text | BitmapText,
    style: TextHighlightStyle
  ) {
    this.label = label
    this.container = container
    this._width = this.label.width
    this._height = this.label.height
    this.style = style
    this.sprite = this.create()
  }

  update(style: TextHighlightStyle) {
    this.style = style
    this.color = this.style.color
    this.opacity = this.style.opacity

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

    return this
  }

  resize(_width: number, _height: number) {
    let dirty = false

    if (this._width !== _width) {
      this._width = _width
      dirty = true
    }

    if (this._height !== _height) {
      this._height = _height
      dirty = true
    }

    if (dirty) {
      const [width, height] = this.getSize()
      this.sprite.width = width
      this.sprite.height = height
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

  set rotation(rotation: number) {
    this.sprite.rotation = rotation
  }

  get anchor() {
    return this.sprite.anchor
  }

  get padding() {
    return this.style.padding
  }

  private set style(style: TextHighlightStyle) {
    this._style = { ...DEFAULT_LABEL_BG_STYLE, ...style }
  }

  private get style(): Required<TextHighlightStyle> {
    return this._style
  }

  private getSize(): [width: number, height: number] {
    const [pt, pr, pb, pl] = utils.getBackgroundPadding(this.style.padding)
    return [this._width + pr + pl, this._height + pt + pb]
  }

  private create() {
    const [width, height] = this.getSize()

    const sprite = Sprite.from(Texture.WHITE)
    sprite.height = height
    sprite.width = width
    sprite.anchor.set(this.label.anchor.x, this.label.anchor.y)
    sprite.alpha = this.style.opacity
    sprite.tint = this.style.color
    return sprite
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
