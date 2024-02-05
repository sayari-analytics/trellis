import { Subscriber, Publisher } from './PubSub'
import { warn } from 'console'
import { noop } from '../../../utils'

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

  static available(fontFamily: string, fontWeight: string | number) {
    return FontLoader.isGenericFont(fontFamily) || document.fonts.check(FontLoader.toFontString(fontFamily, fontWeight))
  }

  load({
    fontFamily,
    fontWeight = 'normal',
    timeout = 5000,
    resolve = noop,
    reject = noop
  }: Partial<Subscriber<true>> & { fontFamily: string; fontWeight?: string | number; timeout?: number }) {
    const font = FontLoader.toFontString(fontFamily, fontWeight)

    if (this.cache[font] === undefined) {
      this.cache[font] = this.createPublisher(fontFamily, fontWeight, timeout)
    }

    return this.cache[font].subscribe({ resolve, reject })
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
          warn(e)
          throw new Error(`Error loading font: ${FontLoader.toFontString(fontFamily, fontWeight)}`)
        }
      },
      function checkBrowserFonts(): true | null {
        return FontLoader.available(fontFamily, fontWeight) ? true : null
      }
    )
  }
}
