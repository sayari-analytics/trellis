import { MIN_ZOOM, Renderer } from '..'
import {
  Text,
  Matrix,
  Sprite,
  IPointData,
  TextStyleFill,
  RenderTexture,
  TextStyleFontWeight,
  Renderer as PixiRenderer,
  Texture as PixiTexture,
  MSAA_QUALITY
} from 'pixi.js'

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
  color: TextStyleFill
  fontWeight?: TextStyleFontWeight
  offset?: Partial<IPointData>
}

export class TextIconTexture extends IconTexture<RenderTexture> {
  renderer: Renderer
  scaleFactor: number // minZoom

  constructor(renderer: Renderer, scaleFactor = MIN_ZOOM) {
    super()
    this.renderer = renderer
    this.scaleFactor = scaleFactor
  }

  create({ text, fontFamily, fontSize, fontWeight, color: fill }: TextIcon) {
    const key = `${text}-${fontFamily}-${fontSize}-${fontWeight}-${fill}`

    if (this.cache[key] === undefined) {
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
  offset?: Partial<IPointData>
}

export class ImageIconTexture extends IconTexture {
  create({ url }: ImageIcon) {
    if (this.cache[url] === undefined) {
      this.cache[url] = Sprite.from(url).texture
    }

    return this.cache[url]
  }
}

export type TrellisIcon = TextIcon | ImageIcon
