import { Application, Renderer, Container, Matrix, RenderTexture, IBaseTextureOptions, MSAA_QUALITY, SCALE_MODES } from 'pixi.js'
import { DEFAULT_RESOLUTION } from './constants'

export const createRenderTexture = <A extends Application, G extends Container>(
  app: A,
  graphic: G,
  transform = new Matrix(),
  options: IBaseTextureOptions = {}
) => {
  const renderTexture = RenderTexture.create({
    width: graphic.width,
    height: graphic.height,
    resolution: DEFAULT_RESOLUTION,
    multisample: MSAA_QUALITY.HIGH,
    scaleMode: SCALE_MODES.LINEAR,
    ...options
  })

  app.renderer.render(graphic, { renderTexture, transform })

  if (app.renderer instanceof Renderer) {
    app.renderer.framebuffer.blit()
  }

  graphic.destroy(true)

  return renderTexture
}
