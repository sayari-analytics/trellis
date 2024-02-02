import { Assets, Texture } from 'pixi.js'
import Publisher, { Subscriber, Subscription } from '../abstracts/PubSub'
import TextureCache from '../abstracts/TextureCache'

export class AssetSubscription implements Subscription {
  constructor(
    private _loader: AssetPublisher,
    private _subscriber: Subscriber<Texture>
  ) {
    this._loader = _loader
    this._subscriber = _subscriber
  }

  get texture() {
    return this._loader.asset
  }

  get ready() {
    return this._loader.ready
  }

  unsubscribe() {
    this._loader.unsubscribe(this._subscriber)
  }
}

export class AssetPublisher extends Publisher<Texture, AssetSubscription> {
  url: string

  constructor(url: string) {
    super()
    this.url = url
  }

  protected caller() {
    return Assets.load<Texture>(this.url)
  }

  protected override subscription(subscriber: Subscriber<Texture>): AssetSubscription {
    return new AssetSubscription(this, subscriber)
  }
}

export default class AssetLoader extends TextureCache<AssetPublisher> {
  available(url: string) {
    return Assets.cache.has(url)
  }

  get(url: string) {
    return Assets.get<Texture>(url)
  }

  load(url: string, subscriber: Subscriber<Texture>) {
    if (this.cache[url] === undefined) {
      this.cache[url] = new AssetPublisher(url)
    }

    return this.cache[url].subscribe(subscriber)
  }
}
