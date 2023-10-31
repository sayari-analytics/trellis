import type { Stroke } from '../../../../types'
import {
  Text,
  TextStyle,
  TextStyleFill,
  ITextStyle,
  IBitmapTextStyle,
  TextStyleAlign,
  BitmapFont,
  ColorSource,
  Sprite,
  Texture,
  BitmapText,
  TextStyleFontWeight,
  Rectangle
} from 'pixi.js'

export type LabelPosition = 'bottom' | 'left' | 'top' | 'right'

export type BackgroundPadding = number | [vertical: number, horizontal: number]

export type LabelBackgroundStyle = {
  color: ColorSource
  opacity?: number
  padding?: BackgroundPadding
}

export type LabelStyle = Partial<{
  fontName: string
  fontSize: number
  wordWrap: number
  margin: number
  letterSpacing: number
  fontFamily: string | string[]
  fontWeight: TextStyleFontWeight
  stroke: Stroke
  color: TextStyleFill
  position: LabelPosition
  background: LabelBackgroundStyle
}>

type _StyleDefaults = 'fontSize' | 'position' | 'fontFamily' | 'fontName'
export type StyleWithDefaults = Omit<LabelStyle, _StyleDefaults> & {
  fontSize: number
  position: LabelPosition
  fontFamily: string | string[]
  fontName: string
}

export type LabelCoords = { x: number; y: number; offset?: number }

const RESOLUTION = 2
export const STYLE_DEFAULTS = {
  FONT_SIZE: 10,
  STROKE_THICKNESS: 0,
  LETTER_SPACING: 0.5,
  WORD_WRAP: false,
  PADDING: [4, 8] as [number, number],
  STROKE: '#FFF',
  FONT_NAME: 'Label',
  COLOR: '#000000',
  ALIGN: 'center' as const,
  POSITION: 'bottom' as const,
  LINE_JOIN: 'round' as const,
  FONT_WEIGHT: 'normal' as const,
  FONT_FAMILY: ['Arial', 'sans-serif']
}

// install text defaults
Text.defaultResolution = RESOLUTION
Text.defaultAutoResolution = false
TextStyle.defaultStyle = {
  ...TextStyle.defaultStyle,
  align: STYLE_DEFAULTS.ALIGN,
  fill: STYLE_DEFAULTS.COLOR,
  stroke: STYLE_DEFAULTS.STROKE,
  lineJoin: STYLE_DEFAULTS.LINE_JOIN,
  wordWrap: STYLE_DEFAULTS.WORD_WRAP,
  fontSize: STYLE_DEFAULTS.FONT_SIZE,
  fontFamily: STYLE_DEFAULTS.FONT_FAMILY,
  strokeThickness: STYLE_DEFAULTS.STROKE_THICKNESS,
  letterSpacing: STYLE_DEFAULTS.LETTER_SPACING
}

// utils
const mergeDefaults = ({
  position = STYLE_DEFAULTS.POSITION,
  fontSize = STYLE_DEFAULTS.FONT_SIZE,
  fontFamily = STYLE_DEFAULTS.FONT_FAMILY,
  fontName = STYLE_DEFAULTS.FONT_NAME,
  ...style
}: LabelStyle = {}): StyleWithDefaults => ({
  position,
  fontSize,
  fontFamily,
  fontName,
  ...style
})

const isASCII = (str: string) => {
  for (const char of str) {
    if (char.codePointAt(0)! > 126) {
      return false
    }
  }

  return true
}

const getPositionAlign = (position: LabelPosition): TextStyleAlign => {
  return position === 'left' || position === 'right' ? position : 'center'
}

const getPositionAnchor = (position: LabelPosition): [x: number, y: number] => {
  switch (position) {
    case 'bottom':
      return [0.5, 0]
    case 'left':
      return [1, 0.5]
    case 'top':
      return [0.5, 1]
    case 'right':
      return [0, 0.5]
  }
}

const getTextStyle = ({ color, fontFamily, fontSize, fontWeight, wordWrap, stroke, position, letterSpacing }: StyleWithDefaults) => {
  const style: Partial<ITextStyle> = {}
  if (color !== undefined) {
    style.fill = color
  }
  if (fontFamily !== undefined) {
    style.fontFamily = fontFamily
  }
  if (fontSize !== undefined) {
    style.fontSize = fontSize
  }
  if (fontWeight !== undefined) {
    style.fontWeight = fontWeight
  }
  if (wordWrap !== undefined) {
    style.wordWrap = true
    style.wordWrapWidth = wordWrap
  }
  if (stroke !== undefined) {
    style.stroke = stroke.color
    style.strokeThickness = stroke.width
  }
  if (position !== STYLE_DEFAULTS.POSITION) {
    style.align = getPositionAlign(position)
  }
  if (letterSpacing !== undefined) {
    style.letterSpacing = letterSpacing
  }
  return new TextStyle(style)
}

const getBitmapStyle = (style: StyleWithDefaults): Partial<IBitmapTextStyle> => ({
  fontName: style.fontName,
  fontSize: style.fontSize,
  align: getPositionAlign(style.position),
  letterSpacing: style.letterSpacing ?? STYLE_DEFAULTS.LETTER_SPACING
})

const loadFont = (style: StyleWithDefaults) => {
  if (BitmapFont.available[style.fontName] === undefined) {
    BitmapFont.from(style.fontName, getTextStyle(style), {
      resolution: RESOLUTION,
      chars: BitmapFont.ASCII
    })
  }
}

const createTextObject = (label: string, style: StyleWithDefaults) => {
  let text: BitmapText | Text

  if (isASCII(label)) {
    loadFont(style)
    text = new BitmapText(label, getBitmapStyle(style))
  } else {
    text = new Text(label, getTextStyle(style))
  }

  text.anchor.set(...getPositionAnchor(style.position))
  return text
}

const getBackgroundPadding = (padding: BackgroundPadding = STYLE_DEFAULTS.PADDING): [vertical: number, horizontal: number] => {
  return typeof padding === 'number' ? [padding, padding] : padding
}

const setBackgroundSize = (sprite: Sprite, bounds: Rectangle, padding?: BackgroundPadding) => {
  const [vertical, horizontal] = getBackgroundPadding(padding)
  sprite.height = bounds.height + vertical
  sprite.width = bounds.width + horizontal
  return sprite
}

const setBackgroundStyle = (sprite: Sprite, text: Text | BitmapText, { color, opacity = 1, padding }: LabelBackgroundStyle) => {
  sprite.anchor.set(text.anchor.x, text.anchor.y)
  sprite.alpha = opacity
  sprite.tint = color
  return setBackgroundSize(sprite, text.getLocalBounds(), padding)
}

const createBackgroundSprite = (text: Text | BitmapText, style: LabelBackgroundStyle) => {
  const sprite = Sprite.from(Texture.WHITE, { resolution: RESOLUTION })
  return setBackgroundStyle(sprite, text, style)
}

const getLabelCoordinates = (
  { x, y, offset = 0 }: LabelCoords,
  { position, margin = 2, background }: StyleWithDefaults,
  isBitmapText: boolean
) => {
  const shift = margin + offset
  const label = { x, y }
  const bg = { x, y }

  let vertical = 0
  let horizontal = 0
  if (background !== undefined) {
    const [v, h] = getBackgroundPadding(background.padding)
    vertical += v / 2
    horizontal += h / 2
  }

  switch (position) {
    case 'bottom':
      label.y += shift + vertical
      bg.y += shift

      break
    case 'left':
      label.x -= shift + horizontal
      bg.x -= shift

      if (isBitmapText) {
        label.y -= 1
        bg.y -= 1
      }

      break
    case 'top':
      label.y -= shift + vertical
      bg.y -= shift

      break
    case 'right':
      label.x += shift + horizontal
      bg.x += shift

      if (isBitmapText) {
        label.y -= 1
        bg.y -= 1
      }

      break
  }

  return { label, bg }
}

export default {
  isASCII,
  mergeDefaults,
  getLabelCoordinates,
  getPositionAlign,
  getPositionAnchor,
  getTextStyle,
  getBitmapStyle,
  loadFont,
  createTextObject,
  setBackgroundSize,
  setBackgroundStyle,
  createBackgroundSprite,
  getBackgroundPadding
}
