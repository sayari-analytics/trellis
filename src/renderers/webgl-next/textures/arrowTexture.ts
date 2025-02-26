import { Application, Graphics, Matrix, RenderTexture, Texture } from 'pixi.js'
import { ITexture } from '.'

export class ArrowTexture implements ITexture {
  scaleFactor: number
  width: number
  height: number

  private texture: Texture

  constructor(app: Application, width: number, height: number, maxZoom: number, resolution: number) {
    this.scaleFactor = maxZoom
    this.width = width
    this.height = height

    const graphic = new Graphics()
      .poly([
        { x: 0, y: 0 },
        { x: this.width * this.scaleFactor, y: 0 },
        { x: (this.width / 2) * this.scaleFactor, y: this.height * this.scaleFactor }
      ])
      .fill(0xffffff)

    this.texture = RenderTexture.create({
      width: graphic.width,
      height: graphic.height,
      resolution
    })

    app.renderer.render({
      container: graphic,
      target: this.texture,
      transform: new Matrix(1, 0, 0, 1, 0, 0)
    })

    graphic.destroy()
  }

  getTexture() {
    return this.texture
  }

  delete() {
    this.texture.destroy()
  }
}
