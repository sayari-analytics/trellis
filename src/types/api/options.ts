import { Viewport } from '.'

// renderer options
export interface Options {
  /**
   * canvas resolution
   * @default 2
   */
  resolution?: number
  /**
   * the minimum zoom on canvas
   * @default 0.025
   */
  minZoom?: number
  /**
   * the maximum zoom on canvas
   * @default 3
   */
  maxZoom?: number
  /**
   * the minimum zoom to show labels
   * @default 0.25
   */
  minLabelZoom?: number
  /**
   * the minimum zoom to enable interactions
   * @default 0.15
   */
  minInteractionZoom?: number
  /**
   * the minimum zoom to show edges
   * @default 0.1
   */
  minEdgeZoom?: number
  /**
   * the minimum zoom to show decorations such as strokes, icons, etc.
   * @default 0.3
   */
  minDecorationZoom?: number
  /**
   * the minimum zoom to render pixi textures
   * @default 3
   */
  minTextureZoom?: number
  /**
   * the maximum node radius
   * @default 15
   */
  maxRadius?: number
  /**
   * the maximum font size
   * @default 16
   */
  maxFontSize?: number
  /**
   * disable viewport animation or apply a duration in milliseconds
   * @default 800
   */
  animateViewport?: number | boolean
  /**
   * disable node position animation or apply a duration in milliseconds
   * @default 2000
   */
  animateNodePosition?: number | boolean
  /**
   * disable node radius animation or apply a duration in milliseconds
   * @default 800
   */
  animateNodeRadius?: number | boolean
  /**
   * modify the drag inertia for deceleration interactions
   * @default 0.88
   */
  dragInertia?: number
  /**
   * size of edge arrows
   * @default { height: 12, width: 6 }
   */
  arrowSize?: { height: number; width: number }
  /**
   * minimum hover radius for interactive strokes
   * @default 2
   */
  minLineHoverRadius?: number
}

export interface DefaultOptions extends Required<Options> {
  defaultViewport: Viewport
  animateViewport: number | false
  animateNodePosition: number | false
  animateNodeRadius: number | false
}
