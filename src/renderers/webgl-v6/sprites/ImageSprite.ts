import * as PIXI from 'pixi.js-legacy'


// export class ImageSprite {

//   cache: { [url: string]: PIXI.Texture } = {}

//   create(url: string, scale: number = 1, offsetX: number = 0, offsetY: number = 0) {
//     const sprite = PIXI.Sprite.from(url)
//     sprite.position.set(offsetX, offsetY)
//     sprite.anchor.set(0.5)
//     sprite.scale.set(scale)

//     return sprite
//   }

//   delete() {}
// }


/**
 * TODO - cacheing textures doesn't always work on initial render
 * need to use pixi loader
 */
export class ImageSprite {

  cache: { [url: string]: PIXI.Texture } = {}

  create(url: string, scale: number = 1, offsetX: number = 0, offsetY: number = 0) {
    if (this.cache[url] === undefined) {
      this.cache[url] = PIXI.Sprite.from(url).texture
    }

    const sprite = new PIXI.Sprite(this.cache[url])
    sprite.position.set(offsetX, offsetY)
    sprite.anchor.set(0.5)
    sprite.scale.set(scale)

    return sprite
  }

  delete() {
    Object.values(this.cache).forEach((texture) => texture.destroy())
    this.cache = {}
  }
}
