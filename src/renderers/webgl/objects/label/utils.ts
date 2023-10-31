import { Text, TextStyle, ITextStyle, IBitmapTextStyle, TextStyleAlign, BitmapFont } from 'pixi.js'
import { LabelPosition, LabelStyle, Stroke } from '../../../..'

export type LabelAnchor = { x: number; y: number; offset?: number }

export type StyleWithDefaults = Omit<LabelStyle, 'position' | 'fontSize' | 'stroke' | 'fontFamily' | 'fontName'> & {
  stroke: Stroke
  fontSize: number
  position: LabelPosition
  fontFamily: string | string[]
  fontName: string
}

// defaults
export const DEFAULT_FONT_SIZE = 10
export const DEFAULT_COLOR = '#000000'
export const DEFAULT_ORIENTATION = 'bottom'
export const DEFAULT_FONT_NAME = 'Label'
export const DEFAULT_FONT_FAMILY = ['Arial', 'sans-serif']
export const DEFAULT_STROKE_COLOR = '#FFF'
export const DEFAULT_STROKE_WIDTH = 0
export const DEFAULT_STROKE: Stroke = { color: '#FFF', width: 0 }
export const STYLE_DEFAULTS: StyleWithDefaults = {
  position: DEFAULT_ORIENTATION,
  fontSize: DEFAULT_FONT_SIZE,
  stroke: DEFAULT_STROKE,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontName: DEFAULT_FONT_NAME
}

// install text defaults
Text.defaultResolution = 2
Text.defaultAutoResolution = false
TextStyle.defaultStyle = {
  ...TextStyle.defaultStyle,
  lineJoin: 'round',
  align: 'center',
  wordWrap: false,
  fill: DEFAULT_COLOR,
  stroke: DEFAULT_STROKE.color,
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY
}

// utils
export const mergeDefaults = (style: LabelStyle = {}): StyleWithDefaults => ({
  ...STYLE_DEFAULTS,
  ...style
})

export const isASCII = (str: string) => {
  for (const char of str) {
    if (char.codePointAt(0)! > 126) {
      return false
    }
  }

  return true
}

export const getLabelCoordinates = ({ x, y, offset = 0 }: LabelAnchor, isBitmapText: boolean, position: LabelPosition) => {
  if (isBitmapText) {
    // BitmapText shifts text down 2px
    switch (position) {
      case 'left':
        return [x - offset - 2, y - 2]
      case 'top':
        return [x, y - offset - 4]
      case 'right':
        return [x + offset + 2, y - 2]
      default:
        return [x, y + offset]
    }
  } else {
    switch (position) {
      case 'left':
        return [x - offset - 2, y + 1]
      case 'top':
        return [x, y - offset + 2]
      case 'right':
        return [x + offset + 2, y + 1]
      default:
        return [x, y + offset]
    }
  }
}

export const getPositionAlign = (position: LabelPosition): TextStyleAlign => {
  return position === 'left' || position === 'right' ? position : 'center'
}

export const getPositionAnchor = (position: LabelPosition): [x: number, y: number] => {
  switch (position) {
    case 'left':
      return [1, 0.5]
    case 'top':
      return [0.5, 1]
    case 'right':
      return [0, 0.5]
    default:
      return [0.5, 0]
  }
}

export const getTextStyle = ({ color, fontFamily, fontSize, maxWidth, stroke, background, position }: StyleWithDefaults) => {
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
  if (maxWidth !== undefined) {
    style.wordWrap = true
    style.wordWrapWidth = maxWidth
  }
  if (stroke !== undefined) {
    style.stroke = stroke.color
    style.strokeThickness = stroke.width
  } else if (background !== undefined) {
    style.stroke = background
  }
  if (position !== undefined) {
    style.align = getPositionAlign(position)
  }
  return new TextStyle(style)
}

export const getBitmapStyle = (style: StyleWithDefaults): Partial<IBitmapTextStyle> => ({
  fontName: style.fontName,
  fontSize: style.fontSize,
  align: getPositionAlign(style.position)
})

export const bitmapFontIsAvailable = (fontName: string) => {
  return BitmapFont.available[fontName] !== undefined
}

export const loadFont = (style: StyleWithDefaults) => {
  if (!bitmapFontIsAvailable(style.fontName)) {
    BitmapFont.from(style.fontName, getTextStyle(style))
  }
}
