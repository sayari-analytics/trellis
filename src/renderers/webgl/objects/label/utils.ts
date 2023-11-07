import { Text, TextStyle, ITextStyle, IBitmapTextStyle, LINE_JOIN } from 'pixi.js'
import type { Stroke } from '../../../../types'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'
export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
export type LabelPosition = 'bottom' | 'left' | 'top' | 'right'

export type LabelBackgroundStyle = {
  color: string
  opacity?: number
  padding?: number | number[]
}

export type LabelStyle = Partial<{
  fontName: string
  fontSize: number
  margin: number
  wordWrap: number
  letterSpacing: number
  fontFamily: string
  fontWeight: FontWeight
  stroke: Stroke
  color: string
  position: LabelPosition
  background: LabelBackgroundStyle
}>

type _StyleDefaults = 'fontSize' | 'position' | 'fontFamily' | 'fontName' | 'margin'
export type StyleWithDefaults = Omit<LabelStyle, _StyleDefaults> & {
  fontSize: number
  position: LabelPosition
  fontFamily: string | string[]
  fontName: string
  margin: number
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
  FONT_WEIGHT: 'normal' as const,
  FONT_FAMILY: 'sans-serif'
}

// install text defaults
Text.defaultAutoResolution = false
TextStyle.defaultStyle = {
  ...TextStyle.defaultStyle,
  align: STYLE_DEFAULTS.ALIGN,
  fill: STYLE_DEFAULTS.COLOR,
  stroke: STYLE_DEFAULTS.STROKE,
  lineJoin: LINE_JOIN.ROUND,
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
  margin = STYLE_DEFAULTS.MARGIN,
  ...style
}: LabelStyle = {}): StyleWithDefaults => ({
  position,
  fontSize,
  fontFamily,
  fontName,
  margin,
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

const getTextAlign = (position: LabelPosition): TextAlign => {
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

const getBackgroundPadding = (
  padding: number | number[] = STYLE_DEFAULTS.PADDING
): [top: number, right: number, bottom: number, left: number] => {
  const [top, right = top, bottom = top, left = right]: number[] = typeof padding === 'number' ? [padding] : padding
  return [top, right, bottom, left]
}

const getLabelCoordinates = (
  x: number,
  y: number,
  offset: number,
  isBitmapText: boolean,
  { position, background, margin }: StyleWithDefaults
) => {
  const shift = margin + offset
  const label = { x, y }
  const bg = { x, y }

  let top = 0
  let right = 0
  let bottom = 0
  let left = 0
  if (background !== undefined) {
    const [t, r, b, l] = getBackgroundPadding(background.padding)
    top += t
    right += r
    bottom += b
    left += l
  }

  if (isBitmapText && (position === 'left' || position === 'right')) {
    label.y -= 1
    bg.y -= 1
  }

  switch (position) {
    case 'bottom':
      label.y += shift + top
      bg.y += shift
      break
    case 'left':
      label.x -= shift + right
      bg.x -= shift
      break
    case 'top':
      label.y -= shift + bottom
      bg.y -= shift
      break
    case 'right':
      label.x += shift + left
      bg.x += shift
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
  getBackgroundPadding
}
