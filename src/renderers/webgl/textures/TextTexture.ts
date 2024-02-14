import type { TextStyle, TextHighlightStyle, TextAlign, Stroke, FontWeight, AnchorPosition } from '../../../types/api'
import { TextStyle as PixiTextStyle, ITextStyle as IPixiTextStyle, BitmapFont, IBitmapTextStyle, LINE_JOIN } from 'pixi.js'
import { DEFAULT_HIGHLIGHT_STYLE, DEFAULT_TEXT_STYLE, MIN_TEXTURE_ZOOM, DEFAULT_RESOLUTION } from '../../../utils/constants'
import { isNumber } from '../../../utils/helpers'
import { equals } from '../../../utils/api'
import { PointTuple } from '../../../types'

export type TextTextureOptions = {
  defaultTextStyle?: Omit<TextStyle, 'highlight'>
  defaultHighlightStyle?: Partial<TextHighlightStyle>
}

export type DefaultTextStyle = Required<Omit<TextStyle, 'highlight'>>

PixiTextStyle.defaultStyle.lineJoin = LINE_JOIN.ROUND
PixiTextStyle.defaultStyle.textBaseline = 'alphabetic'

export default class TextTexture {
  private defaultTextStyle: DefaultTextStyle = DEFAULT_TEXT_STYLE
  private defaultHighlightStyle: Required<TextHighlightStyle> = DEFAULT_HIGHLIGHT_STYLE

  color: string
  stroke: Stroke
  fontName: string
  fontSize: number
  fontFamily: string
  fontWeight: FontWeight
  letterSpacing: number
  margin: number
  align: TextAlign
  position: AnchorPosition
  highlight?: Required<TextHighlightStyle>

  private _wordWrap: number | false = DEFAULT_TEXT_STYLE.wordWrap

  // TODO -> make configurable
  maxFontSize = 16
  resolution = DEFAULT_RESOLUTION
  scaleFactor = MIN_TEXTURE_ZOOM
  chars = BitmapFont.ASCII

  private _style: TextStyle | undefined
  private _fontLoading = false

  static isASCII(str: string) {
    for (const char of str) {
      if (char.codePointAt(0)! > 126) {
        return false
      }
    }

    return true
  }

  constructor(style: TextStyle | undefined, options?: TextTextureOptions) {
    this.defaultTextStyle = Object.assign(this.defaultTextStyle, options?.defaultTextStyle)
    this.defaultHighlightStyle = Object.assign(this.defaultHighlightStyle, options?.defaultHighlightStyle)

    this.color = this.defaultTextStyle.color
    this.stroke = this.defaultTextStyle.stroke
    this.fontName = this.defaultTextStyle.fontName
    this.fontSize = this.defaultTextStyle.fontSize
    this.fontFamily = this.defaultTextStyle.fontFamily
    this.fontWeight = this.defaultTextStyle.fontWeight
    this.letterSpacing = this.defaultTextStyle.letterSpacing
    this.margin = this.defaultTextStyle.margin
    this.align = this.defaultTextStyle.align
    this.position = this.defaultTextStyle.position

    this.update(style)
  }

  compare(style: TextStyle | undefined) {
    return equals(this._style, style)
  }

  update(style: TextStyle | undefined) {
    this._style = style
    this._fontLoading = false

    Object.assign(this, this.defaultTextStyle, style)

    if (style?.align === undefined && this.position !== 'center') {
      this.align = this.position === 'left' || this.position === 'right' ? this.position : 'center'
    }

    if (style?.highlight !== undefined) {
      this.highlight = Object.assign(this.defaultHighlightStyle, style.highlight)
    } else {
      this.highlight = undefined
    }

    return this
  }

  get original(): TextStyle | undefined {
    return this._style
  }

  get lineHeight(): number {
    return this.fontSize * 1.3
  }

  set wordWrap(wordWrap: number | false) {
    this._wordWrap = wordWrap
  }

  get wordWrap(): boolean {
    return isNumber(this._wordWrap)
  }

  get wordWrapWidth(): number {
    if (isNumber(this._wordWrap)) {
      return this._wordWrap
    } else {
      return PixiTextStyle.defaultStyle.wordWrapWidth
    }
  }

  get anchor(): PointTuple {
    switch (this.position) {
      case 'bottom':
        return [0.5, 0]
      case 'left':
        return [1, 0.5]
      case 'top':
        return [0.5, 1]
      case 'right':
        return [0, 0.5]
      default:
        return [0, 0]
    }
  }

  get fontLoading() {
    return this._fontLoading
  }

  set fontLoading(loading: boolean) {
    this._fontLoading = loading

    if (loading) {
      this.fontName = `LoadingFont:${this.fontName}`
      this.fontFamily = this.defaultTextStyle.fontFamily
    } else {
      this.fontName = this._style?.fontName ?? this.defaultTextStyle.fontName
      this.fontFamily = this._style?.fontFamily ?? this.defaultTextStyle.fontFamily
    }
  }

  getTextStyle(): Partial<IPixiTextStyle> {
    return {
      fill: this.color,
      align: this.align,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontFamily: this.fontFamily,
      letterSpacing: this.letterSpacing,
      stroke: this.stroke.color,
      strokeThickness: this.stroke.width,
      wordWrap: isNumber(this.wordWrap),
      wordWrapWidth: this.wordWrapWidth,
      lineHeight: this.lineHeight
    }
  }

  getBitmapStyle(): Partial<IBitmapTextStyle> {
    return {
      align: this.align,
      fontName: this.fontName,
      fontSize: this.fontSize,
      letterSpacing: this.letterSpacing
    }
  }

  getHighlightPadding(): [py: number, px: number] {
    const padding = this.highlight?.padding ?? 0
    return isNumber(padding) ? [padding, padding] : padding
  }

  findFont(fontName = this.fontName): BitmapFont | undefined {
    return BitmapFont.available[fontName]
  }

  createFont() {
    const font = this.findFont()

    if (font === undefined) {
      const fontSize = this.maxFontSize * this.resolution * this.scaleFactor

      return BitmapFont.from(
        this.fontName,
        { ...this.getTextStyle(), fontSize, lineHeight: fontSize * 1.3 },
        { chars: this.chars, resolution: this.resolution }
      )
    }

    return font
  }

  destroyFont(fontName: string) {
    this.findFont(fontName)?.destroy()
  }
}
