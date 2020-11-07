import * as PIXI from 'pixi.js'
import FontFaceObserver from 'fontfaceobserver'


const font_cache: { [family: string]: boolean } = {}


const image_cache: { [url: string]: boolean } = {}


export const Loader = <T>(resolver: (resolve: (result: T) => void) => void, cb: (result: T) => void) => {
  let cancelled = false

  resolver((result) => {
    if (!cancelled) {
      cb(result)
    }
  })

  return () => {
    cancelled = true
  }
}


export const FontLoader = (family: string, cb: (family: string) => void) => {
  if (font_cache[family]) {
    return Loader<string>((resolve) => resolve(family), cb)
  } else if ((document as any)?.fonts?.load) {
    return Loader<string>((resolve) => {
      (document as any).fonts.load(`1em ${family}`).then(() => {
        font_cache[family] = true
        resolve(family)
      })
    }, cb)
  } else {
    return Loader<string>((resolve) => {
      new FontFaceObserver(family).load().then(() => {
        font_cache[family] = true
        resolve(family)
      })
    }, cb)
  }
}


export const ImageLoader = (url: string, cb: (url: string) => void) => {
  if (image_cache[url]) {
    return Loader<string>((resolve) => resolve(url), cb)
  }

  return Loader<string>((resolve) => {
    new PIXI.Loader().add(url).load(() => {
      image_cache[url] = true
      resolve(url)
    })
  }, cb)
}
