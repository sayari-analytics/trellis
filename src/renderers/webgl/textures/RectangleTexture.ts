import { Graphics, Matrix, RenderTexture } from 'pixi.js'
import { createRenderTexture } from '../../../utils/webgl'
import { MIN_TEXTURE_ZOOM } from '../../../utils/constants'
import { Renderer } from '..'
import { Texture } from '../../../types'

export default class RectangleTexture implements Texture {
  scaleFactor: number
  private texture: RenderTexture

  constructor(renderer: Renderer) {
    this.scaleFactor = Math.max(renderer.width, renderer.height) * this.minTextureZoom

    const graphic = new Graphics().beginFill(0xffffff).drawRect(0, 0, this.scaleFactor, this.scaleFactor)

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
  private get minTextureZoom() {
    return MIN_TEXTURE_ZOOM
  }
}
