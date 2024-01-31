import { Bounds, Stroke, FontWeight, TextStyle, TextHighlightStyle, TextAlign } from '../../../types/api'
import { BitmapText, Container, Text as PixiText } from 'pixi.js'
import { isNumber } from '../../../utils'
import TextStyleTexture from './TextStyleTexture'
import TextHighlight from './TextHighlight'
import RenderObject from '../../RenderObject'
import FontBook, { FontSubscription } from '../FontBook'

/**
 * TODO
 * - moving/scaling labels is slow. render ASCII text characters as sprites to partical container?
 */

export default class Text extends RenderObject<BitmapText | PixiText> {
  offset = 0

  protected dirty = false
  protected transformed = false
  protected object: BitmapText | PixiText
  protected style: TextStyleTexture
  protected font: FontSubscription | undefined
  protected _highlight: TextHighlight | null = null
  protected _bounds!: Bounds

  constructor(
    protected fontBook: FontBook,
    container: Container,
    protected text: string,
    style: TextStyle | undefined
  ) {
    super(container)
    this.text = text
    this.fontBook = fontBook
    this.style = new TextStyleTexture(style)
    this.font = this.loadFontFamily()
    this.object = this.create()
    this._bounds = this.getBounds()
    if (this.style.current.highlight !== undefined) {
      this._highlight = new TextHighlight(this.container, this.object, this.style.current.highlight)
    }
  }

  update(text: string, textStyle: TextStyle | undefined) {
    const textHasChanged = this.text !== text
    const styleHasChanged = !this.style.compare(textStyle)
    const fontLoading = this.style.fontLoading && this.font?.ready === false
    const fontLoaded = this.style.fontLoading && this.font?.ready === true

    if (fontLoaded) {
      this.style.fontLoading = false
      this.font = undefined
    }

    if (styleHasChanged) {
      const prevFontFamily = this.style.current.fontFamily

      this.style.update(textStyle)

      const fontFamily = this.style.current.fontFamily
      if (fontLoading && this.font?.fontFamily === fontFamily) {
        this.style.fontLoading = true
      } else if (prevFontFamily !== fontFamily) {
        this.font = this.loadFontFamily()
      }

      const style = this.style.current

      this.stroke = style.stroke
      this.wordWrap = style.wordWrap
      this.fontWeight = style.fontWeight
      this.color = style.color
      this.letterSpacing = style.letterSpacing
      this.anchor = this.style.anchorPoint()
      this.align = style.align
      this.fontSize = style.fontSize
      this.fontFamily = style.fontFamily
      this.fontName = style.fontName
    } else if (fontLoaded) {
      this.fontFamily = this.style.current.fontFamily
    }

    if (textHasChanged) {
      this.text = text
      this.object.text = text

      const isBitmapText = this.isBitmapText()
      const isASCII = TextStyleTexture.isASCII(text)

      // if the text type has changed, regenerate a new text object
      if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
        this.transformText()
      }
    }

    if (this.dirty) {
      this.dirty = false
      this.updateText()
    }

    if (this.transformed && this._highlight) {
      this._highlight.text = this.object
    }

    this.transformed = false

    if (textHasChanged && this._highlight) {
      this._highlight.textSize = [this.object.width, this.object.height]
    }
    if (styleHasChanged) {
      this.highlight = textStyle?.highlight
    }
    if (textHasChanged || styleHasChanged) {
      this._bounds = this.getBounds()
    }

    return this
  }

  override moveTo(x: number, y: number) {
    const { text, highlight } = this.style.textCoordinates(x, y, this.offset, this.isBitmapText())

    const dirty = text.x !== this.x || text.y !== this.y

    super.moveTo(text.x, text.y)
    this._highlight?.moveTo(highlight.x, highlight.y)

    if (dirty) {
      this._bounds = this.getBounds()
    }

    return this
  }

  override mount(index?: number) {
    this._highlight?.mount()
    super.mount(index)
    return this
  }

  override unmount() {
    this._highlight?.unmount()
    super.unmount()
    return this
  }

  override delete() {
    if (!this.transformed) {
      this._highlight?.delete()
      this.font?.unsubscribe()
    }

    super.delete()
    return undefined
  }

  get width() {
    return this._highlight?.width ?? this.object.width
  }
  get bounds() {
    return this._highlight?.bounds ?? this._bounds
  }

  set rotation(rotation: number) {
    this.object.rotation = rotation
  }

  private create() {
    let text: PixiText | BitmapText

    if (TextStyleTexture.isASCII(this.text)) {
      this.fontBook.createBitmapFont(this.style.current.fontName, this.style.getTextStyle())
      text = new BitmapText(this.text, this.style.getBitmapStyle())
    } else {
      text = new PixiText(this.text, this.style.getTextStyle())
    }

    text.resolution = this.fontBook.resolution
    text.anchor.set(...this.style.anchorPoint())
    return text
  }

  private loadFontFamily() {
    const { fontFamily, fontWeight } = this.style.current

    if (this.fontBook.available(fontFamily, fontWeight)) {
      return undefined
    }

    this.font?.unsubscribe()
    this.style.fontLoading = true

    return this.fontBook.loadFontFamily(
      fontFamily,
      fontWeight,
      (available: boolean) => {
        if (available) {
          this.update(this.text, this.style.original)
        }
      },
      5000
    )
  }

  private updateText() {
    if (this.isBitmapText(this.object)) {
      this.object.updateText()
    } else {
      this.object.updateText(true)
    }
  }

  private transformText() {
    this.transformed = true
    const isMounted = this.mounted

    this.delete()
    this.object = this.create()
    this.object.x = this.x
    this.object.y = this.y

    if (isMounted) {
      this.mount()
    }
  }

  private isBitmapText(text: PixiText | BitmapText = this.object): text is BitmapText {
    return text instanceof BitmapText
  }

  private getBounds() {
    return TextStyleTexture.textBounds(this.x, this.y, this.object.width, this.object.height, this.object.anchor.x, this.object.anchor.y)
  }

  private set highlight(highlight: TextHighlightStyle | undefined) {
    if (this._highlight === null && highlight !== undefined) {
      this._highlight = new TextHighlight(this.container, this.object, highlight)
    } else if (this._highlight && highlight !== undefined) {
      this._highlight.update(highlight)
    } else if (this._highlight && highlight === undefined) {
      this._highlight.delete()
      this._highlight = null
    }
  }

  private set anchor([x, y]: [number, number]) {
    if (!this.object.anchor.equals({ x, y })) {
      this.object.anchor.set(x, y)
    }
    if (this._highlight) {
      this._highlight.anchor = [x, y]
    }
  }

  private set align(align: TextAlign) {
    if (this.isBitmapText(this.object)) {
      if (this.object.align !== align) {
        this.dirty = true
        this.object.align = align
      }
    } else {
      if (this.object.style.align !== align) {
        this.dirty = true
        this.object.style.align = align
      }
    }
  }

  private set fontSize(fontSize: number) {
    if (this.isBitmapText(this.object)) {
      if (this.object.fontSize !== fontSize) {
        this.dirty = true
        this.object.fontSize = fontSize
      }
    } else {
      if (this.object.style.fontSize !== fontSize) {
        this.dirty = true
        this.object.style.fontSize = fontSize
      }
    }
  }

  private set wordWrap(value: number | false) {
    if (!this.isBitmapText(this.object)) {
      const wordWrap = isNumber(value)
      if (this.object.style.wordWrap !== wordWrap) {
        this.dirty = true
        this.object.style.wordWrap = wordWrap
      }
      if (isNumber(value) && this.object.style.wordWrapWidth !== value) {
        this.dirty = true
        this.object.style.wordWrapWidth = value
      }
    }
  }

  private set color(color: string) {
    if (!this.isBitmapText(this.object) && this.object.style.fill !== color) {
      this.dirty = true
      this.object.style.fill = color
    }
  }

  private set stroke(stroke: Stroke) {
    if (!this.isBitmapText(this.object)) {
      if (this.object.style.stroke !== stroke.color) {
        this.dirty = true
        this.object.style.stroke = stroke.color
      }
      if (this.object.style.strokeThickness !== stroke.width) {
        this.dirty = true
        this.object.style.strokeThickness = stroke.width
      }
    }
  }

  private set fontFamily(fontFamily: string) {
    if (!this.isBitmapText(this.object) && fontFamily !== this.object.style.fontFamily) {
      this.dirty = true
      this.object.style.fontFamily = fontFamily
    }
  }

  private set fontName(fontName: string) {
    if (this.isBitmapText(this.object) && this.object.fontName !== fontName) {
      this.dirty = true
      this.object.fontName = fontName
    }
  }

  private set fontWeight(fontWeight: FontWeight) {
    if (!this.isBitmapText(this.object) && this.object.style.fontWeight !== fontWeight) {
      this.dirty = true
      this.object.style.fontWeight = fontWeight
    }
  }

  private set letterSpacing(letterSpacing: number) {
    if (!this.isBitmapText(this.object)) {
      if (this.object.style.letterSpacing !== letterSpacing) {
        this.dirty = true
        this.object.style.letterSpacing = letterSpacing
      }
    } else if (this.object.letterSpacing !== letterSpacing) {
      this.dirty = true
      this.object.letterSpacing = letterSpacing
    }
  }
}
