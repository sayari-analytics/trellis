import { Publisher, Subscriber } from './PubSub'
import { Assets, Texture } from 'pixi.js'
import { noop } from '../../../utils/helpers'

type LoadAssetProps = Partial<Subscriber<Texture>> & { url: string }

export default class AssetLoader {
  private cache: { [url: string]: Publisher<Texture> } = {}

  static get(url: string): Texture | null {
    if (Assets.cache.has(url)) {
      return Assets.cache.get(url)
    } else {
      return null
    }
  }

  load({ url, resolve = noop, reject = noop }: LoadAssetProps) {
    if (this.cache[url] === undefined) {
      this.cache[url] = this.createPublisher(url)
    }

    return this.cache[url].subscribe({ resolve, reject })
  }

  cancel() {
    for (const url in this.cache) {
      this.cache[url].cancel()
    }

    this.cache = {}
    return undefined
  }

  get loading() {
    for (const url in this.cache) {
      if (this.cache[url].loading) {
        return true
      }
    }

    return false
  }

  private createPublisher(url: string) {
    return new Publisher<Texture>(
      async function loadAsset(): Promise<Texture> {
        try {
          return await Assets.load<Texture>(url)
        } catch (error) {
          console.warn(error)
          throw new Error(`Error loading asset: ${url}`)
        }
      },
      function checkCache() {
        return AssetLoader.get(url)
      }
    )
  }
}
