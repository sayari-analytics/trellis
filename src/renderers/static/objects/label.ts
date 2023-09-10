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
  private display: BitmapText
  private style?: LabelStyle
  
  constructor(renderer: StaticRenderer, text: string, style?: LabelStyle) {
    this.renderer = renderer
    this.display = new BitmapText(text, { fontName: 'Label' })
    this.update(text, style)
  }

  update(text: string, style?: LabelStyle) {
    this.display.text = text

    if (style !== this.style) {
      this.display.fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE
  
      switch (style?.orientation ?? DEFAULT_ORIENTATION) {
      case 'bottom':
        this.display.align = 'center'
        this.display.anchor.set(0.5, 0)
        break
      case 'left':
        this.display.align = 'left'
        this.display.anchor.set(1, 0.5)
        break
      case 'top':
        this.display.align = 'center'
        this.display.anchor.set(0.5, 1)
        break
      case 'right':
        this.display.align = 'right'
        this.display.anchor.set(0, 0.5)
        break
      }

      this.style = style
    }

    return this
  }

  position(x: number, y: number) {
    this.display.x = x
    this.display.y = y
    return this
  }

  mount() {
    if (!this.mounted) {
      this.renderer.labelsContainer.addChild(this.display)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.renderer.labelsContainer.removeChild(this.display)
      this.mounted = false
    }

    return this
  }

  delete() {
    if (this.mounted) {
      this.unmount()
    }

    this.display.destroy({ children: true })

    return undefined
  }
}
