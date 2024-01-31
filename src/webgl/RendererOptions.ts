import { Options, DefaultOptions, Viewport, Dimensions } from '../types/api'
import { DEFAULT_OPTIONS, isNumber } from 'src/utils'

export default class RendererOptions implements DefaultOptions {
  private _defaultOptions: DefaultOptions

  resolution: number = DEFAULT_OPTIONS.resolution
  defaultViewport: Viewport = DEFAULT_OPTIONS.defaultViewport
  minZoom: number = DEFAULT_OPTIONS.minZoom
  maxZoom: number = DEFAULT_OPTIONS.maxZoom
  minEdgeZoom: number = DEFAULT_OPTIONS.minEdgeZoom
  minLabelZoom: number = DEFAULT_OPTIONS.minLabelZoom
  minInteractionZoom: number = DEFAULT_OPTIONS.minInteractionZoom
  minTextureZoom: number = DEFAULT_OPTIONS.minTextureZoom
  minDecorationZoom: number = DEFAULT_OPTIONS.minDecorationZoom
  animateViewport: number | false = DEFAULT_OPTIONS.animateViewport
  animateNodePosition: number | false = DEFAULT_OPTIONS.animateNodePosition
  animateNodeRadius: number | false = DEFAULT_OPTIONS.animateNodeRadius
  dragInertia: number = DEFAULT_OPTIONS.dragInertia
  maxRadius: number = DEFAULT_OPTIONS.maxRadius
  arrowSize: Dimensions = DEFAULT_OPTIONS.arrowSize
  minLineHoverRadius: number = DEFAULT_OPTIONS.minLineHoverRadius
  maxFontSize: number = DEFAULT_OPTIONS.maxFontSize

  constructor(defaultOptions: DefaultOptions) {
    this._defaultOptions = defaultOptions
    this.set({})
  }

  set(options: Options): this {
    Object.assign(this, options, this._defaultOptions, {
      animateViewport: this.coerceAnimationValue('animateViewport', options.animateViewport),
      animateNodeRadius: this.coerceAnimationValue('animateNodeRadius', options.animateNodeRadius),
      animateNodePosition: this.coerceAnimationValue('animateNodePosition', options.animateNodePosition)
    })

    return this
  }

  private coerceAnimationValue(
    key: 'animateViewport' | 'animateNodePosition' | 'animateNodeRadius',
    value: number | boolean | undefined = true
  ): number | false {
    return value === false || isNumber(value)
      ? value
      : isNumber(this._defaultOptions[key])
      ? this._defaultOptions[key]
      : DEFAULT_OPTIONS[key]
  }
}
