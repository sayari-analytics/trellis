import FontLoader from './FontLoader'
import AssetLoader from './AssetLoader'
import { Subscription } from './PubSub'
import { Texture } from 'pixi.js'

export type FontSubscription = Subscription<true>
export type AssetSubscription = Subscription<Texture>

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

  cancel() {
    this._font.cancel()
    this._asset.cancel()
  }

  get loading() {
    return this._font.loading || this._asset.loading
  }
}
