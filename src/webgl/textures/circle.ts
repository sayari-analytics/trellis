import { RenderTexture, Graphics, Matrix, MSAA_QUALITY, Renderer as PixiRenderer } from 'pixi.js'
import { MIN_ZOOM } from './../../utils'
import { type Renderer } from '..'

export class CircleTexture {
  texture: RenderTexture
  scaleFactor = 10 * MIN_ZOOM // maxRadius * minZoom -- TODO make configurable

  constructor(renderer: Renderer) {
    const graphic = new Graphics().beginFill(0xffffff).drawCircle(0, 0, this.scaleFactor)

    this.texture = RenderTexture.create({
      width: graphic.width,
      height: graphic.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution: 2
    })

    renderer.app.renderer.render(graphic, {
      renderTexture: this.texture,
      transform: new Matrix(1, 0, 0, 1, graphic.width / 2, graphic.height / 2)
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
