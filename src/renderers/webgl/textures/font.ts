import { BitmapFont, TextStyle } from 'pixi.js'
import { MIN_ZOOM } from '../utils'
import FontFaceObserver from 'fontfaceobserver'
import { throttle } from '../../../utils'

const warn = throttle((err) => console.warn(err), 0)

const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'emoji',
  'math',
  'fangsong',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace'
])

export class FontBook {
  static defaultResolution = 2
  static defaultMaxFontSize = 10
  static defaultScaleFactor = MIN_ZOOM
  static defaultChars = BitmapFont.ASCII

  resolution: number
  maxFontSize: number
  scaleFactor: number
  chars: string | (string | string[])[]

  private cache: { [family: string]: boolean } = {}

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

  available(fontFamily: string) {
    return this.cache[fontFamily] === true
  }

  async load(fontFamily: string | undefined, fontWeight: string | number | undefined = 'normal', timeout?: number) {
    if (fontFamily === undefined || GENERIC_FONT_FAMILIES.has(fontFamily)) {
      return true
    }

    if (!this.available(fontFamily)) {
      const weight = typeof fontWeight === 'string' && !isNaN(+fontWeight) ? +fontWeight : fontWeight
      const font = new FontFaceObserver(fontFamily, { weight })
      try {
        await font.load(null, timeout)
        this.cache[fontFamily] = true
      } catch (error) {
        warn(error)
        return false
      }
    }

    return true
  }

  create(fontName: string, style: TextStyle) {
    const font = FontBook.find(fontName)

    if (font === undefined) {
      style.fontSize = this.maxFontSize * this.resolution * this.scaleFactor
      return BitmapFont.from(fontName, style, { chars: this.chars, resolution: this.resolution })
    }

    return font
  }

  delete(fontName?: string) {
    if (fontName === undefined) {
      this.cache = {}
    } else {
      FontBook.find(fontName)?.destroy()
    }
  }
}
