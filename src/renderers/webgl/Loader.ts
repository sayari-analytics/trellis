import * as PIXI from 'pixi.js'
import FontFaceObserver from 'fontfaceobserver'


const font_cache: { [family: string]: boolean } = {}


const image_cache: { [url: string]: PIXI.Loader | true } = {}


/**
 * generic function for representing a value that is possibly asynchronous
 * this of this as a promise, except that
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


export const FontLoader = (family: string) => {
  if (font_cache[family]) {
    return Async<string>((resolve) => resolve(family))
  } else if ((document as any)?.fonts?.load) {
    return Async<string>((resolve) => {
      (document as any).fonts.load(`1em ${family}`).then(() => {
        font_cache[family] = true
        resolve(family)
      })
    })
  } else {
    return Async<string>((resolve) => {
      new FontFaceObserver(family).load().then(() => {
        font_cache[family] = true
        resolve(family)
      })
    })
  }
}


export const ImageLoader = (url: string) => {
  if (/^data:/.test(url) || image_cache[url] === true) {
    return Async<string>((resolve) => resolve(url))
  } else if (image_cache[url] instanceof PIXI.Loader) {
    return Async<string>((resolve) => {
      (image_cache[url] as PIXI.Loader).load(() => {
        image_cache[url] = true
        resolve(url)
      })
    })
  }

  return Async<string>((resolve) => {
    image_cache[url] = new PIXI.Loader().add(url)
    ;(image_cache[url] as PIXI.Loader).load(() => {
      image_cache[url] = true
      resolve(url)
    })
  })
}
