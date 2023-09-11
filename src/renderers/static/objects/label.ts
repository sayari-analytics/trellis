import { BitmapText } from 'pixi.js-legacy'
import { LabelStyle } from '../../..'
import { StaticRenderer } from '..'


const DEFAULT_FONT_SIZE = 10
const DEFAULT_ORIENTATION = 'bottom'


/**
 * TODO
 * - support non-ASCII character sets via Text
 * - add support for background color, font color, font family
 */
export class Label {

  mounted = false

  private renderer: StaticRenderer
  private text: BitmapText
  private label: string
  private x?: number
  private y?: number
  private style?: LabelStyle
  
  constructor(renderer: StaticRenderer, label: string) {
    this.renderer = renderer
    this.label = label
    this.text = new BitmapText(label, { fontName: 'Label' })
  }

  update(label: string, x: number, y: number, style?: LabelStyle) {
    if (label !== this.label) {
      this.text.text = label
      this.label = label
    }

    if (x !== this.x) {
      this.text.x = x
      this.x = x
    }

    if (y !== this.y) {
      this.text.y = y
      this.y = y
    }

    if (style !== this.style) {
      this.text.fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE
  
      switch (style?.orientation ?? DEFAULT_ORIENTATION) {
      case 'bottom':
        this.text.align = 'center'
        this.text.anchor.set(0.5, 0)
        break
      case 'left':
        this.text.align = 'left'
        this.text.anchor.set(1, 0.5)
        break
      case 'top':
        this.text.align = 'center'
        this.text.anchor.set(0.5, 1)
        break
      case 'right':
        this.text.align = 'right'
        this.text.anchor.set(0, 0.5)
        break
      }

      this.style = style
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.renderer.labelsContainer.addChild(this.text)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.renderer.labelsContainer.removeChild(this.text)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.text.destroy()

    return undefined
  }
}
