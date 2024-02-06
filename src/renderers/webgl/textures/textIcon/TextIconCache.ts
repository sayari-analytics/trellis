import type { Renderer } from '../..'
import type { TextIcon } from '../../../../'
import { MIN_ZOOM } from '../../utils'
import TextIconTexture from './TextIconTexture'

export default class TextIconCache {
  protected cache: { [key: string]: TextIconTexture } = {}

  static getCacheKey({ text, fontFamily, fontSize, fontWeight = 'normal', color }: TextIcon) {
    return [text, fontFamily, fontSize, fontWeight ?? 'normal', color].join('-')
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
