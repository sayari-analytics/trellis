import type { StyleWithDefaults, LabelCoords, LabelPosition, LabelStyle } from './utils'
import type { Stroke } from '../../../../types'
import { BitmapText, Container, Text, TextStyleAlign } from 'pixi.js'
import { equals } from '../../../..'
import utils, { STYLE_DEFAULTS } from './utils'

/**
 * TODO
 * - add support for background color, custom font loading
 * - add support for loading custom fonts as asset bundles
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
    this.style = utils.mergeDefaults(labelStyle)

    if (utils.isASCII(label)) {
      utils.loadFont(this.style)
      this.text = new BitmapText(label, utils.getBitmapStyle(this.style))
    } else {
      this.text = new Text(label, utils.getTextStyle(this.style))
    }

    this.position = this.style.position
  }

  update(label: string, coords: LabelCoords, style?: LabelStyle) {
    this.value = label
    this.coordinates = coords
    this.wordWrap = style?.wordWrap
    this.color = style?.color
    this.stroke = style?.stroke
    this.position = style?.position ?? STYLE_DEFAULTS.POSITION
    this.fontSize = style?.fontSize ?? STYLE_DEFAULTS.FONT_SIZE
    this.fontFamily = style?.fontFamily ?? STYLE_DEFAULTS.FONT_FAMILY
    this.fontName = style?.fontName ?? STYLE_DEFAULTS.FONT_NAME

    const isBitmapText = this.isBitmapText()
    const isASCII = utils.isASCII(label)

    if (isASCII) {
      // conditionally load font if BitmapFont is unavailable
      utils.loadFont(this.style)
    }

    if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
      // if the text type has changed, regenerate a new text object
      this.dirty = false
      this.transformText()
    }

    if (this.dirty) {
      this.dirty = false
      this.updateText()
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

  private updateText() {
    if (this.isBitmapText(this.text)) {
      this.text.updateText()
    } else {
      this.text.updateText(true)
    }
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

  private set coordinates(coords: LabelCoords) {
    const [x, y] = utils.getLabelCoordinates(coords, this.text instanceof BitmapText, this.style.position)

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
    this.anchor = utils.getPositionAnchor(position)
    if (position !== this.style.position) {
      this.dirty = true
      this.style.position = position
    }
  }

  private set align(align: TextStyleAlign) {
    if (this.isBitmapText(this.text)) {
      if (this.text.align !== align) {
        this.dirty = true
        this.text.align = align
      }
    } else {
      if (this.text.style.align !== align) {
        this.dirty = true
        this.text.style.align = align
      }
    }
  }

  private set anchor([x, y]: [x: number, y: number]) {
    if (!this.text.anchor.equals({ x, y })) {
      this.text.anchor.set(x, y)
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

  private set wordWrap(wordWrap: number | undefined) {
    if (wordWrap !== this.style.wordWrap) {
      this.style.wordWrap = wordWrap
      if (!this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.wordWrap = wordWrap !== undefined
        this.text.style.wordWrapWidth = wordWrap ?? 0
      }
    }
  }

  private set color(color: string | undefined) {
    if (color !== this.style.color) {
      this.style.color = color
      if (!this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.fill = color ?? STYLE_DEFAULTS.COLOR
      }
    }
  }

  private set stroke(stroke: Stroke | undefined) {
    if (!equals(stroke, this.style.stroke)) {
      this.style.stroke = stroke
      if (!this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.stroke = stroke?.color ?? STYLE_DEFAULTS.STROKE
        this.text.style.strokeThickness = stroke?.width ?? STYLE_DEFAULTS.STROKE_THICKNESS
      }
    }
  }

  private set fontFamily(fontFamily: string | string[]) {
    if (!equals(fontFamily, this.style.fontFamily)) {
      this.dirty = true
      this.style.fontFamily = fontFamily
      if (!this.isBitmapText(this.text)) {
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
