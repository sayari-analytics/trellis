import { Text, TextStyle, ITextStyle, IBitmapTextStyle, LINE_JOIN } from 'pixi.js'
import type { AnchorPosition, LabelStyle, TextHighlightStyle, TextAlign } from '../../../../types/api'
import { isNumber } from '../../../../utils'

export type DefaultLabelStyle = Required<Omit<LabelStyle, 'highlight'>> & {
  highlight?: TextHighlightStyle
}

export const RESOLUTION = 2
export const STYLE_DEFAULTS = {
  FONT_SIZE: 10,
  LETTER_SPACING: 0.5,
  WORD_WRAP: false as const,
  MARGIN: 2,
  OPACITY: 1,
  PADDING: [4, 8] as [number, number],
  FONT_NAME: 'Label',
  COLOR: '#000000',
  ALIGN: 'center' as const,
  POSITION: 'bottom' as const,
  FONT_WEIGHT: 'normal' as const,
  FONT_FAMILY: 'sans-serif',
  LINE_HEIGHT: 13,
  BASELINE: 'alphabetic' as const,
  STROKE: { color: '#FFF', width: 0 }
}

export const DEFAULT_LABEL_STYLE: DefaultLabelStyle = {
  fontName: STYLE_DEFAULTS.FONT_NAME,
  fontSize: STYLE_DEFAULTS.FONT_SIZE,
  margin: STYLE_DEFAULTS.MARGIN,
  position: STYLE_DEFAULTS.POSITION,
  fontFamily: STYLE_DEFAULTS.FONT_FAMILY,
  letterSpacing: STYLE_DEFAULTS.LETTER_SPACING,
  wordWrap: STYLE_DEFAULTS.WORD_WRAP,
  fontWeight: STYLE_DEFAULTS.FONT_WEIGHT,
  stroke: STYLE_DEFAULTS.STROKE,
  color: STYLE_DEFAULTS.COLOR
}

export const DEFAULT_LABEL_BG_STYLE: Required<TextHighlightStyle> = {
  color: '#FFF',
  opacity: STYLE_DEFAULTS.OPACITY,
  padding: STYLE_DEFAULTS.PADDING
}

// install text defaults
Text.defaultAutoResolution = false
TextStyle.defaultStyle = {
  ...TextStyle.defaultStyle,
  align: STYLE_DEFAULTS.ALIGN,
  fill: STYLE_DEFAULTS.COLOR,
  stroke: STYLE_DEFAULTS.STROKE.color,
  lineJoin: LINE_JOIN.ROUND,
  wordWrap: STYLE_DEFAULTS.WORD_WRAP,
  fontSize: STYLE_DEFAULTS.FONT_SIZE,
  fontFamily: STYLE_DEFAULTS.FONT_FAMILY,
  strokeThickness: STYLE_DEFAULTS.STROKE.width,
  letterSpacing: STYLE_DEFAULTS.LETTER_SPACING,
  lineHeight: STYLE_DEFAULTS.LINE_HEIGHT,
  textBaseline: STYLE_DEFAULTS.BASELINE
}

const isASCII = (str: string) => {
  for (const char of str) {
    if (char.codePointAt(0)! > 126) {
      return false
    }
  }

  return true
}

const getTextAlign = (position: AnchorPosition): TextAlign => {
  return position === 'left' || position === 'right' ? position : 'center'
}

const getAnchorPoint = (position: AnchorPosition): [x: number, y: number] => {
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

const getTextStyle = ({
  color,
  fontFamily,
  fontSize,
  fontWeight,
  wordWrap,
  stroke,
  position: position,
  letterSpacing
}: DefaultLabelStyle): Partial<ITextStyle> => ({
  fill: color,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  stroke: stroke.color,
  strokeThickness: stroke.width,
  align: getTextAlign(position),
  lineHeight: fontSize * 1.3,
  wordWrap: wordWrap !== false,
  wordWrapWidth: isNumber(wordWrap) ? wordWrap : undefined
})

const getBitmapStyle = (style: DefaultLabelStyle): Partial<IBitmapTextStyle> => ({
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

export default {
  isASCII,
  getTextAlign,
  getAnchorPoint,
  getTextStyle,
  getBitmapStyle,
  getBackgroundPadding
}
