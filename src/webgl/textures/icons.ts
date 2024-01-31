import { Text, Matrix, Assets, RenderTexture, Renderer as PixiRenderer, Texture, MSAA_QUALITY } from 'pixi.js'
import type { TextIcon, ImageIcon } from './../../types'
import type { Renderer } from '..'
import { MIN_ZOOM } from './../../utils'

export class IconTexture<T extends Texture = Texture> {
  protected cache: { [key: string]: T } = {}

  delete() {
    for (const key in this.cache) {
      this.cache[key].destroy()
    }

    this.cache = {}
  }
}

export class TextIconTexture extends IconTexture<RenderTexture> {
  renderer: Renderer
  scaleFactor: number // minZoom

  constructor(renderer: Renderer, scaleFactor = MIN_ZOOM) {
    super()
    this.renderer = renderer
    this.scaleFactor = scaleFactor
  }

  async create({ content, fontFamily = 'sans-serif', fontSize = 10, fontWeight, color: fill }: TextIcon) {
    const key = `${content}-${fontFamily}-${fontSize}-${fontWeight}-${fill}`

    if (this.cache[key] === undefined) {
      const ready = false
      // TODO+
      // let ready = this.renderer.fontBook.available(fontFamily, fontWeight)
      // if (!ready) {
      //   ready = await this.renderer.fontBook.loadFontFamily(fontFamily, fontWeight)
      // }

      if (!ready) {
        return null
      }

      const textObject = new Text(content, {
        fontFamily,
        fontSize: fontSize * this.scaleFactor,
        fontWeight,
        fill
      })

      textObject.updateText(true)

      const renderTexture = RenderTexture.create({
        width: textObject.width,
        height: textObject.height,
        multisample: MSAA_QUALITY.HIGH,
        resolution: 2
      })

      this.renderer.app.renderer.render(textObject, {
        renderTexture,
        transform: new Matrix()
      })

      if (this.renderer.app.renderer instanceof PixiRenderer) {
        this.renderer.app.renderer.framebuffer.blit()
      }

      textObject.destroy(true)

      this.cache[key] = renderTexture
    }

    return this.cache[key]
  }
}

export class ImageIconTexture extends IconTexture {
  private loading: { [key: string]: Promise<Texture> } = {}

  async create({ url }: ImageIcon) {
    if (this.cache[url] === undefined) {
      try {
        if (!this.loading[url]) {
          this.loading[url] = Assets.load<Texture>(url)
        }
        this.cache[url] = await this.loading[url]
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        return null
      }
    }

    return this.cache[url]
  }
}
