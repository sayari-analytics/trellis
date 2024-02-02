import { Container, Sprite, Texture, RenderTexture } from 'pixi.js'
import { IconStyle } from './../../../types'
import { Subscription } from '../abstracts/PubSub'
import { equals } from '../../../utils'
import TextStyleTexture from '../text/TextStyleTexture'
import TextIconCache from './TextIconCache'
import RenderObject from '../../RenderObject'
import AssetLoader from '../assets/AssetLoader'
import FontBook from '../assets/FontBook'

export default class Icon extends RenderObject<Sprite> {
  protected object: Sprite
  protected subscription: Subscription | undefined

  constructor(
    container: Container,
    private fontBook: FontBook,
    private textIconCache: TextIconCache,
    private assets: AssetLoader,
    // private fill: RenderObject, // TODO
    private fill: { getContainerIndex: () => number },
    private style: IconStyle
  ) {
    super(container)
    this.textIconCache = textIconCache
    this.assets = assets
    this.fill = fill
    this.style = style
    this.object = this.create(this.getIconTexture())
  }

  update(style: IconStyle) {
    if (!equals(this.style, style)) {
      this.style = style
      this.transform(this.getIconTexture())
    }

    return this
  }

  override mount() {
    return super.mount(this.fill.getContainerIndex() + 1)
  }

  override moveTo(x: number, y: number) {
    return super.moveTo(x + this.offsetX, y + this.offsetY)
  }

  override delete() {
    this.subscription?.unsubscribe()
    return super.delete()
  }

  private getIconTexture() {
    switch (this.style.type) {
      case 'imageIcon': {
        const { url } = this.style

        if (this.assets.available(url)) {
          return this.assets.get(url)
        } else {
          this.subscription = this.assets.load(url, (texture) => {
            this.transform(texture)
            this.subscription = undefined
          })

          return Texture.EMPTY
        }
      }
      case 'textIcon': {
        const { content, type: _, offset: __, ...textStyle } = this.style

        const style = new TextStyleTexture(textStyle)

        const { fontFamily, fontWeight } = style.current
        if (!this.fontBook.available(fontFamily, fontWeight)) {
          style.fontLoading = true

          this.subscription = this.fontBook.loadFontFamily(
            fontFamily,
            fontWeight,
            () => {
              style.fontLoading = false
              this.transform(this.textIconCache.createTextIcon(content, style))
              this.subscription = undefined
            },
            5000
          )
        }

        return this.textIconCache.createTextIcon(content, style)
      }
    }
  }

  private create(texture: Texture | RenderTexture) {
    const icon = new Sprite(texture)
    icon.scale.set(this.scale)
    icon.anchor.set(0.5)
    icon.x = this.x
    icon.y = this.y
    return icon
  }

  private transform(texture: Texture | RenderTexture) {
    const isMounted = this.mounted

    this.delete()
    this.object = this.create(texture)

    if (isMounted) {
      this.mount()
    }
  }

  private get offsetX() {
    return this.style.offset?.x ?? 0
  }

  private get offsetY() {
    return this.style.offset?.y ?? 0
  }

  private get scale() {
    if (this.style.type === 'imageIcon') {
      return this.style.scale ?? 1
    } else {
      return 1 / this.textIconCache.scaleFactor
    }
  }
}
