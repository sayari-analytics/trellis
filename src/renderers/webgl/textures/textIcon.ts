import { RenderTexture, Text, Matrix, MSAA_QUALITY, Renderer as PixiRenderer, TextStyleFontWeight } from 'pixi.js'
import { MIN_ZOOM, Renderer } from '..'

// TODO - wait for text icon font family to load
export class TextIconTexture {
  renderer: Renderer
  scaleFactor = MIN_ZOOM // minZoom -- TODO make configurable

  private cache: { [icon: string]: RenderTexture } = {}

  constructor(renderer: Renderer) {
    this.renderer = renderer
  }

  create(text: string, fontFamily: string, fontSize: number, fontWeight: TextStyleFontWeight, fill: string | number) {
    const icon = `${text}-${fontFamily}-${fontSize}-${fontWeight}-${fill}`

    if (this.cache[icon] === undefined) {
      const textObject = new Text(text, {
        fontFamily,
        fontSize: fontSize * this.scaleFactor,
        fontWeight,
        fill
      })
      textObject.updateText(true)

      const texture = RenderTexture.create({
        width: textObject.width,
        height: textObject.height,
        multisample: MSAA_QUALITY.HIGH,
        resolution: 2
      })

      this.renderer.app.renderer.render(textObject, {
        renderTexture: texture,
        transform: new Matrix(1, 0, 0, 1, 0, 0)
      })

      if (this.renderer.app.renderer instanceof PixiRenderer) {
        this.renderer.app.renderer.framebuffer.blit()
      }

      textObject.destroy(true)

      this.cache[icon] = texture
    }

    return this.cache[icon]
  }

  delete() {
    for (const key in this.cache) {
      this.cache[key].destroy()
    }
    this.cache = {}
  }
}
