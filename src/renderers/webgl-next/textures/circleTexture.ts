import { Application, Graphics, Matrix, RenderTexture, Texture } from 'pixi.js'
import { ITexture } from '.'

/**
 * [Rendering Fast Graphics with PixiJS - Matt Karl](https://medium.com/@bigtimebuddy/rendering-fast-graphics-with-pixijs-6f547895c08c)
 */
export class CircleTexture implements ITexture {
  scaleFactor: number

  private texture: Texture

  constructor(app: Application, maxRadius: number, maxZoom: number, resolution: number) {
    this.scaleFactor = maxRadius * maxZoom

    const graphic = new Graphics().circle(0, 0, this.scaleFactor).fill(0xffffff)

    this.texture = RenderTexture.create({
      width: graphic.width,
      height: graphic.height,
      // autoGenerateMipmaps: true,
      resolution
      // scaleMode: 'linear'
      // multisample: MSAA_QUALITY.HIGH,
    })

    app.renderer.render({
      container: graphic,
      target: this.texture,
      transform: new Matrix(1, 0, 0, 1, graphic.width / 2, graphic.height / 2)
    })

    // if (renderer.app.renderer instanceof WebGLRenderer) {
    //   renderer.app.renderer.framebuffer.blit()
    // }

    graphic.destroy()
  }

  getTexture() {
    return this.texture
  }

  delete() {
    this.texture.destroy()
  }
}
