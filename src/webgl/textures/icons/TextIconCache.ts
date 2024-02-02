import { RenderTexture, Text as PixiText, Matrix } from 'pixi.js'
import { FontFamily } from '../assets/FontBook'
import { Renderer } from '../..'
import TextStyleTexture from '../text/TextStyleTexture'
import TextureAbstract from '../abstracts/TextureAbstract'
import TextureCache from '../abstracts/TextureCache'
import { MIN_ZOOM } from 'src/utils'

class TextIconTexture extends TextureAbstract {
  texture: RenderTexture

  constructor(renderer: Renderer, content: string, style: TextStyleTexture) {
    super(renderer)

    const object = new PixiText(content, {
      ...style.getTextStyle(),
      fontSize: style.current.fontSize * this.scaleFactor
    })

    object.updateText(true)
    const renderTexture = this.createRenderTexture(object.width, object.height)

    this.texture = renderTexture
    this.render(object, { renderTexture, transform: new Matrix() }).blit().destroy(object)
  }

  delete() {
    this.texture.destroy()
    return undefined
  }
}

export default class TextIconCache extends TextureCache<TextIconTexture> {
  scaleFactor = MIN_ZOOM

  constructor(private renderer: Renderer) {
    super()
    this.renderer = renderer
  }

  createTextIcon(content: string, style: TextStyleTexture) {
    const key = `${content}-${FontFamily.toFontString(style.current.fontFamily, style.current.fontWeight)}`

    if (this.cache[key] === undefined) {
      this.cache[key] = new TextIconTexture(this.renderer, content, style)
    }

    return this.cache[key].texture
  }
}
