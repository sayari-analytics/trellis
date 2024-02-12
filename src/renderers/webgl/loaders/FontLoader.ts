import { DEFAULT_TEXT_STYLE, GENERIC_FONT_FAMILIES } from '../../../utils/constants'
import { Subscriber, Publisher } from './PubSub'
import { noop } from '../../../utils'
import FontFaceObserver from 'fontfaceobserver'

type LoadFontProps = Partial<Subscriber<true>> & {
  fontFamily: string
  fontWeight?: string | number
  timeout?: number
}

export default class FontLoader {
  private cache: { [key: string]: Publisher<true> } = {}

  static sanitize(fontFamily: string) {
    return fontFamily.split(', ')[0]
  }

  static isGenericFont(fontFamily: string) {
    return GENERIC_FONT_FAMILIES.has(FontLoader.sanitize(fontFamily))
  }

  static toFontString(fontFamily: string, weight: string | number) {
    return `${weight} 1em ${FontLoader.sanitize(fontFamily)}`
  }

  static available(fontFamily: string, fontWeight: string | number = DEFAULT_TEXT_STYLE.fontWeight) {
    return FontLoader.isGenericFont(fontFamily) || document.fonts.check(FontLoader.toFontString(fontFamily, fontWeight))
  }

  load({ fontFamily, fontWeight = DEFAULT_TEXT_STYLE.fontWeight, timeout = 10000, resolve = noop, reject = noop }: LoadFontProps) {
    const font = FontLoader.toFontString(fontFamily, fontWeight)

    if (this.cache[font] === undefined) {
      this.cache[font] = this.createPublisher(fontFamily, fontWeight, timeout)
    }

    return this.cache[font].subscribe({ resolve, reject })
  }

  cancel() {
    for (const font in this.cache) {
      this.cache[font].cancel()
    }

    this.cache = {}
    return undefined
  }

  get loading() {
    for (const font in this.cache) {
      if (this.cache[font].loading) {
        return true
      }
    }

    return false
  }

  private createPublisher(fontFamily: string, fontWeight: string | number, timeout: number) {
    return new Publisher<true>(
      async function loadBrowserFont(): Promise<true> {
        try {
          const weight = typeof fontWeight === 'string' && !isNaN(+fontWeight) ? +fontWeight : fontWeight
          const font = new FontFaceObserver(fontFamily, { weight })
          await font.load(null, timeout)
          return true
        } catch (e) {
          console.warn(e)
          throw new Error(`Error loading font: ${FontLoader.toFontString(fontFamily, fontWeight)}`)
        }
      },
      function checkBrowserFonts(): true | null {
        return FontLoader.available(fontFamily, fontWeight) ? true : null
      }
    )
  }
}
