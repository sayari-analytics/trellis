import type { IComponent } from '.'
import type { NodeComponent } from './nodeComponent'
import type { Renderer } from '../'
import { LineSegment } from '../objects/lineSegment'
import { EdgeEventHandler } from '../eventHandlers/edgeEventHandler'
import { Arrow } from '../objects/arrow'
import { movePoint } from '../utils'
import { angle, distanceSquared, type Edge } from '../../..'

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
  eventHandler: EdgeEventHandler
  renderIdx = -1

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
    this.sourceX = source.x ?? 0
    this.sourceY = source.y ?? 0
    this.targetX = target.x ?? 0
    this.targetY = target.y ?? 0
    this.lineSegment = new LineSegment(this.renderer.containers.edges)
    this.forwardArrow = new Arrow(this.renderer.containers.edges, this.renderer.textures.arrow)
    this.reverseArrow = new Arrow(this.renderer.containers.edges, this.renderer.textures.arrow)
    this.eventHandler = new EdgeEventHandler(this.renderer, this)
  }

  render(nextEdge: Edge) {
    const sourceX = this.source.x ?? 0
    const sourceY = this.source.y ?? 0
    const targetX = this.target.x ?? 0
    const targetY = this.target.y ?? 0

    if (
      nextEdge !== this.edge ||
      sourceX !== this.sourceX ||
      sourceY !== this.sourceY ||
      targetX !== this.targetX ||
      targetY !== this.targetY
    ) {
      if (this.renderer.components.debug) {
        this.renderer.components.debug.edgeUpdateCount++
      }

      const nextArrow = nextEdge.style?.arrow ?? DEFAULT_ARROW
      const width = nextEdge.style?.width ?? DEFAULT_EDGE_WIDTH
      const color = nextEdge.style?.stroke ?? DEFAULT_EDGE_COLOR
      const opacity = nextEdge.style?.strokeOpacity ?? DEFAULT_EDGE_OPACITY
      const sourceRadius = this.source.strokes.radius ?? this.source.radius ?? 0
      const targetRadius = this.target.strokes.radius ?? this.target.radius ?? 0

      if (distanceSquared(sourceX, sourceY, targetX, targetY) <= (sourceRadius + targetRadius) ** 2) {
        // edge is shorter than the source/target node's combined radius, don't render
        this.forwardArrow.hide()
        this.reverseArrow.hide()
        this.lineSegment.hide()
      } else {
        this.forwardArrow.show()
        this.reverseArrow.show()
        this.lineSegment.show()

        const theta = angle(sourceX, sourceY, targetX, targetY)
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
          ;[x0, y0] = movePoint(sourceX, sourceY, theta, -sourceRadius - this.reverseArrow.height)
          ;[arrowX0, arrowY0] = movePoint(sourceX, sourceY, theta, -sourceRadius)
          this.reverseArrow.update(arrowX0, arrowY0, theta + Math.PI, color, opacity)
        } else {
          ;[x0, y0] = movePoint(sourceX, sourceY, theta, -sourceRadius)
        }

        if (nextArrow === 'forward' || nextArrow == 'both') {
          ;[x1, y1] = movePoint(targetX, targetY, theta, targetRadius + this.forwardArrow.height)
          ;[arrowX1, arrowY1] = movePoint(targetX, targetY, theta, targetRadius)
          this.forwardArrow.update(arrowX1, arrowY1, theta, color, opacity)
        } else {
          ;[x1, y1] = movePoint(targetX, targetY, theta, targetRadius)
        }

        // Update Edge LineSegment
        this.lineSegment.update(x0, y0, x1, y1, width, theta, color, opacity)

        // Update Hit Area
        this.eventHandler.update(arrowX0 ?? x0, arrowY0 ?? y0, arrowX1 ?? x1, arrowY1 ?? y1, width)
      }

      this.sourceX = sourceX
      this.sourceY = sourceY
      this.targetX = targetX
      this.targetY = targetY
      this.edge = nextEdge
    }

    return this
  }

  delete() {
    this.lineSegment.exit()
    this.forwardArrow.exit()
    this.reverseArrow.exit()
  }
}
