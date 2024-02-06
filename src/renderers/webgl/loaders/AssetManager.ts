import FontLoader, { FontSubscription } from './FontLoader'
import AssetLoader, { AssetSubscription } from './AssetLoader'

export type { FontSubscription, AssetSubscription }

export default class AssetManager {
  private _font = new FontLoader()
  private _asset = new AssetLoader()

  loadFont = this._font.load.bind(this._font)
  loadUrl = this._asset.load.bind(this._asset)

  shouldLoadFont(
    style: { fontFamily?: string; fontWeight?: string | number } | undefined
  ): style is { fontFamily: string; fontWeight?: string | number } {
    return style?.fontFamily !== undefined && !FontLoader.available(style.fontFamily, style.fontWeight)
  }

  checkAssetCache(url: string) {
    return AssetLoader.get(url)
  }
}
