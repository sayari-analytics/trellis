import { RenderTexture, Text as PixiText, MSAA_QUALITY, Matrix, Renderer as PixiRenderer } from 'pixi.js'
import type { TextIcon } from '../../../../types/api'
import type { Renderer } from '../..'

export default class TextIconTexture {
  texture: RenderTexture

  constructor(renderer: Renderer, { text, fontFamily, fontSize, fontWeight, color }: TextIcon, resolution: number, scaleFactor: number) {
    const object = new PixiText(text, {
      fontFamily,
      fontSize: fontSize * scaleFactor,
      fontWeight,
      fill: color
    })

    object.updateText(true)

    const texture = RenderTexture.create({
      width: object.width,
      height: object.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution
    })

    renderer.app.renderer.render(object, { renderTexture: texture, transform: new Matrix() })

    if (renderer.app.renderer instanceof PixiRenderer) {
      renderer.app.renderer.framebuffer.blit()
    }

    object.destroy(true)

    this.texture = texture
  }

  delete() {
    this.texture.destroy()
    return undefined
  }
}
