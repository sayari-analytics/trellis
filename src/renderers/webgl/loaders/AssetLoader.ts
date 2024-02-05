import { Publisher, Subscriber } from './PubSub'
import { Assets, Texture } from 'pixi.js'
import { noop } from '../../../utils'
import { warn } from 'console'

export default class AssetLoader {
  private cache: { [key: string]: Publisher<Texture> } = {}

  load({ url, resolve = noop, reject = noop }: Partial<Subscriber<Texture>> & { url: string }) {
    if (this.cache[url] === undefined) {
      this.cache[url] = this.createPublisher(url)
    }

    return this.cache[url].subscribe({ resolve, reject })
  }

  private createPublisher(url: string) {
    return new Publisher<Texture>(
      async function loadAsset(): Promise<Texture> {
        try {
          return await Assets.load<Texture>(url)
        } catch (error) {
          warn(error)
          throw new Error(`Error loading asset: ${url}`)
        }
      },
      function checkAssetCache(): Texture | null {
        return Assets.get(url)
      }
    )
  }
}
