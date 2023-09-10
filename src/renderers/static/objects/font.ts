import { BitmapFont } from 'pixi.js-legacy'


export class Font {
  
  private font: BitmapFont

  constructor(fontFamily = 'sans-serif', maxFontSize = 10, minZoom = 5, strokeThickness = 1.5) {
    this.font = BitmapFont.from('Label', {
      fontFamily,
      fontSize: maxFontSize * 2 * minZoom, // max font size * retina * minZoom
      fill: 0x000000,
      stroke: 0xffffff,
      strokeThickness: strokeThickness * 2 * minZoom, // strokeThickness * retina * minZoom
    }, { chars: BitmapFont.ASCII })
  }

  delete() {
    this.font.destroy()
  }
}
