import { Container, Sprite, Texture } from 'pixi.js'
import { IconStyle, RenderObject } from '../../../types'
import { equals } from '../../../utils/api'
import AssetManager, { AssetSubscription, FontSubscription } from '../loaders/AssetManager'
import TextIconTexture from '../textures/TextIconTexture'

export default class Icon implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private object: Sprite
  private subscription?: FontSubscription | AssetSubscription

  constructor(
    private assets: AssetManager,
    private textIconTexture: TextIconTexture,
    private container: Container,
    private fill: { getContainerIndex: () => number },
    private icon: IconStyle
  ) {
    this.assets = assets
    this.textIconTexture = textIconTexture
    this.container = container
    this.fill = fill
    this.icon = icon

    if (this.icon.type === 'imageIcon' || this.assets.shouldLoadFont(this.icon.style)) {
      this.object = this.create(Texture.EMPTY)
      this.loadTexture()
    } else {
      this.object = this.create(this.textIconTexture.get(this.icon))
    }
  }

  update(icon: IconStyle) {
    if (!equals(icon, this.icon)) {
      this.cancel()
      this.icon = icon

      if (this.icon.type === 'imageIcon' || this.assets.shouldLoadFont(this.icon.style)) {
        this.loadTexture()
      } else {
        this.texture = this.textIconTexture.get(this.icon)
      }
    }

    return this
  }

  moveTo(_x: number, _y: number) {
    const x = _x + this.offsetX
    const y = _y + this.offsetY

    if (x !== this.x) {
      this.x = x
      this.object.x = x
    }

    if (y !== this.y) {
      this.y = y
      this.object.y = y
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChildAt(this.object, this.fill.getContainerIndex() + 1)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.object)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount().cancel()
    this.object.destroy()

    return undefined
  }

  cancel() {
    this.subscription?.unsubscribe()
    this.subscription = undefined

    return this
  }

  private get scale() {
    if (this.icon.type === 'textIcon') {
      return 1 / this.textIconTexture.scaleFactor
    } else {
      return this.icon.scale ?? 1
    }
  }

  private get offsetX() {
    return this.icon.offset?.x ?? 0
  }

  private get offsetY() {
    return this.icon.offset?.y ?? 0
  }

  private set texture(texture: Texture) {
    if (texture !== this.object.texture) {
      this.object.texture = texture
      this.object.scale.set(this.scale)
    }
  }

  private create(texture: Texture) {
    const icon = new Sprite(texture)
    icon.scale.set(this.scale)
    icon.anchor.set(0.5)
    icon.x = this.x
    icon.y = this.y
    return icon
  }

  private loadTexture() {
    if (this.icon.type === 'imageIcon') {
      this.subscription = this.assets.loadUrl({
        url: this.icon.url,
        resolve: (texture) => {
          this.subscription = undefined
          this.texture = texture
        }
      })
    } else if (this.assets.shouldLoadFont(this.icon.style)) {
      this.subscription = this.assets.loadFont({
        fontFamily: this.icon.style.fontFamily,
        fontWeight: this.icon.style.fontWeight,
        resolve: () => {
          this.subscription = undefined
          if (this.icon.type === 'textIcon') {
            this.texture = this.textIconTexture.get(this.icon)
          }
        }
      })
    }

    return this
  }
}
