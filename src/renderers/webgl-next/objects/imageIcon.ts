import { Container, Sprite, Texture } from 'pixi.js'
import { ImageTexture } from '../textures/imageTexture'
import { ImageIcon as _ImageIcon } from '../../../types'

export class ImageIcon {
  private sprite?: Sprite
  private icon?: _ImageIcon
  private cancelTextureLoad?: () => void

  constructor(
    private container: Container,
    private imageTexture: ImageTexture
  ) {}

  update(x: number, y: number, icon: _ImageIcon) {
    if (this.sprite === undefined) {
      this.sprite = new Sprite({
        texture: Texture.EMPTY,
        anchor: 0.5
      })
      this.container.addChild(this.sprite)
      this.cancelTextureLoad?.()
      this.cancelTextureLoad = this.imageTexture.getTexture(icon.url, (texture) => {
        this.sprite!.texture = texture
      })
      this.sprite.scale = (icon.scale ?? 1) * (1 / this.imageTexture.scaleFactor)
      this.sprite.x = x + (icon.offset?.x ?? 0)
      this.sprite.y = y + (icon.offset?.y ?? 0)
    } else {
      if (icon.url !== this.icon?.url) {
        this.cancelTextureLoad?.()
        this.cancelTextureLoad = this.imageTexture.getTexture(icon.url, (texture) => {
          if (this.sprite) this.sprite.texture = texture
        })
      }
      this.sprite.scale = (icon.scale ?? 1) * (1 / this.imageTexture.scaleFactor)
      this.sprite!.x = x + (icon.offset?.x ?? 0)
      this.sprite!.y = y + (icon.offset?.y ?? 0)
    }

    this.icon = icon
  }

  exit() {
    this.cancelTextureLoad?.()
    if (this.sprite) {
      this.container.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = undefined
    }
  }
}
