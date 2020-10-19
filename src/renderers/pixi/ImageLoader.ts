import * as PIXI from 'pixi.js'

const cache: { [url: string]: PIXI.Texture } = {}

export const ImageLoader = (url: string) => {
  if(cache[url] === undefined) {
    cache[url] = PIXI.Texture.from(url)
  }

  return new PIXI.Sprite(cache[url])
}