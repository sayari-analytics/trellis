import { RenderTexture, Graphics, Renderer as PixiRenderer } from 'pixi.js'
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
      resolution: 2,
      scaleMode: 'linear',
      alphaMode: 'premultiply-alpha-on-upload'
    })

    const pixiRenderer = renderer.app.renderer as PixiRenderer
    pixiRenderer.render(graphic, { renderTexture: this.texture })
    this.texture.baseTexture.update()

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
