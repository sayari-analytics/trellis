import type { Bounds, TextHighlightStyle } from '../../../types/api'
import { BitmapText, ColorSource, Container, Sprite, Text, Texture } from 'pixi.js'
import { DEFAULT_TEXT_STYLE, equals } from '../../../utils'
// import utils, { STYLE_DEFAULTS } from '../../../utils/text'
import RenderObject from '../../RenderObject'
import TextStyleTexture from './TextStyleTexture'

export default class TextHighlight extends RenderObject<Sprite> {
  static defaultStyle: Required<TextHighlightStyle> = {
    color: DEFAULT_TEXT_STYLE.COLOR,
    opacity: DEFAULT_TEXT_STYLE.OPACITY,
    padding: DEFAULT_TEXT_STYLE.PADDING
  }

  protected dirty = false
  protected object: Sprite
  protected _text: Text | BitmapText
  protected _width: number
  protected _height: number
  protected _highlightStyle!: TextHighlightStyle
  protected _style!: Required<TextHighlightStyle>
  protected _bounds!: Bounds

  constructor(container: Container, textObject: Text | BitmapText, style: TextHighlightStyle) {
    super(container)
    this.style = style
    this._text = textObject
    this._width = this._text.width
    this._height = this._text.height
    this.object = this.create()
    this._bounds = this.getBounds()
  }

  update(style: TextHighlightStyle) {
    const styleHasChanged = !equals(style, this._highlightStyle)
    this.dirty = !equals(style.padding, this.style.padding)
    this.style = style

    if (styleHasChanged) {
      this.color = this.style.color
      this.opacity = this.style.opacity
    }

    if (this.dirty) {
      this.dirty = false
      this.resize()
      this._bounds = this.getBounds()
    }

    return this
  }

  override moveTo(x: number, y: number) {
    const dirty = this.x !== x || this.y !== y

    super.moveTo(x, y)

    if (dirty) {
      this._bounds = this.getBounds()
    }

    return this
  }

  get text() {
    return this._text
  }

  set text(text: Text | BitmapText) {
    this._text = text
  }

  get bounds() {
    return this._bounds
  }

  get width() {
    return this.object.width
  }

  set anchor([x, y]: [number, number]) {
    if (!this.object.anchor.equals({ x, y })) {
      this.object.anchor.set(x, y)
    }
  }

  get textSize(): [width: number, height: number] {
    return [this._width, this._height]
  }

  set textSize([width, height]: [width: number, height: number]) {
    if (this._width !== width) {
      this._width = width
      this.dirty = true
    }
    if (this._height !== height) {
      this._height = height
      this.dirty = true
    }
  }

  private create() {
    const [width, height] = this.getSize()

    const sprite = Sprite.from(Texture.WHITE)
    sprite.height = height
    sprite.width = width
    sprite.anchor.set(this._text.anchor.x, this._text.anchor.y)
    sprite.alpha = this.style.opacity
    sprite.tint = this.style.color
    return sprite
  }

  private resize() {
    const [width, height] = this.getSize()

    if (height !== this.object.height) {
      this.object.height = height
    }
    if (width !== this.object.width) {
      this.object.width = width
    }

    return [width, height]
  }

  private getBounds() {
    return TextStyleTexture.textBounds(this.x, this.y, this.object.width, this.object.height, this.object.anchor.x, this.object.anchor.y)
  }

  private getSize() {
    const [top, right, bottom, left] = TextStyleTexture.highlightPadding(this.style.padding)
    return [this._width + right + left, this._height + top + bottom]
  }

  private set style(style: TextHighlightStyle) {
    this._highlightStyle = style
    this._style = {
      ...TextHighlight.defaultStyle,
      ...style
    }
  }

  private get style(): Required<TextHighlightStyle> {
    return this._style
  }

  private set color(color: ColorSource) {
    if (this.object.tint !== color) {
      this.object.tint = color
    }
  }

  private set opacity(opacity: number) {
    if (this.object.alpha !== opacity) {
      this.object.alpha = opacity
    }
  }
}
