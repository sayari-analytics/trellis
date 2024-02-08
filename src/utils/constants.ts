export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF'
}

// zoom limits
export const MIN_LABEL_ZOOM = 0.25
export const MIN_NODE_STROKE_ZOOM = 0.3
export const MIN_NODE_ICON_ZOOM = 0.3
export const MIN_INTERACTION_ZOOM = 0.15
export const MIN_EDGES_ZOOM = 0.1
export const MIN_TEXTURE_ZOOM = 3

// style defaults
export const DEFAULT_RESOLUTION = 2

export const DEFAULT_OPACITY = 1

export const DEFAULT_TEXT_STYLE = {
  fontSize: 10,
  fontName: 'Font',
  align: 'left' as const,
  fontFamily: 'sans-serif',
  color: COLORS.BLACK,
  letterSpacing: 0.5,
  wordWrap: false as const,
  fontWeight: 'normal' as const,
  stroke: { color: COLORS.WHITE, width: 0 }
}

export const DEFAULT_HIGHLIGHT_STYLE = {
  color: COLORS.WHITE,
  opacity: DEFAULT_OPACITY,
  padding: [4, 8]
}
