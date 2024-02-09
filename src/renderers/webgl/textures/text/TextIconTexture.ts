import { RenderTexture, Text as PixiText, MSAA_QUALITY, Matrix, Renderer as PixiRenderer } from 'pixi.js'
import type { TextIcon } from '../../../../types/api'
import type { Renderer } from '../..'
import TextTexture from './TextTexture'

export default class TextIconTexture {
  texture: RenderTexture

  constructor(renderer: Renderer, icon: TextIcon, resolution: number, scaleFactor: number) {
    const style = new TextTexture(icon.style, { defaultTextStyle: { align: 'center' } })
    style.fontSize = style.fontSize * scaleFactor

    const object = new PixiText(icon.content, style.getTextStyle())

    object.updateText(true)

    const renderTexture = RenderTexture.create({
      width: object.width,
      height: object.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution
    })

    renderer.app.renderer.render(object, { renderTexture, transform: new Matrix() })

    if (renderer.app.renderer instanceof PixiRenderer) {
      renderer.app.renderer.framebuffer.blit()
    }

    object.destroy(true)

    this.texture = renderTexture
  }

  delete() {
    this.texture.destroy()
    return undefined
  }
}
