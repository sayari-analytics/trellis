import type { Stroke } from '../../../../types'
import { Text, TextStyle, ITextStyle, IBitmapTextStyle, TextStyleAlign, BitmapFont } from 'pixi.js'

export type LabelPosition = 'bottom' | 'left' | 'top' | 'right'

export type LabelStyle = Partial<{
  color: string
  fontName: string
  fontSize: number
  wordWrap: number
  background: string
  fontFamily: string | string[]
  position: LabelPosition
  letterSpacing: number
  stroke: Stroke
}>

type _StyleDefaults = 'fontSize' | 'position' | 'fontFamily' | 'fontName'
export type StyleWithDefaults = Omit<LabelStyle, _StyleDefaults> & {
  fontSize: number
  position: LabelPosition
  fontFamily: string | string[]
  fontName: string
}

export type LabelCoords = { x: number; y: number; offset?: number }

export const STYLE_DEFAULTS = {
  FONT_SIZE: 10,
  LETTER_SPACING: 1,
  STROKE_THICKNESS: 0,
  WORD_WRAP: false,
  STROKE: '#FFF',
  FONT_NAME: 'Label',
  COLOR: '#000000',
  ALIGN: 'center' as const,
  POSITION: 'bottom' as const,
  LINE_JOIN: 'round' as const,
  FONT_FAMILY: ['Arial', 'sans-serif']
}

// install text defaults
Text.defaultResolution = 2
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
  letterSpacing: STYLE_DEFAULTS.LETTER_SPACING,
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

const getLabelCoordinates = ({ x, y, offset = 0 }: LabelCoords, isBitmapText: boolean, position: LabelPosition) => {
  if (isBitmapText) {
    // BitmapText shifts text down 2px
    switch (position) {
      case 'bottom':
        return [x, y + offset]
      case 'left':
        return [x - offset - 2, y - 2]
      case 'top':
        return [x, y - offset - 4]
      case 'right':
        return [x + offset + 2, y - 2]
    }
  } else {
    switch (position) {
      case 'bottom':
        return [x, y + offset]
      case 'left':
        return [x - offset - 2, y + 1]
      case 'top':
        return [x, y - offset + 2]
      case 'right':
        return [x + offset + 2, y + 1]
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

const getTextStyle = ({ color, fontFamily, fontSize, wordWrap, stroke, position, letterSpacing }: StyleWithDefaults) => {
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
    BitmapFont.from(style.fontName, getTextStyle(style), { resolution: 2 })
  }
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
  loadFont
}
