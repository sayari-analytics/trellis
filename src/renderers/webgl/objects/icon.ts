import { TextIconTexture, ImageIconTexture, TrellisIcon, TextIcon, ImageIcon } from '../textures/icons'
import { Container, Sprite } from 'pixi.js'
import { NodeFill } from './nodeFill'
import * as Trellis from '../../../'

export class Icon {
  mounted = false

  private x?: number
  private y?: number
  private container: Container
  private textIconTexture: TextIconTexture
  private imageIconTexture: ImageIconTexture
  private nodeFill: NodeFill
  private style: TrellisIcon
  private icon: Sprite

  constructor(
    container: Container,
    textIconTexture: TextIconTexture,
    imageIconTexture: ImageIconTexture,
    nodeFill: NodeFill,
    style: TrellisIcon
  ) {
    this.container = container
    this.textIconTexture = textIconTexture
    this.imageIconTexture = imageIconTexture
    this.nodeFill = nodeFill
    this.icon = this.create(style)
    this.style = style
  }

  update(style: TrellisIcon) {
    if (!Trellis.equals(this.style, style)) {
      const isMounted = this.mounted

      this.delete()
      this.style = style
      this.icon = this.create(style)

      if (isMounted) {
        this.mount()
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

  private create(style: TrellisIcon) {
    const icon = style.type === 'textIcon' ? this.createTextIcon(style) : this.createImageIcon(style)
    icon.anchor.set(0.5)
    icon.x = this.x ?? 0
    icon.y = this.y ?? 0
    return icon
  }

  private createTextIcon(style: TextIcon) {
    const icon = new Sprite(this.textIconTexture.create(style))
    icon.scale.set(1 / this.textIconTexture.scaleFactor)
    return icon
  }

  private createImageIcon(style: ImageIcon) {
    const icon = new Sprite(this.imageIconTexture.create(style))
    icon.scale.set(style.scale ?? 1)
    return icon
  }
}
