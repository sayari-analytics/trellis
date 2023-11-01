import utils, { STYLE_DEFAULTS } from './utils'
import type { StyleWithDefaults, LabelPosition, LabelStyle, LabelBackgroundStyle } from './utils'
import type { Stroke } from '../../../../types'
import { BitmapText, Container, Text, TextStyleAlign, TextStyleFill, TextStyleFontWeight } from 'pixi.js'
import { LabelBackground } from './background'
import { equals } from '../../../..'

/**
 * TODO
 * - add support for background color, custom font loading
 * - add support for loading custom fonts as asset bundles
 * - moving/scaling labels is slow. render ASCII text characters as sprites to partical container?
 */
export class Label {
  mounted = false

  private x?: number
  private y?: number
  private dirty = false
  private transformed = false
  private label: string
  private container: Container
  private text: BitmapText | Text
  private style: StyleWithDefaults
  private labelBackground: LabelBackground | null = null

  constructor(container: Container, label: string, style: LabelStyle | undefined) {
    this.label = label
    this.container = container
    this.style = utils.mergeDefaults(style)

    if (utils.isASCII(this.label)) {
      utils.loadFont(this.style)
      this.text = new BitmapText(this.label, utils.getBitmapStyle(this.style))
    } else {
      this.text = new Text(this.label, utils.getTextStyle(this.style))
    }

    this.text.anchor.set(...utils.getAnchorPoint(this.style.position))
    if (this.style.background !== undefined) {
      this.labelBackground = new LabelBackground(container, this.text, this.style.background)
    }
  }

  update(label: string, style: LabelStyle | undefined) {
    this.value = label

    const isBitmapText = this.isBitmapText()
    const isASCII = utils.isASCII(this.label)
    // if the text type has changed, regenerate a new text object
    if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
      this.transformText(this.label, utils.mergeDefaults(style))
    }

    this.wordWrap = style?.wordWrap
    this.color = style?.color
    this.stroke = style?.stroke
    this.fontWeight = style?.fontWeight
    this.letterSpacing = style?.letterSpacing
    this.position = style?.position ?? STYLE_DEFAULTS.POSITION
    this.fontSize = style?.fontSize ?? STYLE_DEFAULTS.FONT_SIZE
    this.fontFamily = style?.fontFamily ?? STYLE_DEFAULTS.FONT_FAMILY
    this.fontName = style?.fontName ?? STYLE_DEFAULTS.FONT_NAME
    this.background = style?.background

    if (this.dirty) {
      this.dirty = false
      this.updateText()
    }

    this.transformed = false
    return this
  }

  moveTo(x: number, y: number, offset = 0) {
    const { label, bg } = utils.getLabelCoordinates(x, y, offset, this.isBitmapText(), this.style)

    this.labelBackground?.moveTo(bg.x, bg.y)

    if (label.x !== this.x) {
      this.text.x = label.x
      this.x = label.x
    }
    if (label.y !== this.y) {
      this.text.y = label.y
      this.y = label.y
    }
  }

  mount() {
    if (!this.mounted) {
      this.labelBackground?.mount()
      this.container.addChild(this.text)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.labelBackground?.unmount()
      this.container.removeChild(this.text)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.text.destroy()
    if (!this.transformed) {
      this.labelBackground?.delete()
    }

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

  private transformText(label: string, style: StyleWithDefaults) {
    this.transformed = true
    const isMounted = this.mounted

    this.delete()

    if (utils.isASCII(label)) {
      utils.loadFont(style)
      this.text = new BitmapText(label, utils.getBitmapStyle(style))
    } else {
      this.text = new Text(label, utils.getTextStyle(style))
    }

    this.text.anchor.set(...utils.getAnchorPoint(style.position))
    this.text.x = this.x ?? 0
    this.text.y = this.y ?? 0

    if (isMounted) {
      this.mount()
    }
  }

  private set value(label: string) {
    if (label !== this.label) {
      this.text.text = label
      this.label = label
    }
  }

  private set position(position: LabelPosition) {
    this.align = utils.getTextAlign(position)
    this.anchor = utils.getAnchorPoint(position)
    this.style.position = position
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
      this.style.fontSize = fontSize
      if (this.isBitmapText(this.text)) {
        if (this.text.fontSize !== fontSize) {
          this.dirty = true
          this.text.fontSize = fontSize
        }
      } else {
        if (this.text.style.fontSize !== fontSize) {
          this.dirty = true
          this.text.style.fontSize = fontSize
        }
      }
    }
  }

  private set wordWrap(wordWrap: number | undefined) {
    if (wordWrap !== this.style.wordWrap) {
      this.style.wordWrap = wordWrap
      const wordWrapWidth = wordWrap ?? 0
      if (!this.isBitmapText(this.text) && this.text.style.wordWrapWidth !== wordWrapWidth) {
        this.dirty = true
        this.text.style.wordWrap = wordWrap !== undefined
        this.text.style.wordWrapWidth = wordWrapWidth
      }
    }
  }

  private set color(value: TextStyleFill | undefined) {
    if (!equals(value, this.style.color)) {
      this.style.color = value
      const color = value ?? STYLE_DEFAULTS.COLOR
      if (!this.isBitmapText(this.text) && this.text.style.fill !== color) {
        this.dirty = true
        this.text.style.fill = color
      }
    }
  }

  private set stroke(value: Stroke | undefined) {
    if (!equals(value, this.style.stroke)) {
      this.style.stroke = value
      const stroke = value?.color ?? STYLE_DEFAULTS.STROKE
      const strokeThickness = value?.width ?? STYLE_DEFAULTS.STROKE_THICKNESS
      if (!this.isBitmapText(this.text) && (this.text.style.stroke !== stroke || this.text.style.strokeThickness !== strokeThickness)) {
        this.dirty = true
        this.text.style.stroke = stroke
        this.text.style.strokeThickness = strokeThickness
      }
    }
  }

  private set fontFamily(fontFamily: string | string[]) {
    if (!equals(fontFamily, this.style.fontFamily)) {
      this.style.fontFamily = fontFamily
      if (!this.isBitmapText(this.text) && !equals(this.text.style.fontFamily, fontFamily)) {
        this.dirty = true
        this.text.style.fontFamily = fontFamily
      }
    }
  }

  private set fontName(fontName: string) {
    if (fontName !== this.style.fontName) {
      this.style.fontName = fontName
      if (this.isBitmapText(this.text) && this.text.fontName !== fontName) {
        this.dirty = true
        this.text.fontName = fontName
      }
    }
  }

  private set fontWeight(value: TextStyleFontWeight | undefined) {
    if (value !== this.style.fontWeight) {
      this.style.fontWeight = value
      const fontWeight = value ?? STYLE_DEFAULTS.FONT_WEIGHT
      if (!this.isBitmapText(this.text) && this.text.style.fontWeight !== fontWeight) {
        this.dirty = true
        this.text.style.fontWeight = fontWeight
      }
    }
  }

  private set background(background: LabelBackgroundStyle | undefined) {
    this.style.background = background

    if (this.labelBackground === null && background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, background)
    } else if (this.labelBackground && background !== undefined) {
      this.labelBackground.update(this.text, background)
    } else if (this.labelBackground && background === undefined) {
      this.labelBackground.delete()
      this.labelBackground = null
    }
  }

  private set letterSpacing(value: number | undefined) {
    if (value !== this.style.letterSpacing) {
      this.style.letterSpacing = value
      const letterSpacing = value ?? STYLE_DEFAULTS.LETTER_SPACING
      if (!this.isBitmapText(this.text)) {
        if (this.text.style.letterSpacing !== letterSpacing) {
          this.dirty = true
          this.text.style.letterSpacing = letterSpacing
        }
      } else {
        if (this.text.letterSpacing !== letterSpacing) {
          this.dirty = true
          this.text.letterSpacing = letterSpacing
        }
      }
    }
  }
}

export { LabelBackground } from './background'
export type { LabelStyle, LabelBackgroundStyle, LabelPosition } from './utils'
