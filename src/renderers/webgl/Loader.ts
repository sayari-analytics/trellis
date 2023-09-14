import * as PIXI from 'pixi.js-legacy'
import FontFaceObserver from 'fontfaceobserver'
import { throttle } from '../../utils'

const warn = throttle((err) => console.warn(err), 0)

/**
 * generic function for representing a value that is possibly asynchronous
 * think of this as a promise, except that
 * - it can resolve synchronously
 * - it can be cancelled
 * - it is lazy
 * - it doesn't handle error conditions
 * - it can't be chained
 *
 * const delay = Async((resolve) => setTimeout(() => resolve('done'), 1000))
 * const cancel = delay((message) => console.log(message))
 * cancel()
 *
 * // compare to the promise equivlanet
 * const delay = new Promise((resolve) => setTimeout(() => resolve('done'), 1000))
 * delay.then((message) => console.log(message))
 */
export const Async =
  <T>(executor: (resolve: (result: T) => void) => void) =>
  (onfulfilled: (result: T) => void) => {
    let cancelled = false

    executor((result) => {
      if (!cancelled) {
        onfulfilled(result)
      }
    })

    return () => {
      cancelled = true
    }
  }

export const FontLoader = () => {
  const fontCache: { [family: string]: boolean } = {}
  let loadId = 0
  const loading = new Set<number>()

  return {
    load: (family: string, weight: string) => {
      if (fontCache[family]) {
        return Async<string>((resolve) => resolve(family))
      } else if ((document as any)?.fonts?.load) {
        const _loadId = loadId++
        loading.add(_loadId)

        return Async<string>((resolve) => {
          ;(document as any).fonts.load(`${weight} 1em ${family}`).then(() => {
            fontCache[family] = true
            loading.delete(_loadId)
            resolve(family)
          })
        })
      } else {
        return Async<string>((resolve) => {
          const _loadId = loadId++
          loading.add(_loadId)

          new FontFaceObserver(family)
            .load()
            .then(() => {
              fontCache[family] = true
              loading.delete(_loadId)
              resolve(family)
            })
            .catch((err) => {
              warn(err)
              fontCache[family] = true
              loading.delete(_loadId)
              resolve(family)
            })
        })
      }
    },
    loading: () => loading.size > 0
  }
}

export const ImageLoader = () => {
  const image_cache: { [url: string]: PIXI.Loader } = {}
  let loadId = 0
  const loading = new Set<number>()

  return {
    load: (url: string) => {
      if (image_cache[url] === undefined) {
        image_cache[url] = new PIXI.Loader().add(url)
      }

      return Async<string>((resolve) => {
        const _loadId = loadId++
        loading.add(_loadId)
        ;(image_cache[url] as PIXI.Loader).load(() => {
          loading.delete(_loadId)
          resolve(url)
        })
      })
    },
    loading: () => loading.size > 0
  }
}
