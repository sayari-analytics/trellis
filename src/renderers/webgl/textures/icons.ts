import type { FontWeight } from '../../../types'
import type { Renderer } from '..'
import { Text, Matrix, Assets, RenderTexture, Renderer as PixiRenderer, Texture as PixiTexture, MSAA_QUALITY } from 'pixi.js'
import { MIN_ZOOM } from '../utils'

export class IconTexture<Texture extends PixiTexture = PixiTexture> {
  protected cache: { [key: string]: Texture } = {}

  delete() {
    for (const key in this.cache) {
      this.cache[key].destroy()
    }

    this.cache = {}
  }
}

export type TextIcon = {
  type: 'textIcon'
  text: string
  fontSize: number
  fontFamily: string
  color: string
  fontWeight?: FontWeight
  offset?: { x?: number; y?: number }
}

export class TextIconTexture extends IconTexture<RenderTexture> {
  renderer: Renderer
  scaleFactor: number // minZoom

  constructor(renderer: Renderer, scaleFactor = MIN_ZOOM) {
    super()
    this.renderer = renderer
    this.scaleFactor = scaleFactor
  }

  async create({ text, fontFamily, fontSize, fontWeight, color: fill }: TextIcon) {
    const key = `${text}-${fontFamily}-${fontSize}-${fontWeight}-${fill}`

    if (this.cache[key] === undefined) {
      let ready = this.renderer.fontBook.available(fontFamily, fontWeight)
      if (!ready) {
        ready = await this.renderer.fontBook.load(fontFamily, fontWeight)
      }

      if (!ready) {
        return null
      }

      const textObject = new Text(text, {
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

export type ImageIcon = {
  type: 'imageIcon'
  url: string
  scale?: number
  offset?: { x?: number; y?: number }
}

export class ImageIconTexture extends IconTexture {
  private loading: { [key: string]: Promise<PixiTexture> } = {}

  async create({ url }: ImageIcon) {
    if (this.cache[url] === undefined) {
      try {
        if (!this.loading[url]) {
          this.loading[url] = Assets.load<PixiTexture>(url)
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
