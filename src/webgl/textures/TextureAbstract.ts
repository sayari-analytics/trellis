import { MSAA_QUALITY, RenderTexture, Renderer as PixiRenderer, IRenderableObject, IRendererRenderOptions } from 'pixi.js'
import { MIN_ZOOM } from '../../utils'
import { Renderer } from '..'

export default abstract class TextureAbstract {
  resolution = 2
  scaleFactor = MIN_ZOOM

  constructor(protected renderer: Renderer) {
    this.renderer = renderer
  }

  abstract delete(): void

  protected createRenderTexture(width: number, height: number) {
    return RenderTexture.create({
      width,
      height,
      resolution: this.resolution,
      multisample: MSAA_QUALITY.HIGH
    })
  }

  protected render<T extends IRenderableObject>(graphic: T, options?: IRendererRenderOptions) {
    this.renderer.app.renderer.render(graphic, options)

    return this
  }

  protected blit() {
    if (this.renderer.app.renderer instanceof PixiRenderer) {
      this.renderer.app.renderer.framebuffer.blit()
    }

    return this
  }

  protected destroy<T extends { destroy: (options?: boolean) => void }>(graphic: T) {
    graphic.destroy(true)
    return this
  }
}
