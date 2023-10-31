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
  TextStyleFontWeight
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
  PADDING: [4, 8] as [number, number],
  WORD_WRAP: false,
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
  strokeThickness: STYLE_DEFAULTS.STROKE_THICKNESS
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

const getLabelCoordinates = (
  { x, y, offset = 0 }: LabelCoords,
  isBitmapText: boolean,
  { position, margin = 0, background }: StyleWithDefaults
) => {
  let vertical = 0
  let horizontal = 0
  if (background !== undefined) {
    const [v, h] = getBackgroundPadding(background.padding)
    vertical += v / 2
    horizontal += h / 2
  }

  const shift = margin + offset

  if (isBitmapText) {
    // BitmapText shifts text down 2px
    switch (position) {
      case 'bottom':
        return [x, y + shift + vertical]
      case 'left':
        return [x - shift - horizontal - 2, y - 2]
      case 'top':
        return [x, y - shift - vertical - 4]
      case 'right':
        return [x + shift + horizontal + 2, y - 2]
    }
  } else {
    switch (position) {
      case 'bottom':
        return [x, y + shift + vertical]
      case 'left':
        return [x - shift - horizontal - 2, y + 1]
      case 'top':
        return [x, y - shift - vertical + 2]
      case 'right':
        return [x + shift + horizontal + 2, y + 1]
    }
  }
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
  align: getPositionAlign(style.position)
})

const bitmapFontIsAvailable = (fontName: string) => BitmapFont.available[fontName] !== undefined

const loadFont = (style: StyleWithDefaults) => {
  if (!bitmapFontIsAvailable(style.fontName)) {
    BitmapFont.from(style.fontName, { ...getTextStyle(style), letterSpacing: 1 }, { resolution: RESOLUTION, chars: BitmapFont.ASCII })
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

// TODO -> fix offset difference between text and bitmap text
const getBackgroundX = (x: number, isBitmapText: boolean, { position, background }: StyleWithDefaults) => {
  const horizontal = getBackgroundPadding(background?.padding)[1] / 2
  switch (position) {
    case 'right':
      return x - horizontal - 2
    case 'left':
      return x + horizontal - 2
    default:
      return x
  }
}

const getBackgroundY = (y: number, isBitmapText: boolean, { position, background }: StyleWithDefaults) => {
  const vertical = getBackgroundPadding(background?.padding)[0] / 2
  switch (position) {
    case 'bottom':
      return y - vertical
    case 'top':
      return y + vertical
    default:
      return y
  }
}

const setBackgroundStyle = (sprite: Sprite, text: Text | BitmapText, { color, opacity = 1, padding }: LabelBackgroundStyle) => {
  const [vertical, horizontal] = getBackgroundPadding(padding)
  sprite.anchor.set(text.anchor.x, text.anchor.y)
  sprite.height = text.height + vertical
  sprite.width = text.width + horizontal
  sprite.alpha = opacity
  sprite.tint = color
  return sprite
}

const createBackgroundSprite = (text: Text | BitmapText, style: LabelBackgroundStyle) => {
  const sprite = Sprite.from(Texture.WHITE, { resolution: RESOLUTION })
  return setBackgroundStyle(sprite, text, style)
}

export default {
  isASCII,
  mergeDefaults,
  getLabelCoordinates,
  getPositionAlign,
  getPositionAnchor,
  getTextStyle,
  getBitmapStyle,
  bitmapFontIsAvailable,
  loadFont,
  createTextObject,
  getBackgroundX,
  getBackgroundY,
  setBackgroundStyle,
  createBackgroundSprite,
  getBackgroundPadding
}
