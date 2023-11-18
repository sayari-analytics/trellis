import { Container, Sprite, Texture, RenderTexture } from 'pixi.js'
import { TextIconTexture, ImageIconTexture } from '@/webgl/textures/icons'
import { NodeIcon, RenderObject } from '@/types'
import { NodeFill } from './fill'
import { equals } from '@/utils'

export class Icon implements RenderObject {
  mounted = false

  private x?: number
  private y?: number
  private container: Container
  private texture: Texture | RenderTexture
  private textIconTexture: TextIconTexture
  private imageIconTexture: ImageIconTexture
  private nodeFill: NodeFill
  private style: NodeIcon
  private icon: Sprite

  private static async createTexture(style: NodeIcon, imageIconTexture: ImageIconTexture, textIconTexture: TextIconTexture) {
    if (style.type === 'imageIcon') {
      return await imageIconTexture.create(style)
    } else {
      return await textIconTexture.create(style)
    }
  }

  static async init(
    container: Container,
    textIconTexture: TextIconTexture,
    imageIconTexture: ImageIconTexture,
    nodeFill: NodeFill,
    style: NodeIcon
  ) {
    const texture = await Icon.createTexture(style, imageIconTexture, textIconTexture)

    if (texture) {
      return new Icon(texture, container, textIconTexture, imageIconTexture, nodeFill, style)
    }
  }

  private constructor(
    texture: Texture | RenderTexture,
    container: Container,
    textIconTexture: TextIconTexture,
    imageIconTexture: ImageIconTexture,
    nodeFill: NodeFill,
    style: NodeIcon
  ) {
    this.style = style
    this.texture = texture
    this.container = container
    this.textIconTexture = textIconTexture
    this.imageIconTexture = imageIconTexture
    this.nodeFill = nodeFill
    this.icon = this.create()
  }

  async update(style: NodeIcon) {
    if (!equals(this.style, style)) {
      const texture = await Icon.createTexture(style, this.imageIconTexture, this.textIconTexture)

      if (texture) {
        const isMounted = this.mounted
        this.delete()
        this.style = style
        this.texture = texture
        this.icon = this.create()

        if (isMounted) {
          this.mount()
        }
      }
    }

    return this
  }

  moveTo(_x: number, _y: number) {
    const x = _x + (this.style.offset?.x ?? 0)
    const y = _y + (this.style.offset?.y ?? 0)

    if (x !== this.x) {
      this.x = x
      this.icon.x = x
    }

    if (y !== this.y) {
      this.y = y
      this.icon.y = y
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChildAt(this.icon, this.nodeFill.getContainerIndex() + 1)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.icon)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.icon.destroy()

    return undefined
  }

  private create() {
    const icon = new Sprite(this.texture)
    const scale = this.style.type === 'imageIcon' ? this.style.scale ?? 1 : 1 / this.textIconTexture.scaleFactor
    icon.scale.set(scale)
    icon.anchor.set(0.5)
    icon.x = this.x ?? 0
    icon.y = this.y ?? 0
    return icon
  }
}
