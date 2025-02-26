import { Container, Sprite } from 'pixi.js'
import { TextTexture } from '../textures/textTexture'
import { TextIcon as _TextIcon } from '../../../types'

export class TextIcon {
  private sprite?: Sprite
  private icon?: _TextIcon

  constructor(
    private container: Container,
    private textTexture: TextTexture
  ) {}

  update(x: number, y: number, icon: _TextIcon) {
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
      this.sprite.scale = (icon.scale ?? 1) * (1 / this.textTexture.scaleFactor)
      this.sprite.x = x + (icon.offset?.x ?? 0)
      this.sprite.y = y + (icon.offset?.y ?? 0)
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
      this.sprite.scale = (icon.scale ?? 1) * (1 / this.textTexture.scaleFactor)
      this.sprite.x = x + (icon.offset?.x ?? 0)
      this.sprite.y = y + (icon.offset?.y ?? 0)
    }

    this.icon = icon
  }

  exit() {
    if (this.sprite) {
      this.container.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = undefined
    }
  }
}
