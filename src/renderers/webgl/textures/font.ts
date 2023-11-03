import { BitmapFont, TextStyle } from 'pixi.js'
import { MIN_ZOOM } from '../utils'

export class FontBook {
  static resolution = 2
  static maxFontSize = 10
  static scaleFactor = MIN_ZOOM

  static find(fontName: string): BitmapFont | undefined {
    return BitmapFont.available[fontName]
  }

  static available(fontName: string) {
    return FontBook.find(fontName) !== undefined
  }

  static create(fontName: string, style: TextStyle, maxFontSize = FontBook.maxFontSize, scaleFactor = FontBook.scaleFactor) {
    style.fontSize = maxFontSize * FontBook.resolution * scaleFactor

    return BitmapFont.from(fontName, style, {
      chars: BitmapFont.ASCII,
      resolution: FontBook.resolution
    })
  }

  static load(fontName: string, style: TextStyle, maxFontSize = FontBook.maxFontSize, scaleFactor = FontBook.scaleFactor) {
    if (!FontBook.available(fontName)) {
      FontBook.create(fontName, style, maxFontSize, scaleFactor)
    } else {
      return FontBook.find(fontName)
    }
  }

  static delete(fontName: string) {
    FontBook.find(fontName)?.destroy()
  }
}
