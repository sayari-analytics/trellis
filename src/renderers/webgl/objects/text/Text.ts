import type { Bounds, TextStyle, TextObject, FontWeight, RenderObject, PointTuple } from '../../../../types'
import { BitmapText, Container, Text as PixiText } from 'pixi.js'
import { equals } from '../../../../utils/api'
import TextTexture, { TextTextureOptions } from '../../textures/TextTexture'
import AssetManager, { FontSubscription } from '../../loaders/AssetManager'
import TextHighlight from './TextHighlight'

export default class Text implements RenderObject {
  mounted = false

  offset = 0
  style: TextTexture

  private x = 0
  private y = 0
  private transformed = false

  private object: TextObject
  private highlight?: TextHighlight
  private font?: FontSubscription
  private _rect: Bounds

  constructor(
    private assets: AssetManager,
    private container: Container,
    private content: string,
    style: TextStyle | undefined,
    options?: TextTextureOptions
  ) {
    this.assets = assets
    this.container = container
    this.content = content
    this.style = new TextTexture(style, options)

    const { fontFamily, fontWeight } = this.style
    if (this.assets.shouldLoadFont({ fontFamily, fontWeight })) {
      this.style.fontLoading = true
    }

    this.object = this.create()
    this._rect = this.getRect()
    this.applyHighlight()

    if (this.style.fontLoading) {
      this.font = this.loadFont(fontFamily, fontWeight)
    }
  }

  update(content: string, style: TextStyle | undefined) {
    const contentHasChanged = this.content !== content
    const styleHasChanged = !this.style.compare(style)
    const prevSpacing = [this.style.margin, this.style.highlight?.padding ?? 0]

    this.cancel()
    this.style.update(style)

    const { fontFamily, fontWeight } = this.style
    if (this.assets.shouldLoadFont({ fontFamily, fontWeight })) {
      this.style.fontLoading = true
      this.font = this.loadFont(fontFamily, fontWeight)
    }

    if (contentHasChanged) {
      this.content = content
      this.object.text = content

      const isBitmapText = this.isBitmapText()
      const isASCII = TextTexture.isASCII(content)

      // if the text type has changed, regenerate a new text object
      if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
        this.transformText()
      }
    }

    if (styleHasChanged) {
      this.applyHighlight()
      if (!this.transformed) {
        this.applyStyle()
      }
    }

    const nextSpacing = [this.style.margin, this.style.highlight?.padding ?? 0]
    const sizeHasChanged = contentHasChanged || !equals(prevSpacing, nextSpacing)

    if (contentHasChanged || sizeHasChanged) {
      this._rect = this.getRect()
    }

    if (this.highlight && (this.transformed || sizeHasChanged)) {
      this.highlight.resize(...this.size)
    }

    this.transformed = false

    return this
  }

  moveTo(_x: number, _y: number) {
    const { position, margin } = this.style

    let [x, y] = this.offsetPosition(_x, _y, this.offset + margin)

    if (this.highlight) {
      this.highlight.moveTo(x, y)

      const [px, py] = this.style.getHighlightPadding()

      if (position === 'center') {
        x -= px
        y -= py
      } else {
        const [nextX, nextY] = this.offsetPosition(x, y, position === 'bottom' || position === 'top' ? py : px)
        x = nextX
        y = nextY
      }
    }

    if (this.isBitmapText()) {
      y -= position === 'bottom' ? 1 : 2
    }

    if (this.x !== x) {
      this.x = x
      this.object.x = x
    }

    if (this.y !== y) {
      this.y = y
      this.object.y = y
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.highlight?.mount()
      this.container.addChild(this.object)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.highlight?.unmount()
      this.container.removeChild(this.object)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.object.destroy()
    if (!this.transformed) {
      this.highlight?.delete()
      this.cancel()
    }

    return undefined
  }

  cancel() {
    this.font?.unsubscribe()
    this.font = undefined
  }

  rotate(rotation: number) {
    this.object.rotation = rotation
    this.highlight?.rotate(rotation)
    return this
  }

  get rect() {
    return this._rect
  }

  private get size(): [width: number, height: number] {
    const [px, py] = this.style.getHighlightPadding()
    return [this.object.width + px * 2, this.object.height + py * 2]
  }

  private isBitmapText(object: TextObject = this.object): object is BitmapText {
    return object instanceof BitmapText
  }

  private create() {
    let object: TextObject

    if (TextTexture.isASCII(this.content)) {
      this.style.createFont()
      object = new BitmapText(this.content, this.style.getBitmapStyle())
    } else {
      object = new PixiText(this.content, this.style.getTextStyle())
    }

    object.anchor.set(...this.style.anchor)
    object.resolution = this.style.resolution
    return object
  }

  private transformText() {
    const rotation = this.object.rotation

    this.transformed = true
    const isMounted = this.mounted

    this.delete()
    this.object = this.create()
    this.object.x = this.x
    this.object.y = this.y
    this.object.rotation = rotation

    if (this.highlight) {
      this.highlight.text = this.object
    }

    if (isMounted) {
      this.mount()
    }
  }

  private applyStyle() {
    this.object.anchor.set(...this.style.anchor)
    this.highlight?.anchor.set(...this.style.anchor)

    if (!this.isBitmapText(this.object)) {
      this.object.style.stroke = this.style.stroke.color
      this.object.style.strokeThickness = this.style.stroke.width
      this.object.style.wordWrap = this.style.wordWrap
      this.object.style.wordWrapWidth = this.style.wordWrapWidth
      this.object.style.fontWeight = this.style.fontWeight
      this.object.style.fill = this.style.color
      this.object.style.letterSpacing = this.style.letterSpacing
      this.object.style.align = this.style.align
      this.object.style.fontSize = this.style.fontSize
      this.object.style.fontFamily = this.style.fontFamily
    } else {
      this.transformText()
    }

    return this
  }

  private applyHighlight() {
    if (!this.highlight && this.style.highlight) {
      this.highlight = new TextHighlight(this.container, this.object, this.style.highlight).resize(...this.size)
    } else if (this.highlight && this.style.highlight) {
      this.highlight.update(this.style.highlight)
    } else if (this.highlight && !this.style.highlight) {
      this.highlight.delete()
      this.highlight = undefined
    }

    return this
  }

  private offsetPosition(x: number, y: number, offset: number): PointTuple {
    switch (this.style.position) {
      case 'bottom':
        return [x, y + offset]
      case 'left':
        return [x - offset, y]
      case 'top':
        return [x, y - offset]
      case 'right':
        return [x + offset, y]
      default:
        return [x, y]
    }
  }

  private getRect(): Bounds {
    /**
     * This rect defines the min/max distance away from its reference; it does not represent the label's exact position.
     * This should only be recalculated when the size could have changed. i.e. content, margin, or background padding updates
     */
    const empty = { top: 0, right: 0, bottom: 0, left: 0 }
    const offset = this.offset + this.style.margin
    const position = this.style.position

    const [width, height] = this.size
    const [hx, hy] = [width / 2, height / 2]

    switch (position) {
      case 'top':
      case 'bottom':
        return { ...empty, left: hx, right: hx, [position]: offset + height }
      case 'left':
      case 'right':
        return { ...empty, top: hy, bottom: hy, [position]: offset + width }
      case 'center':
        return { top: hy, right: hx, bottom: hy, left: hx }
    }
  }

  private loadFont(fontFamily: string, fontWeight: FontWeight) {
    return this.assets.loadFont({
      fontFamily,
      fontWeight,
      resolve: () => {
        this.font = undefined
        this.style.fontLoading = false
        this.applyStyle()
      }
    })
  }
}
