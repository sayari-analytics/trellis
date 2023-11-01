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
  margin: number
  wordWrap: number
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

export const RESOLUTION = 2
export const STYLE_DEFAULTS = {
  FONT_SIZE: 10,
  STROKE_THICKNESS: 0,
  LETTER_SPACING: 0.5,
  WORD_WRAP: false,
  MARGIN: 2,
  OPACITY: 1,
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

const mergeBackgroundDefaults = ({
  color,
  opacity = STYLE_DEFAULTS.OPACITY,
  padding = STYLE_DEFAULTS.PADDING
}: LabelBackgroundStyle): Required<LabelBackgroundStyle> => ({
  color,
  opacity,
  padding
})

const isASCII = (str: string) => {
  for (const char of str) {
    if (char.codePointAt(0)! > 126) {
      return false
    }
  }

  return true
}

const getTextAlign = (position: LabelPosition): TextStyleAlign => {
  return position === 'left' || position === 'right' ? position : 'center'
}

const getAnchorPoint = (position: LabelPosition): [x: number, y: number] => {
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
    style.align = getTextAlign(position)
  }
  if (letterSpacing !== undefined) {
    style.letterSpacing = letterSpacing
  }
  return new TextStyle(style)
}

const getBitmapStyle = (style: StyleWithDefaults): Partial<IBitmapTextStyle> => ({
  fontName: style.fontName,
  fontSize: style.fontSize,
  align: getTextAlign(style.position),
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

const getBackgroundPadding = (padding: BackgroundPadding = STYLE_DEFAULTS.PADDING): [vertical: number, horizontal: number] => {
  return typeof padding === 'number' ? [padding, padding] : padding
}

const getLabelCoordinates = (
  x: number,
  y: number,
  offset: number,
  isBitmapText: boolean,
  { position, background, margin = STYLE_DEFAULTS.MARGIN }: StyleWithDefaults
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
  mergeBackgroundDefaults,
  getLabelCoordinates,
  getTextAlign,
  getAnchorPoint,
  getTextStyle,
  getBitmapStyle,
  loadFont,
  getBackgroundPadding
}
