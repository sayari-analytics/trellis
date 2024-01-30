import { DEFAULT_STROKE_WIDTH, movePoint } from '../../../utils'
import { Container, Polygon } from 'pixi.js'
import RendererOptions from '../../RendererOptions'
import HitArea from './HitArea'

export default class LineHitArea extends HitArea<Polygon> {
  private options: RendererOptions
  width: number

  constructor(options: RendererOptions, container: Container, width = DEFAULT_STROKE_WIDTH) {
    super(container, new Polygon())
    this.options = options
    this.width = width
  }

  override moveTo(x0: number, y0: number, x1: number, y1: number, angle: number) {
    const radius = Math.max(this.width, this.options.minLineHoverRadius)

    this.shape.points = [
      ...movePoint(x0, y0, angle, radius),
      ...movePoint(x0, y0, angle, -radius),
      ...movePoint(x1, y1, angle, -radius),
      ...movePoint(x1, y1, angle, radius)
    ]

    return this
  }
}
