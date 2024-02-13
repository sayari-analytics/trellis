import { RenderTexture, Text as PixiText } from 'pixi.js'
import { createRenderTexture } from '../../../utils/webgl'
import { TextIcon, Texture } from '../../../types'
import { MIN_TEXTURE_ZOOM } from '../../../utils/constants'
import { Renderer } from '..'
import TextTexture from './TextTexture'

const join = (...args: (string | number)[]) => args.join('-')

export default class TextIconTexture implements Texture {
  protected cache: { [key: string]: RenderTexture } = {}

  constructor(private renderer: Renderer) {
    this.renderer = renderer
  }

  get(icon: TextIcon) {
    const style = new TextTexture(icon.style, { defaultTextStyle: { align: 'center' } })
    const key = join(icon.content, style.color, style.stroke.color, style.stroke.width, style.fontFamily, style.fontSize, style.fontWeight)

    if (this.cache[key] === undefined) {
      style.fontSize = style.fontSize * this.scaleFactor

      const object = new PixiText(icon.content, style.getTextStyle())
      object.updateText(true)

      this.cache[key] = createRenderTexture(this.renderer.app, object)
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
}
