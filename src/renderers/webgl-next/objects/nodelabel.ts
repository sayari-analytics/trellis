import { BitmapText, Container, Text } from 'pixi.js'
import { isASCII } from '../utils'
import { NodeLabelStyle } from '../../../types'
import { DEFAULT_TEXT_STYLE } from '../../../utils/constants'

export class NodeLabel {
  scaleFactor: number
  mounted = false

  private text?: BitmapText | Text
  private style?: NodeLabelStyle

  constructor(
    private container: Container,
    maxZoom: number
  ) {
    this.scaleFactor = maxZoom
  }

  update(x: number, y: number, label: string, style: NodeLabelStyle | undefined, nodeRadius: number) {
    if (this.text === undefined) {
      this.text = isASCII(label)
        ? new BitmapText({ text: label, scale: 1 / this.scaleFactor })
        : new Text({ text: label, scale: 1 / this.scaleFactor })

      this.setTextStyle(style)

      const [offsetX, offsetY] = this.getTextOffset(
        style?.position ?? DEFAULT_TEXT_STYLE.position,
        style?.margin ?? DEFAULT_TEXT_STYLE.margin,
        nodeRadius
      )
      this.text!.x = x + offsetX
      this.text!.y = y + offsetY

      this.mount()
    } else {
      if (isASCII(label)) {
        if (this.text instanceof Text) {
          this.exit()
          this.text = new BitmapText({ text: label, scale: 1 / this.scaleFactor })
          this.mount()
        }
      } else if (this.text instanceof BitmapText) {
        this.exit()
        this.text = new Text({ text: label, scale: 1 / this.scaleFactor })
        this.mount()
      }

      if (this.style !== style) {
        this.setTextStyle(style)
      }

      const [offsetX, offsetY] = this.getTextOffset(
        style?.position ?? DEFAULT_TEXT_STYLE.position,
        style?.margin ?? DEFAULT_TEXT_STYLE.margin,
        nodeRadius
      )

      this.text!.x = x + offsetX
      this.text!.y = y + offsetY
    }

    this.style = style
  }

  mount() {
    if (!this.mounted && this.text !== undefined) {
      this.container.addChild(this.text)
      this.mounted = true
    }
  }

  unmount() {
    if (this.mounted && this.text !== undefined) {
      this.container.removeChild(this.text)
      this.mounted = false
    }
  }

  exit() {
    if (this.text) {
      this.unmount()
      this.text.destroy()
      this.text = undefined
    }
  }

  private setTextStyle(style?: NodeLabelStyle) {
    this.text!.style.fill = style?.color ?? DEFAULT_TEXT_STYLE.color
    this.text!.style.fontSize = (style?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * this.scaleFactor
    this.text!.style.fontFamily = 'sans-serif' // TODO - wait until fontFamily is loaded and use user-supplied font
    this.text!.style.fontWeight = style?.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight
    this.text!.style.letterSpacing = DEFAULT_TEXT_STYLE.letterSpacing

    if (style?.stroke !== undefined) {
      this.text!.style.stroke = {
        color: style?.stroke.color,
        width: style?.stroke.width * this.scaleFactor
      }
    } else {
      this.text!.style.stroke = undefined as any // Pixi typing bug
    }

    switch (style?.position ?? DEFAULT_TEXT_STYLE.position) {
      case 'bottom': {
        this.text!.style.align = 'center'
        this.text!.anchor.set(0.5, 0)
        break
      }
      case 'top': {
        this.text!.style.align = 'center'
        this.text!.anchor.set(0.5, 1)
        break
      }
      case 'left': {
        this.text!.style.align = 'right'
        this.text!.anchor.set(1, 0.5)
        break
      }
      case 'right': {
        this.text!.style.align = 'left'
        this.text!.anchor.set(0, 0.5)
        break
      }
    }
  }

  private getTextOffset(position: 'bottom' | 'left' | 'top' | 'right', margin: number, nodeRadius: number) {
    switch (position) {
      case 'bottom': {
        return [0, nodeRadius + margin]
      }
      case 'top': {
        return [0, -nodeRadius - margin]
      }
      case 'left': {
        return [-nodeRadius - margin, 0]
      }
      case 'right': {
        return [nodeRadius + margin, 0]
      }
    }
  }
}
