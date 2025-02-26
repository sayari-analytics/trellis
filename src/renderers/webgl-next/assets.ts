import { Assets as PixiAssets } from 'pixi.js'

export class Assets<T> {
  private cache: Record<string, T | Promise<T>> = {}

  load(url: string, onfulfilled: (asset: T) => void) {
    let cancelled = false

    if (this.cache[url] === undefined) {
      this.cache[url] = PixiAssets.load(url)
      this.cache[url].then((asset) => {
        this.cache[url] = asset
        if (!cancelled) onfulfilled(asset)
      })
    } else if (this.cache[url] instanceof Promise) {
      this.cache[url].then((asset) => {
        this.cache[url] = asset
        if (!cancelled) onfulfilled(asset)
      })
    } else {
      if (!cancelled) onfulfilled(this.cache[url])
    }

    return () => {
      cancelled = true
    }
  }

  onComplete(cb: (assets: T[]) => void) {
    Promise.all(Object.values(this.cache)).then(cb)
  }
}
