import { TextStyle as PixiTextStyle, ITextStyle as IPixiTextStyle, BitmapFont, IBitmapTextStyle, LINE_JOIN } from 'pixi.js'
import { DEFAULT_HIGHLIGHT_STYLE, DEFAULT_TEXT_STYLE, MIN_TEXTURE_ZOOM, DEFAULT_RESOLUTION } from '../../../../utils/constants'
import type { TextStyle, TextHighlightStyle, TextAlign, Stroke, FontWeight } from '../../../../types/api'
import { isNumber } from '../../../../utils'
import { equals } from '../../../../utils/api'

export type DefaultTextStyle = Required<Omit<TextStyle, 'highlight'>> & {
  highlight?: TextHighlightStyle
}

PixiTextStyle.defaultStyle.lineJoin = LINE_JOIN.ROUND
PixiTextStyle.defaultStyle.textBaseline = 'alphabetic'

export default class TextTexture {
  static defaultTextStyle: DefaultTextStyle = DEFAULT_TEXT_STYLE
  static defaultHighlightStyle: Required<TextHighlightStyle> = DEFAULT_HIGHLIGHT_STYLE

  color: string = TextTexture.defaultTextStyle.color
  stroke: Stroke = TextTexture.defaultTextStyle.stroke
  fontName: string = TextTexture.defaultTextStyle.fontName
  fontSize: number = TextTexture.defaultTextStyle.fontSize
  fontFamily: string = TextTexture.defaultTextStyle.fontFamily
  fontWeight: FontWeight = TextTexture.defaultTextStyle.fontWeight
  letterSpacing: number = TextTexture.defaultTextStyle.letterSpacing
  wordWrap: number | false = TextTexture.defaultTextStyle.wordWrap
  align: TextAlign = TextTexture.defaultTextStyle.align
  highlight?: Required<TextHighlightStyle>

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

  constructor(style: TextStyle | undefined) {
    this.update(style)
  }

  compare(style: TextStyle | undefined) {
    return equals(this._style, style)
  }

  update(style: TextStyle | undefined) {
    this._style = style
    this._fontLoading = false

    Object.assign(this, TextTexture.defaultTextStyle, style)
    this.highlight = style?.highlight !== undefined ? { ...TextTexture.defaultHighlightStyle, ...style.highlight } : undefined

    return this
  }

  get original(): TextStyle | undefined {
    return this._style
  }

  get lineHeight(): number {
    return this.fontSize * 1.3
  }

  get wordWrapWidth(): number | undefined {
    return isNumber(this.wordWrap) ? this.wordWrap : undefined
  }

  get fontLoading() {
    return this._fontLoading
  }

  set fontLoading(loading: boolean) {
    this._fontLoading = loading

    if (loading) {
      this.fontFamily = TextTexture.defaultTextStyle.fontFamily
    } else {
      this.fontFamily = this._style?.fontFamily ?? TextTexture.defaultTextStyle.fontFamily
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

  getHighlightPadding(): [top: number, right: number, bottom: number, left: number] {
    const padding = this.highlight?.padding ?? 0

    const [top, right, bottom, left]: number[] = isNumber(padding) ? [padding] : padding

    return [top, right ?? top, bottom ?? top, left ?? right]
  }

  createBitmapFont() {
    const font = BitmapFont.available[this.fontName]

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

  destroyBitmapFont(fontName: string) {
    BitmapFont.available[fontName]?.destroy()
  }
}
