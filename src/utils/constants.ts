export const HALF_PI = Math.PI / 2

export const TWO_PI = Math.PI * 2

export const THREE_HALF_PI = HALF_PI * 3

export const RADIANS_PER_DEGREE = Math.PI / 180

// TODO - make configurable
export const MIN_LABEL_ZOOM = 0.25
export const MIN_NODE_STROKE_ZOOM = 0.3
export const MIN_NODE_ICON_ZOOM = 0.3
export const MIN_INTERACTION_ZOOM = 0.15
export const MIN_EDGES_ZOOM = 0.1
export const MIN_ZOOM = 3

export const DEFAULT_ARROW = 'none'
export const DEFAULT_STROKE_WIDTH = 1
export const DEFAULT_OPACITY = 1
export const DEFAULT_FILL_COLOR = '#AAAAAA'

export const DEFAULT_STROKE = {
  color: DEFAULT_FILL_COLOR,
  width: DEFAULT_STROKE_WIDTH
}

export const DEFAULT_FILL_STYLE = {
  color: DEFAULT_FILL_COLOR,
  opacity: DEFAULT_OPACITY
}

export const VIEWPORT_EVENT = {
  POINTER: 'viewportPointer',
  WHEEL: 'viewportWheel',
  DRAG: 'viewportDrag',
  DRAG_DECELERATE: 'viewportDragDecelerate'
} as const

export const NODE_EVENT = {
  POINTER: 'nodePointer',
  DRAG: 'nodeDrag'
} as const

export const EDGE_EVENT = {
  POINTER: 'edgePointer'
} as const

export const POINTER = {
  MOVE: 'pointermove',
  ENTER: 'pointerenter',
  LEAVE: 'pointerleave',
  UP: 'pointerup',
  DOWN: 'pointerdown',
  CANCEL: 'pointercancel',
  OUTSIDE: 'pointerupoutside'
} as const

export const CURSOR = {
  AUTO: 'auto',
  MOVE: 'move',
  POINTER: 'pointer'
} as const

export const DEFAULT_OPTIONS = {
  maxZoom: 3,
  minZoom: 0.025,
  minEdgeZoom: 0.1,
  minLabelZoom: 0.25,
  minInteractionZoom: 0.15,
  minTextureZoom: 3,
  minDecorationZoom: 0.3,
  animateViewport: 800,
  animateNodePosition: 2000,
  animateNodeRadius: 800,
  dragInertia: 0.88,
  maxRadius: 15,
  resolution: 2,
  arrowSize: { width: 6, height: 12 },
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minLineHoverRadius: 2
}

export const DEFAULT_TEXT_STYLE = {
  FONT_SIZE: 10,
  LETTER_SPACING: 0.5,
  MARGIN: 2,
  OPACITY: 1,
  PADDING: [4, 8] as [number, number],
  STROKE: { color: '#FFF', width: 0 },
  FONT_NAME: 'Text',
  COLOR: '#000000',
  ALIGN: 'center' as const,
  ANCHOR: 'bottom' as const,
  FONT_WEIGHT: 'normal' as const,
  FONT_FAMILY: 'sans-serif',
  LINE_HEIGHT: 13,
  BASELINE: 'alphabetic' as const,
  WORD_WRAP: false as const,
  FONT_STYLE: 'normal' as const
}
