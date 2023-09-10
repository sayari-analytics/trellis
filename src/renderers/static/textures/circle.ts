import { RenderTexture, Graphics, Matrix, MSAA_QUALITY, Renderer } from 'pixi.js-legacy'
import { StaticRenderer } from '..'


export class CircleTexture {

  texture: RenderTexture
  scaleFactor = 10 * 5 // maxRadius * minZoom -- TODO make configurable

  constructor(renderer: StaticRenderer) {
    const graphic = new Graphics()
      .beginFill(0xffffff)
      .drawCircle(0, 0, this.scaleFactor)
  
    this.texture = RenderTexture.create({
      width: graphic.width,
      height: graphic.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution: 2
    })
  
    renderer.app.renderer.render(graphic, {
      renderTexture: this.texture,
      transform: new Matrix(1, 0, 0, 1, graphic.width / 2, graphic.height / 2)
    })
  
    if (renderer.app.renderer instanceof Renderer) {
      renderer.app.renderer.framebuffer.blit()
    }
  
    graphic.destroy(true)
  }

  delete() {
    this.texture.destroy()
  }
}
