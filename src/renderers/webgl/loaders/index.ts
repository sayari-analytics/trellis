import FontLoader, { FontSubscription } from './FontLoader'
import ResourceLoader, { ResourceSubscription } from './ResourceLoader'

export type { FontSubscription, ResourceSubscription }

export default class AssetLoader {
  private _font = new FontLoader()
  private _resource = new ResourceLoader()

  loadFont = this._font.load.bind(this._font)
  loadUrl = this._resource.load.bind(this._resource)

  shouldLoadFont(
    style: { fontFamily?: string; fontWeight?: string | number } | undefined
  ): style is { fontFamily: string; fontWeight?: string | number } {
    return style?.fontFamily !== undefined && !FontLoader.available(style.fontFamily, style.fontWeight)
  }

  shouldLoadResource(url: string) {
    return !ResourceLoader.available(url)
  }

  checkFontCache(fontFamily: string, fontWeight?: string | number) {
    return FontLoader.available(fontFamily, fontWeight)
  }

  checkResourceCache(url: string) {
    return ResourceLoader.available(url)
  }
}
