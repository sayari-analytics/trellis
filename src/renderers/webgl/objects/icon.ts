import { TextIconTexture, ImageIconTexture, TextIcon, ImageIcon } from '../textures/icons'
import { Container, Sprite, Texture, RenderTexture } from 'pixi.js'
import { NodeFill } from './nodeFill'
import * as Trellis from '../../../'

export type NodeIcon = TextIcon | ImageIcon

export class Icon {
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

  static async init(
    container: Container,
    textIconTexture: TextIconTexture,
    imageIconTexture: ImageIconTexture,
    nodeFill: NodeFill,
    style: NodeIcon
  ) {
    let texture: Texture | RenderTexture | null

    if (style.type === 'imageIcon') {
      texture = await imageIconTexture.create(style)
    } else {
      texture = await textIconTexture.create(style)
    }

    if (texture !== null) {
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
    this.icon = this.create(texture)
  }

  async update(style: NodeIcon) {
    if (!Trellis.equals(this.style, style)) {
      let texture: Texture | RenderTexture | null
      if (style.type === 'imageIcon') {
        texture = await this.imageIconTexture.create(style)
      } else {
        texture = await this.textIconTexture.create(style)
      }

      if (texture !== null) {
        this.texture = texture
        const isMounted = this.mounted

        this.delete()
        this.style = style
        this.icon = this.create(texture)

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

  private create(texture: Texture | RenderTexture) {
    const icon = new Sprite(texture)
    const scale = this.style.type === 'imageIcon' ? this.style.scale : 1 / this.textIconTexture.scaleFactor
    icon.scale.set(scale ?? 1)
    icon.anchor.set(0.5)
    icon.x = this.x ?? 0
    icon.y = this.y ?? 0
    return icon
  }
}
