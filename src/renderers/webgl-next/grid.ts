import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { InternalRenderer } from '.'


export class Grid {
  renderer: InternalRenderer
  container = new Container()

  private textStyle: Partial<TextStyle> = {
    fontSize: 10,
    lineJoin: 'round',
    fill: '#666',
    stroke: '#fff',
    strokeThickness: 3,
    align: 'center',
  }

  constructor (renderer: InternalRenderer<any, any>, width: number, height: number, interval: number) {
    this.renderer = renderer
    this.renderer.root.addChild(this.container)
    const graticules = new Graphics()
    this.container.addChild(graticules)

    const halfWidth = width / 2
    const halfHeight = height / 2

    for (let x = -halfWidth; x <= halfWidth; x += interval) {
      graticules
        .lineStyle(x === 0 ? 2 : 1, '#ddd', 1)
        .moveTo(x, -halfHeight)
        .lineTo(x, halfHeight)

      const coordinate = new Text(x.toString(), this.textStyle)
      coordinate.x = x
      coordinate.y = 0
      coordinate.anchor.set(0.5, 0.5)
      this.container.addChild(coordinate)
    }

    for (let y = -halfHeight; y <= halfHeight; y += interval) {
      graticules
        .lineStyle(y === 0 ? 2 : 1, '#ddd', 1)
        .moveTo(-halfWidth, y)
        .lineTo(halfWidth, y)

      if (y !== 0) {
        const coordinate = new Text(y.toString(), this.textStyle)
        coordinate.x = 0
        coordinate.y = y
        coordinate.anchor.set(0.5, 0.5)
        this.container.addChild(coordinate)
      }
    }
  }
}
