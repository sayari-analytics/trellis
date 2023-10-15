import { Container, Sprite } from 'pixi.js'
import { NodeFill } from './nodeFill'
import { TextIconTexture } from '../textures/textIcon'
import * as Graph from '../../..'

// TODO - support image icons
export class Icon {
  mounted = false

  private container: Container
  private textIconTexture: TextIconTexture
  private nodeFill: NodeFill
  private style: Graph.TextIcon | Graph.ImageIcon
  private icon: Sprite

  constructor(container: Container, textIconTexture: TextIconTexture, nodeFill: NodeFill, style: Graph.TextIcon | Graph.ImageIcon) {
    this.container = container
    this.textIconTexture = textIconTexture
    this.nodeFill = nodeFill

    this.icon = this.createIcon(style)
    this.style = style
  }

  update(x: number, y: number, style: Graph.TextIcon | Graph.ImageIcon) {
    if (!Graph.equals(this.style, style)) {
      const isMounted = this.mounted
      this.delete()
      this.icon = this.createIcon(style)
      if (isMounted) {
        this.mount()
      }
      this.style = style
    }

    this.icon.x = this.style.offsetX ?? 0 + x
    this.icon.y = this.style.offsetY ?? 0 + y

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

  private createIcon(style: Graph.TextIcon | Graph.ImageIcon): Sprite {
    let icon: Sprite

    if (style.type === 'textIcon') {
      icon = new Sprite(this.textIconTexture.create(style.text, style.family, style.size, style.weight ?? 'normal', style.color))
      icon.anchor.set(0.5)
      icon.scale.set(1 / this.textIconTexture.scaleFactor)
    } else if (style.type === 'imageIcon') {
      // TODO
      icon = new Sprite(this.textIconTexture.create('?', 'sans-serif', 12, 'normal', 0x000000))
      icon.anchor.set(0.5)
    } else {
      icon = new Sprite(this.textIconTexture.create('?', 'sans-serif', 12, 'normal', 0x000000))
      icon.anchor.set(0.5)
    }

    return icon
  }
}
