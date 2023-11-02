import utils, { STYLE_DEFAULTS } from './utils'
import type { LabelPosition, LabelStyle, LabelBackgroundStyle, TextAlign, FontWeight } from './utils'
import type { Stroke } from '../../../../types'
import { BitmapText, Container, Text, Point } from 'pixi.js'
import { LabelBackground, Rectangle } from './background'
import { equals } from '../../../../'

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
  private labelBackground: LabelBackground | null = null
  private _style: LabelStyle | undefined

  constructor(container: Container, label: string, style: LabelStyle | undefined) {
    this.container = container
    this.label = label
    this._style = style

    if (utils.isASCII(this.label)) {
      utils.loadFont(this.style)
      this.text = new BitmapText(this.label, utils.getBitmapStyle(this.style))
      this.text.resolution = 2
    } else {
      this.text = new Text(this.label, utils.getTextStyle(this.style))
    }

    this.anchor = utils.getAnchorPoint(this.style.position)

    if (this.style.background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, this.style.background)
    }
  }

  update(label: string, style: LabelStyle | undefined) {
    const labelHasChanged = this.label !== label
    const styleHasChanged = !equals(this._style, style)

    this._style = style

    if (labelHasChanged) {
      this.label = label
      this.text.text = label

      const isBitmapText = this.isBitmapText()
      const isASCII = utils.isASCII(label)
      // if the text type has changed, regenerate a new text object
      if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
        this.transformText()
      }
    }

    if (styleHasChanged) {
      this.stroke = style?.stroke
      this.wordWrap = style?.wordWrap
      this.color = style?.color ?? STYLE_DEFAULTS.COLOR
      this.fontWeight = style?.fontWeight ?? STYLE_DEFAULTS.FONT_WEIGHT
      this.letterSpacing = style?.letterSpacing ?? STYLE_DEFAULTS.LETTER_SPACING
      this.position = style?.position ?? STYLE_DEFAULTS.POSITION
      this.fontSize = style?.fontSize ?? STYLE_DEFAULTS.FONT_SIZE
      this.fontFamily = style?.fontFamily ?? STYLE_DEFAULTS.FONT_FAMILY
      this.fontName = style?.fontName ?? STYLE_DEFAULTS.FONT_NAME
    }

    if (this.dirty) {
      this.dirty = false
      this.updateText()
    }

    if (this.transformed && this.labelBackground) {
      this.transformed = false
      this.labelBackground.text = this.text
    }

    if (labelHasChanged || styleHasChanged) {
      this.setBackground({ ...this.text.getLocalBounds() }, this.text.anchor.clone(), style?.background)
    }

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

  private transformText() {
    this.transformed = true
    const isMounted = this.mounted

    this.delete()

    if (utils.isASCII(this.label)) {
      utils.loadFont(this.style)
      this.text = new BitmapText(this.label, utils.getBitmapStyle(this.style))
      this.text.resolution = 2
    } else {
      this.text = new Text(this.label, utils.getTextStyle(this.style))
    }

    this.anchor = utils.getAnchorPoint(this.style.position)
    this.text.x = this.x ?? 0
    this.text.y = this.y ?? 0

    if (isMounted) {
      this.mount()
    }
  }

  private setBackground(rect: Rectangle, anchor: Point, background: LabelBackgroundStyle | undefined) {
    if (this.labelBackground === null && background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, background)
    } else if (this.labelBackground && background !== undefined) {
      this.labelBackground.update(rect, anchor, background)
    } else if (this.labelBackground && background === undefined) {
      this.labelBackground.delete()
      this.labelBackground = null
    }
  }

  private get style() {
    return utils.mergeDefaults(this._style)
  }

  private set position(position: LabelPosition) {
    this.align = utils.getTextAlign(position)
    this.anchor = utils.getAnchorPoint(position)
  }

  private set align(align: TextAlign) {
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

  private set wordWrap(wordWrap: number | undefined) {
    const wordWrapWidth = wordWrap ?? 0
    if (!this.isBitmapText(this.text) && this.text.style.wordWrapWidth !== wordWrapWidth) {
      this.dirty = true
      this.text.style.wordWrap = wordWrap !== undefined
      this.text.style.wordWrapWidth = wordWrapWidth
    }
  }

  private set color(color: string) {
    if (!this.isBitmapText(this.text) && this.text.style.fill !== color) {
      this.dirty = true
      this.text.style.fill = color
    }
  }

  private set stroke(value: Stroke | undefined) {
    if (!this.isBitmapText(this.text)) {
      const stroke = value?.color ?? STYLE_DEFAULTS.STROKE
      const strokeThickness = value?.width ?? STYLE_DEFAULTS.STROKE_THICKNESS
      if (this.text.style.stroke !== stroke || this.text.style.strokeThickness !== strokeThickness) {
        this.dirty = true
        this.text.style.stroke = stroke
        this.text.style.strokeThickness = strokeThickness
      }
    }
  }

  private set fontFamily(fontFamily: string) {
    if (!this.isBitmapText(this.text) && fontFamily !== this.text.style.fontFamily) {
      this.dirty = true
      this.text.style.fontFamily = fontFamily
    }
  }

  private set fontName(fontName: string) {
    if (this.isBitmapText(this.text) && this.text.fontName !== fontName) {
      this.dirty = true
      this.text.fontName = fontName
    }
  }

  private set fontWeight(fontWeight: FontWeight) {
    if (!this.isBitmapText(this.text) && this.text.style.fontWeight !== fontWeight) {
      this.dirty = true
      this.text.style.fontWeight = fontWeight
    }
  }

  private set letterSpacing(letterSpacing: number) {
    if (!this.isBitmapText(this.text)) {
      if (this.text.style.letterSpacing !== letterSpacing) {
        this.dirty = true
        this.text.style.letterSpacing = letterSpacing
      }
    } else if (this.text.letterSpacing !== letterSpacing) {
      this.dirty = true
      this.text.letterSpacing = letterSpacing
    }
  }
}

export { LabelBackground } from './background'
export type { LabelStyle, LabelBackgroundStyle, LabelPosition, FontWeight, TextAlign } from './utils'
