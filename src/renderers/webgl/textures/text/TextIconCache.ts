import type { Renderer } from '../..'
import type { TextIcon } from '../../../../types/api'
import { DEFAULT_TEXT_STYLE } from '../../../../utils/constants'
import { MIN_ZOOM } from '../../utils'
import TextIconTexture from './TextIconTexture'

export default class TextIconCache {
  protected cache: { [key: string]: TextIconTexture } = {}

  static getCacheKey({ content, style = {} }: TextIcon) {
    const { color, stroke, fontFamily, fontSize, fontWeight } = { ...style, ...DEFAULT_TEXT_STYLE }
    return [content, color, stroke.color, stroke.width, fontFamily, fontSize, fontWeight].join('-')
  }

  constructor(private renderer: Renderer) {
    this.renderer = renderer
  }

  create(icon: TextIcon) {
    const key = TextIconCache.getCacheKey(icon)

    if (this.cache[key] === undefined) {
      this.cache[key] = new TextIconTexture(this.renderer, icon, this.resolution, this.scaleFactor)
    }

    return this.cache[key].texture
  }

  delete() {
    for (const key in this.cache) {
      this.cache[key].delete()
    }

    this.cache = {}
  }

  // TODO -> intergrate with renderer options
  get scaleFactor() {
    return MIN_ZOOM
  }
  get resolution() {
    return 2
  }
}
