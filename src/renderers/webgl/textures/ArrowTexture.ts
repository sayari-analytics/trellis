import { RenderTexture, Graphics, Matrix } from 'pixi.js'
import { createRenderTexture } from '../../../utils/webgl'
import { MIN_TEXTURE_ZOOM } from '../../../utils/constants'
import { Renderer } from '..'
import { Texture } from '../../../types'

export default class ArrowTexture implements Texture {
  private texture: RenderTexture

  constructor(renderer: Renderer) {
    const graphic = new Graphics()
      .beginFill(0xffffff)
      .lineTo(this.height * this.scaleFactor, this.width * this.scaleFactor * 0.5)
      .lineTo(this.height * this.scaleFactor, -this.width * this.scaleFactor * 0.5)

    this.texture = createRenderTexture(renderer.app, graphic, new Matrix(1, 0, 0, 1, 0, graphic.height / 2))
  }

  get() {
    return this.texture
  }
  delete() {
    this.texture.destroy()
  }

  // TODO -> make configurable
  get scaleFactor() {
    return MIN_TEXTURE_ZOOM
  }
  get height() {
    return 12
  }
  get width() {
    return 6
  }
}
