import { RenderTexture, Graphics, Matrix, MSAA_QUALITY, Renderer as PixiRenderer } from 'pixi.js'
import { MIN_TEXTURE_ZOOM } from '../../../utils/constants'
import { Texture } from '../../../types'
import { Renderer } from '..'

export default class CircleTexture implements Texture {
  private texture: RenderTexture

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

  get() {
    return this.texture
  }

  delete() {
    this.texture.destroy()
    return undefined
  }

  // TODO -> make configurable
  get scaleFactor() {
    // maxRadius * minZoom
    return 10 * MIN_TEXTURE_ZOOM
  }
}
