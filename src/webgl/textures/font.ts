import { BitmapFont, TextStyle } from 'pixi.js'
import { MIN_ZOOM, throttle } from './../../utils'
import FontFaceObserver from 'fontfaceobserver'

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
  private loading: { [family: string]: Promise<void> } = {}

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

  available(fontFamily: string | undefined, fontWeight: string | number | undefined = 'normal') {
    const family = fontFamily?.split(', ')[0]
    return (
      family === undefined ||
      this.cache[family] === true ||
      GENERIC_FONT_FAMILIES.has(family) ||
      document.fonts.check(`${fontWeight} 1em ${family}`)
    )
  }

  async load(fontFamily: string | undefined, fontWeight: string | number | undefined = 'normal', timeout?: number) {
    if (fontFamily === undefined || this.available(fontFamily, fontWeight)) {
      return true
    }

    const family = fontFamily.split(', ')[0]

    try {
      if (!this.loading[family]) {
        const weight = typeof fontWeight === 'string' && !isNaN(+fontWeight) ? +fontWeight : fontWeight
        const font = new FontFaceObserver(family, { weight })
        this.loading[family] = font.load(null, timeout)
      }

      await this.loading[family]
      this.cache[family] = true
    } catch (error) {
      warn(error)
      return false
    }

    return this.cache[family]
  }

  create(fontName: string, style: TextStyle) {
    const font = FontBook.find(fontName)

    if (font === undefined) {
      const fontSize = this.maxFontSize * this.resolution * this.scaleFactor
      style.fontSize = fontSize
      style.lineHeight = fontSize * 1.3
      return BitmapFont.from(fontName, style, { chars: this.chars, resolution: this.resolution })
    }

    return font
  }

  delete(fontName?: string) {
    if (fontName === undefined) {
      this.cache = {}
      this.loading = {}
    } else {
      FontBook.find(fontName)?.destroy()
    }
  }
}
