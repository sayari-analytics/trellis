import * as PIXI from 'pixi.js'


export class ImageSprite {

  cache: { [url: string]: PIXI.Texture } = {}

  createSprite(url: string) {
    if (this.cache[url] === undefined) {
      this.cache[url] = PIXI.Texture.from(url)
    }

    return new PIXI.Sprite(this.cache[url])
  }

  delete() {
    this.cache = {}
  }
}
