import utils, { STYLE_DEFAULTS } from './utils'
import type { LabelPosition, LabelStyle, LabelBackgroundStyle, StyleWithDefaults, LabelBounds } from './utils'
import type { Stroke, TextAlign, FontWeight } from '../../../../types'
import { BitmapText, Container, Text } from 'pixi.js'
import { LabelBackground } from './background'
import { FontBook } from '../../textures/font'
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
  private fontBook: FontBook
  private container: Container
  private text: BitmapText | Text
  private labelBackground: LabelBackground | null = null
  private assignedStyle: LabelStyle | undefined
  private activeStyle!: StyleWithDefaults
  private labelBounds!: LabelBounds

  static async init(fontBook: FontBook, container: Container, label: string, style: LabelStyle | undefined) {
    const fontFamily = style?.fontFamily ?? STYLE_DEFAULTS.FONT_FAMILY
    const fontWeight = style?.fontWeight ?? STYLE_DEFAULTS.FONT_WEIGHT
    const ready = await fontBook.load(fontFamily, fontWeight, 10000)

    if (ready) {
      return new Label(fontBook, container, label, style)
    }
  }

  private constructor(fontBook: FontBook, container: Container, label: string, style: LabelStyle | undefined) {
    this.label = label
    this.fontBook = fontBook
    this.container = container
    this.style = style
    this.text = this.create()
    this.setBounds()
    if (this.style.background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, this.style.background)
    }
  }

  async update(label: string, style: LabelStyle | undefined) {
    const labelHasChanged = this.label !== label
    const styleHasChanged = !equals(this.assignedStyle, style)

    const fontWeight = style?.fontWeight ?? STYLE_DEFAULTS.FONT_WEIGHT
    if (style?.fontFamily !== undefined && style.fontFamily !== this.style.fontFamily) {
      await this.fontBook.load(style.fontFamily, fontWeight)
    }

    this.style = style

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
      this.fontWeight = fontWeight
      this.color = style?.color ?? STYLE_DEFAULTS.COLOR
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
      this.labelBackground.text = this.text
    }

    this.transformed = false

    if (labelHasChanged || styleHasChanged) {
      this.setBounds()
      this.background = style?.background
    }

    return this
  }

  moveTo(x: number, y: number, offset = 0) {
    let dirty = false

    const { label, bg } = utils.getLabelCoordinates(x, y, offset, this.isBitmapText(), this.style)

    this.labelBackground?.moveTo(bg.x, bg.y)

    if (label.x !== this.x) {
      this.text.x = label.x
      this.x = label.x
      dirty = true
    }
    if (label.y !== this.y) {
      this.text.y = label.y
      this.y = label.y
      dirty = true
    }

    if (dirty) {
      this.labelBounds = this.setBounds()
    }

    return this
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

  get bounds() {
    return this.labelBackground?.bounds ?? this.labelBounds
  }

  private create() {
    const label = this.label
    const style = this.style
    const textStyle = utils.getTextStyle(style)

    let text: Text | BitmapText

    if (utils.isASCII(label)) {
      this.fontBook.create(style.fontName, textStyle)
      text = new BitmapText(label, utils.getBitmapStyle(style))
    } else {
      text = new Text(label, textStyle)
    }

    text.resolution = this.fontBook.resolution
    text.anchor.set(...utils.getAnchorPoint(style.position))
    return text
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
    this.text = this.create()
    this.text.x = this.x ?? 0
    this.text.y = this.y ?? 0

    if (isMounted) {
      this.mount()
    }
  }

  private isBitmapText(text: Text | BitmapText = this.text): text is BitmapText {
    return text instanceof BitmapText
  }

  private setBounds() {
    this.labelBounds = utils.getLabelBounds(
      this.x ?? 0,
      this.y ?? 0,
      this.text.width,
      this.text.height,
      this.text.anchor.x,
      this.text.anchor.y
    )
    return this.labelBounds
  }

  private get style(): StyleWithDefaults {
    return this.activeStyle
  }

  private set style(style: LabelStyle | undefined) {
    this.assignedStyle = style
    this.activeStyle = utils.mergeDefaults(style)
  }

  private set background(background: LabelBackgroundStyle | undefined) {
    if (this.labelBackground === null && background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, background)
    } else if (this.labelBackground && background !== undefined) {
      this.labelBackground.update([this.text.width, this.text.height], [this.text.anchor.x, this.text.anchor.y], background)
    } else if (this.labelBackground && background === undefined) {
      this.labelBackground.delete()
      this.labelBackground = null
    }
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
export type { LabelStyle, LabelBackgroundStyle, LabelPosition } from './utils'
