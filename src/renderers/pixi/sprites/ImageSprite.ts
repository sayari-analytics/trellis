import * as PIXI from 'pixi.js'


export class ImageSprite {

  cache: { [url: string]: PIXI.Texture } = {}

  create(url: string, scale?: number, offset?: { x?: number, y?: number }) {
    if (this.cache[url] === undefined) {
      const iconSprite = PIXI.Sprite.from(url)
      this.cache[url] = iconSprite.texture
      iconSprite.name = 'icon'
      iconSprite.position.set(offset?.x ?? 0, offset?.y ?? 0)
      iconSprite.anchor.set(0.5)
      iconSprite.scale.set(scale ?? 1)

      return iconSprite
    }

    const sprite = new PIXI.Sprite(this.cache[url])
    sprite.name = 'icon'
    sprite.position.set(offset?.x ?? 0, offset?.y ?? 0)
    sprite.anchor.set(0.5)
    sprite.scale.set(scale ?? 1)

    return sprite
  }

  delete() {
    Object.values(this.cache).forEach((texture) => texture.destroy())
    this.cache = {}
  }
}
