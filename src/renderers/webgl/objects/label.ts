import { BitmapText, Text, TextStyle, TextStyleAlign } from 'pixi.js'
import { Renderer } from '..'
import { isASCII } from '../utils'
import { LabelPosition, LabelStyle } from '../../..'

const DEFAULT_FONT_SIZE = 10
const DEFAULT_ORIENTATION = 'bottom'
const TEXT_OUTLINE_STYLE: Partial<TextStyle> = { lineJoin: 'round', stroke: '#fff', strokeThickness: 2 }

/**
 * TODO
 * - add support for background color, font color, font family
 * - moving/scaling labels is slow. render ASCII text characters as sprites to partical container?
 */
export class Label {
  mounted = false

  private renderer: Renderer
  private text: BitmapText | Text
  private label: string
  private x?: number
  private y?: number
  private fontSize?: number
  private position?: LabelPosition

  constructor(renderer: Renderer, label: string) {
    this.renderer = renderer
    this.label = label
    this.text = isASCII(label) ? new BitmapText(label, { fontName: 'Label' }) : new Text(label, TEXT_OUTLINE_STYLE)
  }

  update(label: string, x: number, y: number, style?: LabelStyle) {
    if (label !== this.label) {
      this.setText(label)
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

    const fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE

    if (fontSize !== this.fontSize) {
      this.setFontSize(fontSize)
      this.fontSize = fontSize
    }

    const position = style?.position ?? DEFAULT_ORIENTATION

    if (position !== this.position) {
      switch (style?.position ?? DEFAULT_ORIENTATION) {
        case 'bottom':
          this.setAlign('center')
          this.text.anchor.set(0.5, 0)
          break
        case 'left':
          this.setAlign('left')
          this.text.anchor.set(1, 0.5)
          break
        case 'top':
          this.setAlign('center')
          this.text.anchor.set(0.5, 1)
          break
        case 'right':
          this.setAlign('right')
          this.text.anchor.set(0, 0.5)
          break
      }

      this.position = position
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

  private setText(label: string) {
    if (this.text instanceof BitmapText) {
      if (isASCII(label)) {
        this.text.text = label
      } else {
        const isMounted = this.mounted
        this.text.destroy()
        if (isMounted) {
          this.unmount()
        }
        this.text = new Text(label, TEXT_OUTLINE_STYLE)
        this.fontSize = undefined
        this.position = undefined
        this.x = undefined
        this.y = undefined
        if (isMounted) {
          this.mount()
        }
      }
    } else {
      if (isASCII(label)) {
        const isMounted = this.mounted
        this.text.destroy()
        if (isMounted) {
          this.unmount()
        }
        this.text = new BitmapText(label, { fontName: 'Label' })
        this.fontSize = undefined
        this.position = undefined
        this.x = undefined
        this.y = undefined
        if (isMounted) {
          this.mount()
        }
      } else {
        this.text.text = label
      }
    }

    this.label = label
  }

  private setFontSize(fontSize: number) {
    if (this.text instanceof BitmapText) {
      this.text.fontSize = fontSize
    } else {
      this.text.style.fontSize = fontSize
    }
  }

  private setAlign(align: TextStyleAlign) {
    if (this.text instanceof BitmapText) {
      this.text.align = align
    } else {
      this.text.style.align = align
    }
  }
}
