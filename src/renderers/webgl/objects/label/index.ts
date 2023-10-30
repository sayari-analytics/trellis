import { BitmapText, Container, Text, TextStyleAlign } from 'pixi.js'
import { LabelPosition, LabelStyle, Stroke, equals } from '../../../..'
import { StyleWithDefaults, LabelAnchor } from './utils'
import * as utils from './utils'

/**
 * TODO
 * - add support for background color
 * - moving/scaling labels is slow. render ASCII text characters as sprites to partical container?
 */
export class Label {
  mounted = false

  private container: Container
  private text: BitmapText | Text
  private label: string
  private x?: number
  private y?: number
  private style: StyleWithDefaults

  constructor(container: Container, label: string, style?: LabelStyle) {
    this.container = container
    this.label = label
    this.style = utils.mergeDefaults(style)
    if (utils.renderAsBitmapText(label, this.style)) {
      this.text = new BitmapText(label, utils.getBitmapStyle(this.style))
    } else {
      this.text = new Text(label, utils.getTextStyle(this.style))
    }
    this.position = this.style.position
  }

  update(label: string, anchor: LabelAnchor, style?: LabelStyle) {
    this.value = label

    if (this.text instanceof BitmapText ? !utils.renderAsBitmapText(label, style) : utils.renderAsBitmapText(label, style)) {
      this.transformText()
    }

    this.coordinates = anchor
    this.color = style?.color
    this.maxWidth = style?.maxWidth
    this.fontFamily = style?.fontFamily
    this.position = style?.position ?? utils.DEFAULT_ORIENTATION
    this.fontSize = style?.fontSize ?? utils.DEFAULT_FONT_SIZE
    this.stroke = style?.stroke ?? utils.DEFAULT_STROKE
    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChild(this.text)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.text)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.text.destroy()

    return undefined
  }

  private transformText() {
    if (this.text instanceof BitmapText) {
      const isMounted = this.mounted
      this.delete()
      this.text = new Text(this.label, utils.getTextStyle(this.style))
      this.position = this.style.position
      this.x = undefined
      this.y = undefined
      if (isMounted) {
        this.mount()
      }
    } else {
      const isMounted = this.mounted
      this.delete()
      this.text = new BitmapText(this.label, utils.getBitmapStyle(this.style))
      this.position = this.style.position
      this.x = undefined
      this.y = undefined
      if (isMounted) {
        this.mount()
      }
    }
  }

  private set value(label: string) {
    if (label !== this.label) {
      this.text.text = label
      this.label = label
    }
  }

  private set coordinates(anchor: LabelAnchor) {
    const [x, y] = utils.getLabelCoordinates(anchor, this.text instanceof BitmapText, this.style.position)

    if (x !== this.x) {
      this.text.x = x
      this.x = x
    }
    if (y !== this.y) {
      this.text.y = y
      this.y = y
    }
  }

  private set position(position: LabelPosition) {
    if (position !== this.style.position) {
      this.style.position = position
      this.align = utils.getPositionAlign(position)
    }
    this.text.anchor.set(...utils.getPositionAnchor(position))
  }

  private set align(align: TextStyleAlign) {
    if (this.text instanceof BitmapText) {
      this.text.align = align
    } else {
      this.text.style.align = align
    }
  }

  private set fontSize(fontSize: number) {
    if (fontSize !== this.style.fontSize) {
      this.style.fontSize = fontSize
      if (this.text instanceof BitmapText) {
        this.text.fontSize = fontSize
      } else {
        this.text.style.fontSize = fontSize
      }
    }
  }

  private set maxWidth(maxWidth: number | undefined) {
    if (maxWidth !== this.style.maxWidth) {
      this.style.maxWidth = maxWidth
      if (this.text instanceof BitmapText) {
        this.text.maxWidth = maxWidth ?? 0
      } else {
        this.text.style.wordWrap = maxWidth !== undefined
        this.text.style.wordWrapWidth = maxWidth ?? 0
      }
    }
  }

  private set color(color: string | undefined) {
    if (color !== this.style.color) {
      this.style.color = color
      if (this.text instanceof Text) {
        this.text.style.fill = color ?? utils.DEFAULT_COLOR
      }
    }
  }

  private set stroke(stroke: Stroke) {
    if (!equals(stroke, this.style.stroke)) {
      this.style.stroke = stroke
      if (this.text instanceof Text) {
        this.text.style.stroke = stroke.color
        this.text.style.strokeThickness = stroke.width
      }
    }
  }

  private set fontFamily(fontFamily: string | string[] | undefined) {
    if (!equals(fontFamily, this.style.fontFamily)) {
      this.style.fontFamily = fontFamily
      if (this.text instanceof Text) {
        this.text.style.fontFamily = fontFamily ?? utils.DEFAULT_FONT_FAMILY
      }
    }
  }
}
