import type { IComponent } from '.'
import type { NodeComponent } from './nodeComponent'
import type { Renderer } from '../'
import { LineSegment } from '../objects/lineSegment'
import { EdgeHitArea } from '../objects/edgeHitArea'
import { Arrow } from '../objects/arrow'
import { movePoint } from '../utils'
import { angle, type Edge } from '../../..'
import { MIN_EDGES_ZOOM } from '../../../utils/constants'

const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = '#aaa'
const DEFAULT_EDGE_OPACITY = 1
const DEFAULT_ARROW = 'none'

export class EdgeComponent implements IComponent {
  edge?: Edge
  source: NodeComponent
  target: NodeComponent
  lineSegment: LineSegment
  forwardArrow: Arrow
  reverseArrow: Arrow
  hitArea: EdgeHitArea

  private sourceX: number
  private sourceY: number
  private targetX: number
  private targetY: number

  constructor(
    private renderer: Renderer,
    source: NodeComponent,
    target: NodeComponent
  ) {
    this.source = source
    this.target = target
    this.sourceX = source.x
    this.sourceY = source.y
    this.targetX = target.x
    this.targetY = target.y
    this.lineSegment = new LineSegment(this.renderer.containers.edges)
    this.forwardArrow = new Arrow(this.renderer.containers.edges, this.renderer.textures.arrow)
    this.reverseArrow = new Arrow(this.renderer.containers.edges, this.renderer.textures.arrow)
    this.hitArea = new EdgeHitArea(this.renderer, this)
  }

  render(nextEdge: Edge) {
    if (
      nextEdge !== this.edge ||
      this.source.x !== this.sourceX ||
      this.source.y !== this.sourceY ||
      this.target.x !== this.targetX ||
      this.target.y !== this.targetY
    ) {
      const nextArrow = nextEdge.style?.arrow ?? DEFAULT_ARROW
      const width = nextEdge.style?.width ?? DEFAULT_EDGE_WIDTH
      const color = nextEdge.style?.stroke ?? DEFAULT_EDGE_COLOR
      const opacity = nextEdge.style?.strokeOpacity ?? DEFAULT_EDGE_OPACITY
      const sourceRadius = this.source.strokes.radius ?? this.source.radius
      const targetRadius = this.target.strokes.radius ?? this.target.radius
      const theta = angle(this.source.x, this.source.y, this.target.x, this.target.y)
      let arrowX0: number | undefined = undefined
      let arrowY0: number | undefined = undefined
      let arrowX1: number | undefined = undefined
      let arrowY1: number | undefined = undefined
      let x0: number
      let y0: number
      let x1: number
      let y1: number

      // Update Edge Arrows
      if (nextArrow === 'reverse' || nextArrow == 'both') {
        ;[x0, y0] = movePoint(this.source.x, this.source.y, theta, -sourceRadius - this.reverseArrow.height)
        ;[arrowX0, arrowY0] = movePoint(this.source.x, this.source.y, theta, -sourceRadius)
        this.reverseArrow.update(arrowX0, arrowY0, theta, color, opacity)
      } else {
        ;[x0, y0] = movePoint(this.source.x, this.source.y, theta, -sourceRadius)
      }

      if (nextArrow === 'forward' || nextArrow == 'both') {
        ;[x1, y1] = movePoint(this.target.x, this.target.y, theta, targetRadius + this.forwardArrow.height)
        ;[arrowX1, arrowY1] = movePoint(this.target.x, this.target.y, theta, targetRadius)
        this.forwardArrow.update(arrowX1, arrowY1, theta, color, opacity)
      } else {
        ;[x1, y1] = movePoint(this.target.x, this.target.y, theta, targetRadius)
      }

      // Update Edge LineSegment
      this.lineSegment.update(x0, y0, x1, y1, width, theta, color, opacity)

      // Update Hit Area
      this.hitArea.update(arrowX0 ?? x0, arrowY0 ?? y0, arrowX1 ?? x1, arrowY1 ?? y1, nextEdge.style?.width ?? DEFAULT_EDGE_WIDTH, theta)
    }

    this.sourceX = this.source.x
    this.sourceY = this.source.y
    this.targetX = this.target.x
    this.targetY = this.target.y
    this.edge = nextEdge

    if (this.shouldCull()) {
      this.hitArea.unmount()
    } else {
      this.hitArea.mount()
    }

    return this
  }

  delete() {
    this.lineSegment.exit()
    this.forwardArrow.exit()
    this.reverseArrow.exit()
    this.hitArea.exit()
  }

  private shouldCull() {
    const minX = Math.min(this.sourceX, this.targetX)
    const minY = Math.min(this.sourceY, this.targetY)
    const maxX = Math.max(this.sourceX, this.targetX)
    const maxY = Math.max(this.sourceY, this.targetY)
    const viewport = this.renderer.components.viewport

    // TODO - also calculate whether edge intersects with any of the 4 bbox edges
    return maxX < viewport.minX || minX > viewport.maxX || maxY < viewport.minY || minY > viewport.maxY || viewport.zoom > MIN_EDGES_ZOOM
  }
}
