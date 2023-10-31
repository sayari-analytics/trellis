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
  private dirty = false

  constructor(container: Container, label: string, labelStyle?: LabelStyle) {
    this.container = container
    this.label = label
    const style = utils.mergeDefaults(labelStyle)
    const textStyle = utils.getTextStyle(style)
    if (utils.isASCII(label)) {
      utils.loadFont(style)
      this.text = new BitmapText(label, utils.getBitmapStyle(style))
    } else {
      this.text = new Text(label, textStyle)
    }
    this.style = style
    this.text.anchor.set(...utils.getPositionAnchor(style.position))
  }

  update(label: string, anchor: LabelAnchor, style?: LabelStyle) {
    this.value = label
    const isBitmapText = this.isBitmapText()
    const isASCII = utils.isASCII(label)

    if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
      this.transformText()
    }

    this.coordinates = anchor
    this.maxWidth = style?.maxWidth
    this.color = style?.color ?? utils.DEFAULT_COLOR
    this.position = style?.position ?? utils.DEFAULT_ORIENTATION
    this.fontSize = style?.fontSize ?? utils.DEFAULT_FONT_SIZE
    this.stroke = style?.stroke ?? utils.DEFAULT_STROKE
    this.fontFamily = style?.fontFamily ?? utils.DEFAULT_FONT_FAMILY
    this.fontName = style?.fontName ?? utils.DEFAULT_FONT_NAME

    if (this.dirty) {
      this.dirty = false
      if (this.isBitmapText(this.text)) {
        utils.loadFont(this.style)
        this.text.updateText()
      } else {
        this.text.updateText(true)
      }
    }

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

  private isBitmapText(text: Text | BitmapText = this.text): text is BitmapText {
    return text instanceof BitmapText
  }

  private transformText() {
    if (this.isBitmapText()) {
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
      utils.loadFont(this.style)
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
    this.align = utils.getPositionAlign(position)
    this.text.anchor.set(...utils.getPositionAnchor(position))
    if (position !== this.style.position) {
      this.dirty = true
      this.style.position = position
    }
  }

  private set align(align: TextStyleAlign) {
    if (this.isBitmapText(this.text)) {
      this.text.align = align
    } else {
      this.text.style.align = align
    }
  }

  private set fontSize(fontSize: number) {
    if (fontSize !== this.style.fontSize) {
      this.dirty = true
      this.style.fontSize = fontSize
      if (this.isBitmapText(this.text)) {
        this.text.fontSize = fontSize
      } else {
        this.text.style.fontSize = fontSize
      }
    }
  }

  private set maxWidth(maxWidth: number | undefined) {
    if (maxWidth !== this.style.maxWidth) {
      this.dirty = true
      this.style.maxWidth = maxWidth
      if (this.isBitmapText(this.text)) {
        this.text.maxWidth = maxWidth ?? 0
      } else {
        this.text.style.wordWrap = maxWidth !== undefined
        this.text.style.wordWrapWidth = maxWidth ?? 0
      }
    }
  }

  private set color(color: string) {
    if (color !== this.style.color) {
      this.style.color = color
      if (!this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.fill = color
      }
    }
  }

  private set stroke(stroke: Stroke) {
    if (!equals(stroke, this.style.stroke)) {
      this.style.stroke = stroke
      if (!this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.stroke = stroke.color
        this.text.style.strokeThickness = stroke.width
      }
    }
  }

  private set fontFamily(fontFamily: string | string[]) {
    if (!equals(fontFamily, this.style.fontFamily)) {
      this.style.fontFamily = fontFamily
      if (!this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.fontFamily = fontFamily
      }
    }
  }

  private set fontName(fontName: string) {
    if (fontName !== this.style.fontName) {
      this.style.fontName = fontName
      if (this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.fontName = fontName
      }
    }
  }
}
