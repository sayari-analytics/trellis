import { BitmapFont, ITextStyle } from 'pixi.js'
import { GENERIC_FONT_FAMILIES } from '../../../utils/constants'
import { isString } from '../../../utils'
import { FontWeight } from '../../../types'
import Publisher, { Subscription, Subscriber } from '../abstracts/PubSub'
import FontFaceObserver from 'fontfaceobserver'
import TextureCache from '../abstracts/TextureCache'
// import RendererOptions from 'src/webgl/RendererOptions'

export class FontSubscription implements Subscription {
  constructor(
    private _font: FontFamily,
    private _subscriber: Subscriber<string>
  ) {
    this._font = _font
    this._subscriber = _subscriber
  }

  get fontFamily() {
    return this._font.fontFamily
  }

  get ready() {
    return this._font.ready
  }

  unsubscribe() {
    this._font.unsubscribe(this._subscriber)
  }
}

export class FontFamily extends Publisher<string, FontSubscription> {
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

  constructor(
    fontFamily: string,
    fontWeight: FontWeight,
    private _timeout?: number
  ) {
    super()
    this.fontFamily = fontFamily
    this.weight = isString(fontWeight) && !isNaN(+fontWeight) ? +fontWeight : fontWeight
    this.observer = new FontFaceObserver(fontFamily, { weight: this.weight })
    this._timeout = _timeout
    this.load()
  }

  protected async caller(): Promise<string> {
    await this.observer.load(null, this._timeout)
    return this.fontFamily
  }

  protected subscription(subscriber: Subscriber<string>) {
    return new FontSubscription(this, subscriber)
  }
}

export default class FontBook extends TextureCache<FontFamily> {
  chars = BitmapFont.ASCII
  maxFontSize = 16

  available(fontFamily: string, fontWeight: FontWeight) {
    const key = FontFamily.toFontString(fontFamily, fontWeight)
    return this.cache[key]?.ready || FontFamily.isGenericFont(fontFamily) || document.fonts.check(key)
  }

  loadFontFamily(fontFamily: string, fontWeight: FontWeight, subscriber: Subscriber<string>, timeout?: number): FontSubscription {
    const font = FontFamily.toFontString(fontFamily, fontWeight)

    if (this.cache[font] === undefined) {
      this.cache[font] = new FontFamily(fontFamily, fontWeight, timeout)
    }

    return this.cache[font].subscribe(subscriber)
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
