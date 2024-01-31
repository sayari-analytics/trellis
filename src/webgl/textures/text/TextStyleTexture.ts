import { TextStyle as PixiTextStyle, IBitmapTextStyle, LINE_JOIN } from 'pixi.js'
import { Bounds, TextStyle, AnchorPosition, TextAlign, TextHighlightStyle } from '../../../types/api'
import { DEFAULT_TEXT_STYLE } from '../../../utils/constants'
import { equals, isNumber } from '../../../utils'
import FontBook from './FontBook'

interface DefaultTextStyle extends Required<Omit<TextStyle, 'highlight'>> {
  highlight?: TextHighlightStyle
}

PixiTextStyle.defaultStyle = {
  ...PixiTextStyle.defaultStyle,
  lineJoin: LINE_JOIN.ROUND,
  align: DEFAULT_TEXT_STYLE.ALIGN,
  fill: DEFAULT_TEXT_STYLE.COLOR,
  stroke: DEFAULT_TEXT_STYLE.STROKE.color,
  wordWrap: DEFAULT_TEXT_STYLE.WORD_WRAP,
  fontSize: DEFAULT_TEXT_STYLE.FONT_SIZE,
  fontFamily: DEFAULT_TEXT_STYLE.FONT_FAMILY,
  strokeThickness: DEFAULT_TEXT_STYLE.STROKE.width,
  letterSpacing: DEFAULT_TEXT_STYLE.LETTER_SPACING,
  lineHeight: DEFAULT_TEXT_STYLE.LINE_HEIGHT,
  textBaseline: DEFAULT_TEXT_STYLE.BASELINE
}

export default class TextStyleTexture {
  static defaultStyle: DefaultTextStyle = {
    align: DEFAULT_TEXT_STYLE.ALIGN,
    color: DEFAULT_TEXT_STYLE.COLOR,
    anchor: DEFAULT_TEXT_STYLE.ANCHOR,
    margin: DEFAULT_TEXT_STYLE.MARGIN,
    fontName: DEFAULT_TEXT_STYLE.FONT_NAME,
    fontFamily: DEFAULT_TEXT_STYLE.FONT_FAMILY,
    fontWeight: DEFAULT_TEXT_STYLE.FONT_WEIGHT,
    fontSize: DEFAULT_TEXT_STYLE.FONT_SIZE,
    letterSpacing: DEFAULT_TEXT_STYLE.LETTER_SPACING,
    wordWrap: DEFAULT_TEXT_STYLE.WORD_WRAP,
    fontStyle: DEFAULT_TEXT_STYLE.FONT_STYLE,
    stroke: DEFAULT_TEXT_STYLE.STROKE
  }

  fontBook: FontBook
  private _style: DefaultTextStyle = TextStyleTexture.defaultStyle
  private _textStyle: TextStyle | undefined

  constructor(fontBook: FontBook, style: TextStyle | undefined) {
    this.fontBook = fontBook
    this.style = style
  }

  get style(): DefaultTextStyle {
    return this._style
  }

  private set style(style: TextStyle | undefined) {
    this._textStyle = style

    const next = { ...TextStyleTexture.defaultStyle, ...(style ?? {}) }
    this._style = {
      ...next,
      align: style?.align ?? TextStyleTexture.textAlignFromAnchor(next.anchor)
    }
  }

  async update(style: TextStyle | undefined) {
    const prevFamily = this.style.fontFamily
    const prevWeight = this.style.fontWeight

    this.style = style

    if (this.style.fontFamily !== prevFamily || this.style.fontWeight !== prevWeight) {
      await this.loadFont()
    }

    return this
  }

  compare(style: TextStyle | undefined) {
    return equals(this._textStyle, style)
  }

  async loadFont(timeout = 10000) {
    return this.fontBook.load(this.style.fontFamily, this.style.fontWeight, timeout)
  }

  createFont() {
    return this.fontBook.create(this.style.fontName, this.getTextStyle())
  }

  getTextStyle(): PixiTextStyle {
    const { align, color: fill, fontFamily, fontSize, fontWeight, wordWrap, stroke, letterSpacing } = this.style
    return new PixiTextStyle({
      fill,
      align,
      fontSize,
      fontWeight,
      fontFamily,
      letterSpacing,
      stroke: stroke?.color,
      strokeThickness: stroke?.width,
      wordWrap: isNumber(wordWrap),
      wordWrapWidth: isNumber(wordWrap) ? wordWrap : undefined,
      lineHeight: fontSize * 1.3
    })
  }

  getBitmapStyle(): Partial<IBitmapTextStyle> {
    const { fontName, fontSize, align, letterSpacing } = this.style
    return { fontName, fontSize, align, letterSpacing }
  }

  anchorPoint(): [x: number, y: number] {
    switch (this.style.anchor) {
      case 'bottom':
        return [0.5, 0]
      case 'left':
        return [1, 0.5]
      case 'top':
        return [0.5, 1]
      case 'right':
        return [0, 0.5]
    }
  }

  textCoordinates(x: number, y: number, offset: number, isBitmapText: boolean) {
    const shift = this.style.margin + offset
    const text = { x, y }
    const highlight = { x, y }

    let top = 0
    let right = 0
    let bottom = 0
    let left = 0
    if (this.style.highlight !== undefined) {
      const [t, r, b, l] = TextStyleTexture.highlightPadding(this.style.highlight.padding)
      top += t
      right += r
      bottom += b
      left += l
    }

    if (isBitmapText) {
      text.y -= this.style.anchor === 'bottom' ? 1 : 2
    }

    switch (this.style.anchor) {
      case 'bottom':
        text.y += shift + top
        highlight.y += shift
        break
      case 'left':
        text.x -= shift + right
        highlight.x -= shift
        break
      case 'top':
        text.y -= shift + bottom
        highlight.y -= shift
        break
      case 'right':
        text.x += shift + left
        highlight.x += shift
        break
    }

    return { text, highlight }
  }

  static isASCII(str: string) {
    for (const char of str) {
      if (char.codePointAt(0)! > 126) {
        return false
      }
    }

    return true
  }

  static textAlignFromAnchor(anchor: AnchorPosition): TextAlign {
    return anchor === 'left' || anchor === 'right' ? anchor : 'center'
  }

  static highlightPadding(
    padding: number | number[] = DEFAULT_TEXT_STYLE.PADDING
  ): [top: number, right: number, bottom: number, left: number] {
    const [top, right = top, bottom = top, left = right]: number[] = isNumber(padding) ? [padding] : padding
    return [top, right, bottom, left]
  }

  static textBounds(x: number, y: number, width: number, height: number, anchorX: number, anchorY: number): Bounds {
    return {
      right: anchorX === 0 ? x + width : anchorX === 0.5 ? x + width / 2 : x,
      left: anchorX === 0 ? x : anchorX === 0.5 ? x - width / 2 : x - width,
      bottom: anchorY === 0 ? y + height : anchorY === 0.5 ? y + height / 2 : y,
      top: anchorY === 0 ? y : anchorY === 0.5 ? y - height / 2 : y - height
    }
  }
}
