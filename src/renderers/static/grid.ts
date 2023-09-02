import { BitmapText, Container, Graphics, IBitmapTextStyle } from 'pixi.js-legacy'
import { StaticRenderer } from '.'


export class Grid {
  static TEXT_STYLE: Partial<IBitmapTextStyle> = { fontName: 'Label', fontSize: 10, align: 'center' }

  renderer: StaticRenderer
  container = new Container()


  constructor (renderer: StaticRenderer, width: number, height: number, interval: number, options?: { hideText?: boolean }) {
    this.renderer = renderer
    this.renderer.root.addChild(this.container)
    const graticules = new Graphics()
    this.container.addChild(graticules)

    const halfWidth = width / 2
    const halfHeight = height / 2

    for (let x = -halfWidth; x <= halfWidth; x += interval) {
      graticules
        .lineStyle(x === 0 ? 3 : 1, x === 0 ? '#f00' : '#aaa', 1)
        .moveTo(x, -halfHeight)
        .lineTo(x, halfHeight)

      if (!options?.hideText && x !== 0) {
        const coordinate = new BitmapText(x.toString(), Grid.TEXT_STYLE)
        coordinate.x = x
        coordinate.y = 0
        coordinate.anchor.set(0.5, 0.5)
        coordinate.cullable = true
        this.renderer.labelsContainer.addChild(coordinate)
      }
    }

    for (let y = -halfHeight; y <= halfHeight; y += interval) {
      graticules
        .lineStyle(y === 0 ? 3 : 1, y === 0 ? '#f00' : '#aaa', 1)
        .moveTo(-halfWidth, y)
        .lineTo(halfWidth, y)

      if (!options?.hideText && y !== 0) {
        const coordinate = new BitmapText(y.toString(), Grid.TEXT_STYLE)
        coordinate.x = 0
        coordinate.y = y
        coordinate.anchor.set(0.5, 0.5)
        coordinate.cullable = true
        this.renderer.labelsContainer.addChild(coordinate)
      }
    }
  }
}
