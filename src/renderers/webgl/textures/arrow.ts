import { RenderTexture, Graphics, Matrix, MSAA_QUALITY, Renderer as PixiRenderer } from 'pixi.js-legacy'
import { MIN_ZOOM, Renderer } from '..'

export class ArrowTexture {
  texture: RenderTexture
  height = 12 // TODO - make configurable
  width = 6 // TODO - make configurable
  scaleFactor = MIN_ZOOM // minZoom -- TODO make configurable

  constructor(renderer: Renderer) {
    const graphic = new Graphics()
      .beginFill(0xffffff)
      .lineTo(this.height * this.scaleFactor, this.width * this.scaleFactor * 0.5)
      .lineTo(this.height * this.scaleFactor, -this.width * this.scaleFactor * 0.5)

    this.texture = RenderTexture.create({
      width: graphic.width,
      height: graphic.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution: 2
    })

    renderer.app.renderer.render(graphic, {
      renderTexture: this.texture,
      transform: new Matrix(1, 0, 0, 1, 0, graphic.height / 2)
    })

    if (renderer.app.renderer instanceof PixiRenderer) {
      renderer.app.renderer.framebuffer.blit()
    }

    graphic.destroy(true)
  }

  delete() {
    this.texture.destroy()
  }
}
