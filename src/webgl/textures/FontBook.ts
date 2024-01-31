import { AssetPublisher, AssetSubscription, Subscriber } from './AssetPublisher'
import { BitmapFont, ITextStyle } from 'pixi.js'
import { isString, throttle } from '../../utils'
import { FontWeight } from '../../types'
import FontFaceObserver from 'fontfaceobserver'
import TextureCache from './TextureCache'
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

export class FontSubscription extends AssetSubscription<true, FontFamily> {
  constructor(font: FontFamily, subscriber: Subscriber<true>) {
    super(font, subscriber)
  }

  get fontFamily() {
    return this._publisher.fontFamily
  }
}

export class FontFamily extends AssetPublisher<true> {
  observer: FontFaceObserver
  fontFamily: string
  weight: string | number

  static sanitize(fontFamily: string) {
    return fontFamily.split(', ')[0]
  }

  static isGenericFont(fontFamily: string) {
    return GENERIC_FONT_FAMILIES.has(FontFamily.sanitize(fontFamily))
  }

  static toFontString(fontFamily: string, weight: string | number) {
    return `${weight} 1em ${FontFamily.sanitize(fontFamily)}`
  }

  constructor(fontFamily: string, fontWeight: FontWeight, timeout?: number) {
    super()
    this.fontFamily = fontFamily
    this.weight = isString(fontWeight) && !isNaN(+fontWeight) ? +fontWeight : fontWeight

    this.observer = new FontFaceObserver(fontFamily, { weight: this.weight })
    this.load(timeout)
  }

  subscribe(fn: Subscriber<true>) {
    if (this.ready) {
      fn(true)
    } else {
      this.subscribers.add(fn)
    }

    return new FontSubscription(this, fn)
  }

  protected async load(timeout?: number) {
    try {
      await this.observer.load(null, timeout)
      this.asset = true
      this.notify(true)
    } catch (error) {
      warn(error)
      this.notify(false)
    }
  }
}

export default class FontBook extends TextureCache<FontFamily> {
  chars = BitmapFont.ASCII
  maxFontSize = 16

  available(fontFamily: string, fontWeight: FontWeight) {
    const key = FontFamily.toFontString(fontFamily, fontWeight)
    return this.cache[key]?.ready || FontFamily.isGenericFont(fontFamily) || document.fonts.check(key)
  }

  loadFontFamily(fontFamily: string, fontWeight: FontWeight, onComplete: Subscriber<true>, timeout?: number): FontSubscription {
    const font = FontFamily.toFontString(fontFamily, fontWeight)

    if (this.cache[font] === undefined) {
      this.cache[font] = new FontFamily(fontFamily, fontWeight, timeout)
    }

    return this.cache[font].subscribe(onComplete)
  }

  findBitmapFont(fontName: string): BitmapFont | undefined {
    return BitmapFont.available[fontName]
  }

  createBitmapFont(fontName: string, style: Partial<ITextStyle>) {
    const font = this.findBitmapFont(fontName)

    if (font === undefined) {
      const fontSize = this.maxFontSize * this.resolution * this.scaleFactor
      style.fontSize = fontSize
      style.lineHeight = fontSize * 1.3
      return BitmapFont.from(fontName, style, { chars: this.chars, resolution: this.resolution })
    }

    return font
  }

  destroyBitmapFont(fontName: string) {
    this.findBitmapFont(fontName)?.destroy()
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
