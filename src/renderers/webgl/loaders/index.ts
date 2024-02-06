import FontLoader from './FontLoader'
import ResourceLoader from './ResourceLoader'

export default class AssetLoader {
  private _font = new FontLoader()
  private _resource = new ResourceLoader()

  loadFont = this._font.load.bind(this._font)
  loadUrl = this._resource.load.bind(this._resource)

  checkFontCache(fontFamily: string, fontWeight?: string | number) {
    return FontLoader.available(fontFamily, fontWeight)
  }

  checkResourceCache(url: string) {
    return ResourceLoader.available(url)
  }
}
