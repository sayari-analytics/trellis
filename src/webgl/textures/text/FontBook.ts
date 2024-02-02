import { BitmapFont, ITextStyle } from 'pixi.js'
import { FontWeight } from '../../../types'
import { throttle } from '../../../utils'
import FontFaceObserver from 'fontfaceobserver'
// import RendererOptions from 'src/webgl/RendererOptions'

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

export default class FontBook {
  chars = BitmapFont.ASCII
  maxFontSize = 16

  private cache: { [family: string]: boolean } = {}
  private observers: { [family: string]: FontFaceObserver } = {}

  static find(fontName: string): BitmapFont | undefined {
    return BitmapFont.available[fontName]
  }

  // constructor(private options: RendererOptions) {
  //   this.options = options
  // }

  available(fontFamily: string, fontWeight: FontWeight) {
    const family = fontFamily.split(', ')[0]
    return (
      family === undefined ||
      this.cache[family] === true ||
      GENERIC_FONT_FAMILIES.has(family) ||
      document.fonts.check(`${fontWeight} 1em ${family}`)
    )
  }

  async loadFontFamily(fontFamily: string, fontWeight: FontWeight, timeout?: number) {
    if (fontFamily === undefined || this.available(fontFamily, fontWeight)) {
      return true
    }

    const family = fontFamily.split(', ')[0]

    try {
      if (!this.observers[family]) {
        const weight = typeof fontWeight === 'string' && !isNaN(+fontWeight) ? +fontWeight : fontWeight
        this.observers[family] = new FontFaceObserver(family, { weight })
      }

      await this.observers[family].load(null, timeout)
      this.cache[family] = true
    } catch (error) {
      warn(error)
      return false
    }

    return this.cache[family]
  }

  createBitmapFont(fontName: string, style: Partial<ITextStyle>) {
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
      this.observers = {}
    } else {
      FontBook.find(fontName)?.destroy()
    }
  }

  get resolution() {
    return 2
    // return this.options.resolution
  }
  get scaleFactor() {
    return 3
    // return this.options.minTextureZoom
  }
}
