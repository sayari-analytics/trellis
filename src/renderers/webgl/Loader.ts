import * as PIXI from 'pixi.js'
import FontFaceObserver from 'fontfaceobserver'


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
export const Async = <T>(executor: (resolve: (result: T) => void) => void) => (onfulfilled: (result: T) => void) => {
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


// export const FontLoader = () => {
//   const cache: { [family: string]: boolean } = {}

//   return (family: string) => {
//     if (cache[family]) {
//       return Async<string>((resolve) => resolve(family))
//     } else if ((document as any)?.fonts?.load) {
//       return Async<string>((resolve) => {
//         (document as any).fonts.load(`1em ${family}`).then(() => {
//           cache[family] = true
//           resolve(family)
//         })
//       })
//     } else {
//       return Async<string>((resolve) => {
//         new FontFaceObserver(family).load().then(() => {
//           cache[family] = true
//           resolve(family)
//         })
//       })
//     }
//   }
// }

export const FontLoader = () => {
  const cache: { [family: string]: boolean } = {}
  let loadId = 0
  const loading = new Set<number>()

  return {
    load: (family: string) => {
      if (cache[family]) {
        return Async<string>((resolve) => resolve(family))
      } else if ((document as any)?.fonts?.load) {
        const _loadId = loadId++
        loading.add(_loadId)

        return Async<string>((resolve) => {
          (document as any).fonts.load(`1em ${family}`).then(() => {
            cache[family] = true
            loading.delete(_loadId)
            resolve(family)
          })
        })
      } else {
        return Async<string>((resolve) => {
          const _loadId = loadId++
          loading.add(_loadId)

          new FontFaceObserver(family).load().then(() => {
            cache[family] = true
            loading.delete(_loadId)
            resolve(family)
          })
        })
      }
    },
    loading: () => loading.size > 0
  }
}


// export const ImageLoader = () => {
//   const cache: { [url: string]: PIXI.Loader | true } = {}

//   return (url: string) => {
//     if (/^data:/.test(url) || cache[url] === true) {
//       return Async<string>((resolve) => resolve(url))
//     } else if (cache[url] instanceof PIXI.Loader) {
//       return Async<string>((resolve) => {
//         (cache[url] as PIXI.Loader).load(() => {
//           cache[url] = true
//           resolve(url)
//         })
//       })
//     }

//     return Async<string>((resolve) => {
//       cache[url] = new PIXI.Loader().add(url)
//       ;(cache[url] as PIXI.Loader).load(() => {
//         cache[url] = true
//         resolve(url)
//       })
//     })
//   }
// }


export const ImageLoader = () => {
  const cache: { [url: string]: PIXI.Loader | true } = {}
  let loadId = 0
  const loading = new Set<number>()

  return {
    load: (url: string) => {
      if (/^data:/.test(url) || cache[url] === true) {
        return Async<string>((resolve) => resolve(url))
      } else if (cache[url] instanceof PIXI.Loader) {
        const _loadId = loadId++
        loading.add(_loadId)

        return Async<string>((resolve) => {
          (cache[url] as PIXI.Loader).load(() => {
            cache[url] = true
            loading.delete(_loadId)
            resolve(url)
          })
        })
      }

      return Async<string>((resolve) => {
        cache[url] = new PIXI.Loader().add(url)
        const _loadId = loadId++
        loading.add(_loadId)

        ;(cache[url] as PIXI.Loader).load(() => {
          cache[url] = true
          loading.delete(_loadId)
          resolve(url)
        })
      })
    },
    loading: () => loading.size > 0
  }
}
