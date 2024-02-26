import { RenderTexture, Text as PixiText, MSAA_QUALITY, Matrix, Renderer as PixiRenderer } from 'pixi.js'
import { DEFAULT_RESOLUTION, DEFAULT_TEXT_STYLE, MIN_TEXTURE_ZOOM } from '../../../utils/constants'
import { TextIcon, Texture } from '../../../types'
import { Renderer } from '..'
import TextTexture from './TextTexture'

const getCacheKey = ({ content, style = {} }: TextIcon) => {
  const { color, stroke, fontFamily, fontSize, fontWeight } = { ...style, ...DEFAULT_TEXT_STYLE }
  return [content, color, stroke.color, stroke.width, fontFamily, fontSize, fontWeight].join('-')
}

export default class TextIconTexture implements Texture {
  protected cache: { [key: string]: RenderTexture } = {}

  constructor(private renderer: Renderer) {
    this.renderer = renderer
  }

  get(icon: TextIcon) {
    const key = getCacheKey(icon)

    if (this.cache[key] === undefined) {
      this.cache[key] = this.createTexture(icon)
    }

    return this.cache[key]
  }

  delete() {
    for (const key in this.cache) {
      this.cache[key].destroy()
    }

    this.cache = {}
    return undefined
  }

  // TODO -> intergrate with renderer options
  get scaleFactor() {
    return MIN_TEXTURE_ZOOM
  }
  get resolution() {
    return DEFAULT_RESOLUTION
  }

  private createTexture(icon: TextIcon) {
    const style = new TextTexture(icon.style, { defaultTextStyle: { align: 'center' } })
    style.fontSize = style.fontSize * this.scaleFactor

    const object = new PixiText(icon.content, style.getTextStyle())

    object.updateText(true)

    const renderTexture = RenderTexture.create({
      width: object.width,
      height: object.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution: this.resolution
    })

    this.renderer.app.renderer.render(object, { renderTexture, transform: new Matrix() })

    if (this.renderer.app.renderer instanceof PixiRenderer) {
      this.renderer.app.renderer.framebuffer.blit()
    }

    object.destroy(true)

    return renderTexture
  }
}
