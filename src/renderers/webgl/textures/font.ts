import { BitmapFont, ITextStyle, TextStyle } from 'pixi.js'
import { MIN_ZOOM } from '../utils'

export class FontBook {
  static defaultResolution = 2
  static defaultMaxFontSize = 10
  static defaultScaleFactor = MIN_ZOOM
  static defaultChars = BitmapFont.ASCII

  resolution: number
  maxFontSize: number
  scaleFactor: number
  chars: string | (string | string[])[]

  constructor(
    resolution = FontBook.defaultResolution,
    maxFontSize = FontBook.defaultMaxFontSize,
    scaleFactor = FontBook.defaultScaleFactor,
    chars = FontBook.defaultChars
  ) {
    this.resolution = resolution
    this.maxFontSize = maxFontSize
    this.scaleFactor = scaleFactor
    this.chars = chars
  }

  static find(fontName: string): BitmapFont | undefined {
    return BitmapFont.available[fontName]
  }

  create(fontName: string, style: Partial<ITextStyle> | TextStyle) {
    const font = FontBook.find(fontName)

    if (font === undefined) {
      const fontSize = this.maxFontSize * this.resolution * this.scaleFactor
      style.fontSize = fontSize
      style.lineHeight = fontSize * 1.3
      return BitmapFont.from(fontName, style, { chars: this.chars, resolution: this.resolution })
    }

    return font
  }

  delete(fontName: string) {
    FontBook.find(fontName)?.destroy()
  }
}
