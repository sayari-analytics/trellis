// zoom limits
// TODO - extends to renderer options
export const MIN_LABEL_ZOOM = 0.25
export const MIN_NODE_STROKE_ZOOM = 0.3
export const MIN_NODE_ICON_ZOOM = 0.3
export const MIN_INTERACTION_ZOOM = 0.15
export const MIN_EDGES_ZOOM = 0.1
export const MIN_TEXTURE_ZOOM = 3

// style
export const DEFAULT_RESOLUTION = 2
export const DEFAULT_OPACITY = 1

export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF'
}

export const DEFAULT_TEXT_STYLE = {
  margin: 2,
  fontSize: 10,
  color: COLORS.BLACK,
  letterSpacing: 0.5,
  fontName: 'Font',
  fontFamily: 'sans-serif',
  align: 'left' as const,
  wordWrap: false as const,
  position: 'center' as const,
  fontWeight: 'normal' as const,
  stroke: { color: COLORS.WHITE, width: 0 }
}

export const DEFAULT_LABEL_STYLE = {
  defaultTextStyle: { position: 'bottom' as const, align: 'center' as const }
}

export const DEFAULT_HIGHLIGHT_STYLE = {
  color: COLORS.WHITE,
  opacity: DEFAULT_OPACITY,
  padding: [8, 4] as [number, number]
}

export const GENERIC_FONT_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive'])
