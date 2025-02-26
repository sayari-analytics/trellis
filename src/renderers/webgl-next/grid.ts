import { BitmapText, Container, Graphics, TextOptions } from 'pixi.js'
import { Renderer } from '.'

export class Grid {
  scaleFactor: number
  renderer: Renderer
  container = new Container()

  constructor(renderer: Renderer, width: number, height: number, interval: number, options?: { text?: boolean }) {
    this.renderer = renderer
    this.scaleFactor = this.renderer.components.viewport.maxZoom
    this.renderer.containers.root.addChildAt(this.container, 0)
    const graticules = new Graphics()
    this.container.addChild(graticules)

    const halfWidth = width / 2
    const halfHeight = height / 2
    const textStyle: TextOptions = {
      style: {
        fontFamily: 'monospace',
        fontSize: 10 * this.scaleFactor,
        align: 'center',
        fill: '#000',
        stroke: { color: '#fff', width: 2 }
      }
    }

    for (let x = -halfWidth; x <= halfWidth; x += interval) {
      graticules
        .moveTo(x, -halfHeight)
        .lineTo(x, halfHeight)
        .stroke(
          x === 0 ? { width: 3, color: '#f00' } : x % (interval * 10) === 0 ? { width: 2, color: '#666' } : { width: 1, color: '#aaa' }
        )

      if (options?.text && x !== 0) {
        const coordinate = new BitmapText(textStyle)
        coordinate.text = x
        coordinate.x = x
        coordinate.y = 0
        coordinate.anchor.set(0.5, 0.5)
        coordinate.scale = 1 / this.scaleFactor
        coordinate.cullable = true
        this.renderer.containers.labels.addChild(coordinate)
      }
    }

    for (let y = -halfHeight; y <= halfHeight; y += interval) {
      graticules
        .moveTo(-halfWidth, y)
        .lineTo(halfWidth, y)
        .stroke(
          y === 0 ? { width: 3, color: '#f00' } : y % (interval * 10) === 0 ? { width: 2, color: '#666' } : { width: 1, color: '#aaa' }
        )

      if (options?.text && y !== 0) {
        const coordinate = new BitmapText(textStyle)
        coordinate.text = y
        coordinate.x = 0
        coordinate.y = y
        coordinate.anchor.set(0.5, 0.5)
        coordinate.scale = 1 / this.scaleFactor
        coordinate.cullable = true
        this.renderer.containers.labels.addChild(coordinate)
      }
    }
  }

  delete() {
    this.container.destroy({ children: true })
  }
}
