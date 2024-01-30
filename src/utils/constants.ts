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
  defaultViewport: { x: 0, y: 0, zoom: 1 }
}
