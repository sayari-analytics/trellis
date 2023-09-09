import { RenderTexture, Graphics, Sprite, MSAA_QUALITY, Matrix, Renderer } from 'pixi.js-legacy'
import { StaticRenderer } from '..'


export class ArrowTexture {

  height = 12 // TODO - make configurable
  width = 6 // TODO - make configurable
  scaleFactor = 5 // minZoom -- TODO make configurable

  private texture: RenderTexture

  constructor(renderer: StaticRenderer) {
    const graphic = new Graphics()
      .beginFill(0xffffff)
      .lineTo(this.height * this.scaleFactor, this.width * this.scaleFactor * 0.5)
      .lineTo(this.height * this.scaleFactor, - this.width * this.scaleFactor * 0.5)
  
    this.texture = RenderTexture.create({
      width: graphic.width,
      height: graphic.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution: 2
    })
  
    renderer.app.renderer.render(graphic, {
      renderTexture: this.texture,
      transform: new Matrix(1, 0, 0, 1, 0, graphic.height / 2)
    })
  
    if (renderer.app.renderer instanceof Renderer) {
      renderer.app.renderer.framebuffer.blit()
    }
  
    graphic.destroy(true)
  }

  create() {
    const sprite = new Sprite(this.texture)
    sprite.anchor.set(0, 0.5)

    return sprite
  }

  delete() {
    this.texture.destroy()
  }
}