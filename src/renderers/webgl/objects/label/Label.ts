import type { StyleWithDefaults, LabelCoords, LabelPosition, LabelStyle, LabelBackgroundStyle } from './utils'
import type { Stroke } from '../../../../types'
import { BitmapText, Container, Sprite, Text, TextStyleAlign, TextStyleFill, TextStyleFontWeight } from 'pixi.js'
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

  private dirty = false
  private transformed = false
  private label: string
  private container: Container
  private text: BitmapText | Text
  private style: StyleWithDefaults
  private backgroundSprite: Sprite | null = null
  private x?: number
  private y?: number

  constructor(container: Container, label: string, labelStyle?: LabelStyle) {
    const style = utils.mergeDefaults(labelStyle)
    const text = utils.createTextObject(label, style)
    this.container = container
    this.label = label
    this.style = style
    this.text = text
    if (style.background !== undefined) {
      this.backgroundSprite = utils.createBackgroundSprite(text, style.background)
    }
  }

  update(label: string, coords: LabelCoords, style?: LabelStyle) {
    const previous = this.text.getLocalBounds()

    this.value = label

    const isBitmapText = this.isBitmapText()
    const isASCII = utils.isASCII(label)
    // if the text type has changed, regenerate a new text object
    if ((isBitmapText && !isASCII) || (!isBitmapText && isASCII)) {
      this.transformText(label, utils.mergeDefaults(style))
    }

    this.style.margin = style?.margin
    this.coordinates = coords
    this.wordWrap = style?.wordWrap
    this.color = style?.color
    this.stroke = style?.stroke
    this.fontWeight = style?.fontWeight
    this.position = style?.position ?? STYLE_DEFAULTS.POSITION
    this.fontSize = style?.fontSize ?? STYLE_DEFAULTS.FONT_SIZE
    this.fontFamily = style?.fontFamily ?? STYLE_DEFAULTS.FONT_FAMILY
    this.fontName = style?.fontName ?? STYLE_DEFAULTS.FONT_NAME
    this.background = style?.background

    if (this.dirty) {
      this.dirty = false
      this.updateText()
    }

    if (this.backgroundSprite) {
      const bounds = this.text.getLocalBounds()
      if (previous.width !== bounds.width || previous.height !== bounds.height) {
        utils.setBackgroundSize(this.backgroundSprite, bounds, this.style.background?.padding)
      }
    }

    this.transformed = false
    return this
  }

  mount() {
    if (!this.mounted) {
      if (this.backgroundSprite) {
        this.container.addChild(this.backgroundSprite)
      }

      this.container.addChild(this.text)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      if (this.backgroundSprite) {
        this.container.removeChild(this.backgroundSprite)
      }

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

  private transformText(label: string, style: StyleWithDefaults) {
    const isMounted = this.mounted

    this.delete()
    this.text = utils.createTextObject(label, style)
    this.transformed = true
    this.x = undefined
    this.y = undefined

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

  private set coordinates(coords: LabelCoords) {
    const { label, bg } = utils.getLabelCoordinates(coords, this.style, this.isBitmapText())

    if (label.x !== this.x) {
      this.text.x = label.x
      this.x = label.x
    }
    if (label.y !== this.y) {
      this.text.y = label.y
      this.y = label.y
    }

    if (this.backgroundSprite) {
      if (this.backgroundSprite.x !== bg.x) {
        this.backgroundSprite.x = bg.x
      }
      if (this.backgroundSprite.y !== bg.y) {
        this.backgroundSprite.y = bg.y
      }
    }
  }

  private set position(position: LabelPosition) {
    this.align = utils.getPositionAlign(position)
    this.anchor = utils.getPositionAnchor(position)
    if (position !== this.style.position) {
      this.dirty = !this.transformed
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
      this.style.fontSize = fontSize
      if (!this.transformed) {
        this.dirty = true
        if (this.isBitmapText(this.text)) {
          this.text.fontSize = fontSize
        } else {
          this.text.style.fontSize = fontSize
        }
      }
    }
  }

  private set wordWrap(wordWrap: number | undefined) {
    if (wordWrap !== this.style.wordWrap) {
      this.style.wordWrap = wordWrap
      if (!this.transformed && !this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.wordWrap = wordWrap !== undefined
        this.text.style.wordWrapWidth = wordWrap ?? 0
      }
    }
  }

  private set color(color: TextStyleFill | undefined) {
    if (!equals(color, this.style.color)) {
      this.style.color = color
      if (!this.transformed && !this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.fill = color ?? STYLE_DEFAULTS.COLOR
      }
    }
  }

  private set stroke(stroke: Stroke | undefined) {
    if (!equals(stroke, this.style.stroke)) {
      this.style.stroke = stroke
      if (!this.transformed && !this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.stroke = stroke?.color ?? STYLE_DEFAULTS.STROKE
        this.text.style.strokeThickness = stroke?.width ?? STYLE_DEFAULTS.STROKE_THICKNESS
      }
    }
  }

  private set fontFamily(fontFamily: string | string[]) {
    if (!equals(fontFamily, this.style.fontFamily)) {
      this.style.fontFamily = fontFamily
      if (!this.transformed) {
        this.dirty = true
        if (!this.isBitmapText(this.text)) {
          this.text.style.fontFamily = fontFamily
        }
      }
    }
  }

  private set fontName(fontName: string) {
    if (fontName !== this.style.fontName) {
      this.style.fontName = fontName
      if (!this.transformed && this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.fontName = fontName
      }
    }
  }

  private set fontWeight(fontWeight: TextStyleFontWeight | undefined) {
    if (fontWeight !== this.style.fontWeight) {
      this.style.fontWeight = fontWeight
      if (!this.transformed && !this.isBitmapText(this.text)) {
        this.dirty = true
        this.text.style.fontWeight = fontWeight ?? STYLE_DEFAULTS.FONT_WEIGHT
      }
    }
  }

  private set background(background: LabelBackgroundStyle | undefined) {
    if (!equals(background, this.style.background)) {
      this.style.background = background
      if (this.backgroundSprite) {
        if (background !== undefined) {
          utils.setBackgroundStyle(this.backgroundSprite, this.text, background)
        } else {
          const sprite = this.backgroundSprite
          this.backgroundSprite = null
          this.mounted && this.container.removeChild(sprite)
          sprite.destroy()
        }
      } else if (background !== undefined) {
        this.backgroundSprite = utils.createBackgroundSprite(this.text, background)
        this.mounted && this.container.addChild(this.backgroundSprite)
      }
    }
  }
}
