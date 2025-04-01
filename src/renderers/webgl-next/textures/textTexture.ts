import { Application, Matrix, RenderTexture, Text, Texture } from 'pixi.js'
import { ITexture } from '.'
import { DEFAULT_TEXT_STYLE } from '../../../utils/constants'
import { Color, FontWeight } from '../../..'

export class TextTexture implements ITexture {
  scaleFactor: number
  private textures: Record<string, Texture> = {}

  constructor(
    private app: Application,
    maxZoom: number,
    private resolution: number
  ) {
    this.scaleFactor = maxZoom
  }

  getTexture(
    text: string,
    color: Color = DEFAULT_TEXT_STYLE.color,
    fontSize: number = DEFAULT_TEXT_STYLE.fontSize,
    fontFamily: string = DEFAULT_TEXT_STYLE.fontFamily,
    fontWeight: FontWeight = DEFAULT_TEXT_STYLE.fontWeight,
    strokeColor?: Color,
    strokeWidth?: number
  ) {
    const key = `${text}:${color}:${fontSize}:${fontFamily}:${fontWeight}:${strokeColor ?? ''}:${strokeWidth ?? ''}`

    if (this.textures[key] === undefined) {
      const textContainer = new Text({
        text,
        style: {
          align: 'center',
          fill: color,
          fontSize: fontSize * this.scaleFactor,
          fontFamily: 'sans-serif', // TODO - wait until fontFamily is loaded and use user-supplied font
          fontWeight: fontWeight,
          stroke: strokeColor && strokeWidth ? { color: strokeColor, width: strokeWidth } : undefined,
          letterSpacing: DEFAULT_TEXT_STYLE.letterSpacing
        }
      })

      const texture = RenderTexture.create({
        width: textContainer.width,
        height: textContainer.height,
        resolution: this.resolution
      })

      this.app.renderer.render({
        container: textContainer,
        target: texture,
        transform: new Matrix(1, 0, 0, 1, 0, 0)
      })

      textContainer.destroy()
      this.textures[key] = texture
    }

    return this.textures[key]
  }

  delete() {
    for (const id in this.textures) {
      this.textures[id].destroy()
    }
  }
}
