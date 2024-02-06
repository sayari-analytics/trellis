import { Publisher, Subscriber, Subscription } from './PubSub'
import { Assets, Texture } from 'pixi.js'
import { noop } from '../../../utils'

export type ResourceSubscription = Subscription<Texture>

type LoadResourceProps = Partial<Subscriber<Texture>> & { url: string }

export default class ResourceLoader {
  private cache: { [key: string]: Publisher<Texture> } = {}

  static available(url: string) {
    return Assets.cache.has(url)
  }

  load({ url, resolve = noop, reject = noop }: LoadResourceProps) {
    if (this.cache[url] === undefined) {
      this.cache[url] = this.createPublisher(url)
    }

    return this.cache[url].subscribe({ resolve, reject })
  }

  private createPublisher(url: string) {
    return new Publisher<Texture>(
      async function loadResource(): Promise<Texture> {
        try {
          return await Assets.load<Texture>(url)
        } catch (error) {
          console.warn(error)
          throw new Error(`Error loading asset: ${url}`)
        }
      },
      function checkCache(): Texture | null {
        if (ResourceLoader.available(url)) {
          return Assets.cache.get(url)
        }

        return null
      }
    )
  }
}
