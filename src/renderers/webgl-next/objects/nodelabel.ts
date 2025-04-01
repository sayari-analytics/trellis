import { BitmapText, Container, Text } from 'pixi.js'
import { IRendererObject } from '.'
import { isASCII } from '../utils'
import { LabelPosition, NodeLabelStyle } from '../../..'
import { DEFAULT_TEXT_STYLE } from '../../../utils/constants'

export class NodeLabel implements IRendererObject {
  scaleFactor: number

  private text?: BitmapText | Text
  private labelStyle?: NodeLabelStyle
  private labelPosition?: LabelPosition
  private labelMargin?: number
  private nodeRadius?: number
  private offsetX?: number
  private offsetY?: number

  constructor(
    private container: Container,
    maxZoom: number
  ) {
    this.scaleFactor = maxZoom
  }

  style(label: string, labelStyle: NodeLabelStyle | undefined, nodeRadius: number) {
    if (this.text === undefined) {
      this.text = isASCII(label)
        ? new BitmapText({ text: label, scale: 1 / this.scaleFactor })
        : new Text({ text: label, scale: 1 / this.scaleFactor })
      this.container.addChild(this.text)
    } else {
      if (isASCII(label)) {
        if (this.text instanceof Text) {
          this.exit()
          this.text = new BitmapText({ text: label, scale: 1 / this.scaleFactor })
          this.container.addChild(this.text)
        }
      } else if (this.text instanceof BitmapText) {
        this.exit()
        this.text = new Text({ text: label, scale: 1 / this.scaleFactor })
        this.container.addChild(this.text)
      }
    }

    if (labelStyle !== this.labelStyle) {
      this.labelStyle = labelStyle
      this.text!.style.fill = this.labelStyle?.color ?? DEFAULT_TEXT_STYLE.color
      this.text!.style.fontSize = (this.labelStyle?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * this.scaleFactor
      this.text!.style.fontFamily = 'sans-serif' // TODO - wait until fontFamily is loaded and use user-supplied font
      this.text!.style.fontWeight = this.labelStyle?.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight
      this.text!.style.letterSpacing = DEFAULT_TEXT_STYLE.letterSpacing

      if (this.labelStyle?.stroke !== undefined) {
        this.text!.style.stroke = {
          color: this.labelStyle?.stroke.color,
          width: this.labelStyle?.stroke.width * this.scaleFactor
        }
      } else {
        this.text!.style.stroke = undefined as any // Pixi typing bug
      }

      switch (this.labelStyle?.position ?? DEFAULT_TEXT_STYLE.position) {
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

    const labelPosition = labelStyle?.position ?? DEFAULT_TEXT_STYLE.position
    const labelMargin = labelStyle?.margin ?? DEFAULT_TEXT_STYLE.margin
    if (labelPosition !== this.labelPosition || labelMargin !== this.labelMargin || nodeRadius !== this.nodeRadius) {
      this.labelPosition = labelPosition
      this.labelMargin = labelMargin
      this.nodeRadius = nodeRadius

      switch (this.labelPosition) {
        case 'bottom': {
          this.offsetX = 0
          this.offsetY = this.nodeRadius + this.labelMargin
          break
        }
        case 'top': {
          this.offsetX = 0
          this.offsetY = -this.nodeRadius - this.labelMargin
          break
        }
        case 'left': {
          this.offsetX = -this.nodeRadius - this.labelMargin
          this.offsetY = 0
          break
        }
        case 'right': {
          this.offsetX = this.nodeRadius + this.labelMargin
          this.offsetY = 0
          break
        }
      }
    }

    return this
  }

  position(x: number, y: number) {
    if (this.text) {
      this.text.x = x + this.offsetX!
      this.text.y = y + this.offsetY!
    }

    return this
  }

  exit() {
    if (this.text) {
      this.container.removeChild(this.text)
      this.text.destroy()
      this.text = undefined
    }
  }
}
