import utils, { DEFAULT_LABEL_STYLE } from './utils'
import type { DefaultLabelStyle } from './utils'
import type { LabelPosition, LabelStyle, LabelBackgroundStyle, Stroke, TextAlign, FontWeight, Bounds } from '../../../../types'
import { BitmapText, Container, Text } from 'pixi.js'
import { LabelBackground } from './background'
import { FontBook } from '../../textures/font'
import { equals } from '../../../../utils/api'
import { isNumber } from '../../../../utils'

/**
 * TODO
 * - moving/scaling labels is slow. render ASCII text characters as sprites to partical container?
 */
export class Label {
  mounted = false
  offset = 0

  private x = 0
  private y = 0
  private dirty = false
  private transformed = false

  private text: BitmapText | Text
  private labelBackground: LabelBackground | null = null
  private _currentStyle: DefaultLabelStyle = DEFAULT_LABEL_STYLE
  private _rect: Bounds

  constructor(
    private fontBook: FontBook,
    private container: Container,
    private label: string,
    private _style: LabelStyle | undefined
  ) {
    this.label = label
    this.fontBook = fontBook
    this.container = container
    this.style = _style
    this.text = this.create()
    this._rect = this.getRect()
    if (this.style.background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, this.style.background)
    }
  }

  update(label: string, style: LabelStyle | undefined) {
    const labelHasChanged = this.label !== label
    const styleHasChanged = !equals(this._style, style)

    const prevSpacing = [this.style.margin, this.labelBackground?.padding ?? 0]

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

    const transformed = this.transformed

    if (styleHasChanged && !transformed) {
      this.stroke = this.style.stroke
      this.wordWrap = this.style.wordWrap
      this.fontWeight = this.style.fontWeight
      this.color = this.style.color
      this.letterSpacing = this.style.letterSpacing
      this.position = this.style.position
      this.fontSize = this.style.fontSize
      this.fontFamily = this.style.fontFamily
      this.fontName = this.style.fontName
      this.background = this.style.background
    }

    this.transformed = false

    if (this.dirty) {
      this.dirty = false
      this.updateText()
    }

    if (transformed && this.labelBackground) {
      this.labelBackground.text = this.text
    }

    const nextSpacing = [this.style.margin, this.labelBackground?.padding ?? 0]

    if (labelHasChanged || !equals(prevSpacing, nextSpacing)) {
      this._rect = this.getRect()
      this.labelBackground?.resize(...this.size)
    } else if (transformed && this.labelBackground) {
      this.labelBackground.resize(...this.size)
    }

    return this
  }

  moveTo(_x: number, _y: number) {
    const { position, margin } = this.style

    let [x, y] = this.offsetCoordinates(_x, _y, this.offset + margin)

    if (this.labelBackground) {
      this.labelBackground.moveTo(x, y)
      const [pt, pr, pb, pl] = utils.getBackgroundPadding(this.labelBackground.padding)
      ;[x, y] = this.offsetCoordinates(x, y, position === 'bottom' ? pt : position === 'left' ? pr : position === 'top' ? pb : pl)
    }

    if (x !== this.x) {
      this.text.x = x
      this.x = x
    }
    if (y !== this.y) {
      this.text.y = y
      this.y = y
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

  get rotation() {
    return this.text.rotation
  }

  set rotation(rotation: number) {
    this.text.rotation = rotation
    if (this.labelBackground) {
      this.labelBackground.rotation = rotation
    }
  }

  get rect() {
    return this._rect
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
    this.dirty = false
    this.transformed = true
    const isMounted = this.mounted

    this.delete()
    this.text = this.create()
    this.text.x = this.x
    this.text.y = this.y

    if (isMounted) {
      this.mount()
    }
  }

  private offsetCoordinates(x: number, y: number, offset: number): [x: number, y: number] {
    switch (this.style.position) {
      case 'bottom':
        return [x, y + offset]
      case 'left':
        return [x - offset, y]
      case 'top':
        return [x, y - offset]
      case 'right':
        return [x + offset, y]
    }
  }

  private isBitmapText(text: Text | BitmapText = this.text): text is BitmapText {
    return text instanceof BitmapText
  }

  private getRect(): Bounds {
    /**
     * This rect defines the min/max distance away from its reference; it does not represent the label's exact position.
     * This should only be recalculated when the size could have changed. i.e. content, margin, or background padding updates
     */
    const { position, margin } = this.style
    const offset = this.offset + margin
    const [width, height] = this.size
    const [pt, pr, pb, pl] = utils.getBackgroundPadding(this.labelBackground?.padding ?? 0)

    switch (position) {
      case 'bottom':
      case 'top': {
        const vertical = { top: 0, bottom: 0, right: width / 2 + pr, left: width / 2 + pl }
        return { ...vertical, [position]: offset + pt + pb + height }
      }

      case 'left':
      case 'right': {
        const horizontal = { left: 0, right: 0, top: height / 2 + pt, bottom: height / 2 + pb }
        return { ...horizontal, [position]: offset + pl + pr + width }
      }
    }
  }

  private get size(): [width: number, height: number] {
    return [this.text.width, this.text.height]
  }

  private get style(): DefaultLabelStyle {
    return this._currentStyle
  }

  private set style(style: LabelStyle | undefined) {
    this._style = style
    this._currentStyle = { ...DEFAULT_LABEL_STYLE, ...(style ?? {}) }
  }

  private set background(background: LabelBackgroundStyle | undefined) {
    if (this.labelBackground === null && background !== undefined) {
      this.labelBackground = new LabelBackground(this.container, this.text, background)
    } else if (this.labelBackground && background !== undefined) {
      this.labelBackground.update(background)
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
      this.labelBackground?.anchor.set(x, y)
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

  private set wordWrap(value: number | false) {
    if (!this.isBitmapText(this.text)) {
      const wordWrap = isNumber(value)
      if (this.text.style.wordWrap !== wordWrap) {
        this.dirty = true
        this.text.style.wordWrap = wordWrap
      }
      if (isNumber(value) && this.text.style.wordWrapWidth !== value) {
        this.dirty = true
        this.text.style.wordWrapWidth = value
      }
    }
  }

  private set color(color: string) {
    if (!this.isBitmapText(this.text) && this.text.style.fill !== color) {
      this.dirty = true
      this.text.style.fill = color
    }
  }

  private set stroke(stroke: Stroke) {
    if (!this.isBitmapText(this.text)) {
      if (this.text.style.stroke !== stroke.color) {
        this.dirty = true
        this.text.style.stroke = stroke.color
      }
      if (this.text.style.strokeThickness !== stroke.width) {
        this.dirty = true
        this.text.style.strokeThickness = stroke.width
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
