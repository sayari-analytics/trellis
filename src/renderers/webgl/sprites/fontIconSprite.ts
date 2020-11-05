import * as PIXI from 'pixi.js'


export class FontIconSprite {

  cache: { [icon: string]: PIXI.Texture } = {}

  create(text: string, fontFamily: string, fontSize: number, fontWeight: string, fill: string) {
    const icon = `${text}-${fontFamily}-${fontSize}-${fontWeight}-${fill}`
    if (this.cache[icon] === undefined) {
      const textSprite = new PIXI.Text(text, {
        fontFamily,
        fontSize: fontSize * 2,
        fontWeight,
        fill
      })
      textSprite.updateText(true)
      this.cache[icon] = textSprite.texture
    }

    const sprite = new PIXI.Sprite(this.cache[icon])
    sprite.position.set(0, 0)
    sprite.anchor.set(0.5)
    sprite.scale.set(0.5)

    return sprite
  }

  delete() {
    Object.values(this.cache).forEach((texture) => texture.destroy())
    this.cache = {}
  }
}

