import { Container, Sprite } from 'pixi.js'
import { IRendererObject } from '.'
import { TextTexture } from '../textures/textTexture'
import { TextIcon as _TextIcon } from '../../../types'

export class TextIcon implements IRendererObject {
  private sprite?: Sprite
  private icon?: _TextIcon
  private offsetX?: number
  private offsetY?: number

  constructor(
    private container: Container,
    private textTexture: TextTexture
  ) {}

  style(icon: _TextIcon) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: this.textTexture.getTexture(
          icon.content,
          icon.style?.color,
          icon.style?.fontSize,
          icon.style?.fontFamily,
          icon.style?.fontWeight,
          icon.style?.stroke?.color,
          icon.style?.stroke?.width
        ),
        anchor: 0.5
      })
      this.container.addChild(this.sprite)
    } else {
      if (icon.content !== this.icon?.content || icon.style !== this.icon?.style) {
        this.sprite.texture = this.textTexture.getTexture(
          icon.content,
          icon.style?.color,
          icon.style?.fontSize,
          icon.style?.fontFamily,
          icon.style?.fontWeight,
          icon.style?.stroke?.color,
          icon.style?.stroke?.width
        )
      }
    }

    this.sprite.scale = (icon.scale ?? 1) * (1 / this.textTexture.scaleFactor)
    this.offsetX = icon.offset?.x ?? 0
    this.offsetY = icon.offset?.y ?? 0
    this.icon = icon

    return this
  }

  position(x: number, y: number) {
    if (this.sprite) {
      this.sprite.x = x + this.offsetX!
      this.sprite.y = y + this.offsetY!
    }

    return this
  }

  exit() {
    if (this.sprite) {
      this.container.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = undefined
    }
  }
}
