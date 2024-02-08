import type { AnchorPosition, LabelStyle, TextHighlightStyle, Stroke, TextAlign, FontWeight, Bounds, TextStyle } from '../../../../types'
import { BitmapText, Container, Text as PixiText } from 'pixi.js'
import { FontBook } from '../../textures/font'
import { equals } from '../../../../utils/api'
import { isNumber } from '../../../../utils'
import TextTexture from '../../textures/text/TextTexture'
import TextHighlight from './TextHighlight'

type TextObject = BitmapText | PixiText
export default class Text {
  mounted = false

  offset = 0
  style: TextTexture

  private x = 0
  private y = 0
  private dirty = false
  private transformed = false

  private object: TextObject
  private highlight?: TextHighlight

  constructor(
    private container: Container,
    private content: string,
    style: TextStyle | undefined
  ) {
    this.container = container
    this.content = content
    this.style = new TextTexture(style)
    this.object = this.create()
    if (this.style.highlight) {
      // this.highlight = new TextHighlight(this.container, this.object, this.style.highlight)
    }
  }

  update(content: string, style: TextStyle | undefined) {
    const contentChanged = this.content !== content
    const styleChanged = !this.style.compare(style)

    this.style.update(style)

    if (contentChanged) {
      this.content = content
      this.object.text = content

      const isBitmapText = this.isBitmapText()
      const isASCII = TextTexture.isASCII(content)

      // if the text type has changed, regenerate a new text object
      if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
        this.transformText()
      }
    }

    const transformed = this.transformed

    if (styleChanged || transformed) {
      //
    }

    this.transformed = false

    if (this.dirty) {
      this.dirty = false
      this.updateText()
    }

    if (transformed && this.highlight) {
      // this.highlight.text = this.object
    }

    if (contentChanged) {
      // this.highlight?.resize(...this.size)
    } else if (transformed && this.highlight) {
      // this.highlight.resize(...this.size)
    }

    return this
  }

  moveTo(x: number, y: number) {
    if (this.x !== x) {
      this.x = x
      this.object.x = x
    }

    if (this.y !== y) {
      this.y = y
      this.object.y = y
    }

    if (this.highlight) {
      // const [pt, pr] = this.style.getHighlightPadding()
      // this.highlight.moveTo(x - pt, y - pr)
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      // this.highlight?.mount()
      this.container.addChild(this.object)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      // this.highlight?.unmount()
      this.container.removeChild(this.object)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.object.destroy()
    if (!this.transformed) {
      // this.highlight?.delete()
    }

    return undefined
  }

  get rotation() {
    return this.object.rotation
  }

  set rotation(rotation: number) {
    this.object.rotation = rotation
    if (this.highlight) {
      // this.highlight.rotation = rotation
    }
  }

  set anchor([x, y]: [number, number]) {
    this.object.anchor.set(x, y)
    if (this.highlight) {
      // this.highlight.anchor = [x, y]
    }
  }

  private create() {
    let text: TextObject

    if (TextTexture.isASCII(this.content)) {
      this.style.createBitmapFont()
      text = new BitmapText(this.content, this.style.getBitmapStyle())
    } else {
      text = new PixiText(this.content, this.style.getTextStyle())
    }

    text.resolution = this.style.resolution
    return text
  }

  private updateText() {
    if (this.isBitmapText(this.object)) {
      this.object.updateText()
    } else {
      this.object.updateText(true)
    }
  }

  private transformText() {
    this.dirty = false
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

  private isBitmapText(text: TextObject = this.object): text is BitmapText {
    return text instanceof BitmapText
  }
}
