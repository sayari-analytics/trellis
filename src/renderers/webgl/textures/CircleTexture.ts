import { RenderTexture, Graphics, Matrix } from 'pixi.js'
import { createRenderTexture } from '../../../utils/webgl'
import { MIN_TEXTURE_ZOOM } from '../../../utils/constants'
import { Texture } from '../../../types'
import { Renderer } from '..'

export default class CircleTexture implements Texture {
  private texture: RenderTexture

  constructor(renderer: Renderer) {
    const graphic = new Graphics().beginFill(0xffffff).drawCircle(0, 0, this.scaleFactor)

    this.texture = createRenderTexture(renderer.app, graphic, new Matrix(1, 0, 0, 1, graphic.width / 2, graphic.height / 2))
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
