import { IRendererObject } from '.'
import type { NodeRenderer } from './node'
import { LineSegment } from './lineSegment'
import { Arrow } from './arrow'
import type { Renderer } from '..'
import { EdgeEventHandler } from '../eventHandlers/edgeEventHandler'
import { HALF_PI } from '../utils'
import type { Edge, ArrowStyle, Color } from '../../..'
import { DEFAULT_ARROW, DEFAULT_EDGE_COLOR, DEFAULT_EDGE_OPACITY, DEFAULT_EDGE_WIDTH } from '../../../utils/constants'

export class EdgeRenderer implements IRendererObject {
  edge?: Edge
  source: NodeRenderer
  target: NodeRenderer
  lineSegment: LineSegment
  forwardArrow: Arrow
  reverseArrow: Arrow
  eventHandler: EdgeEventHandler
  renderIdx = -1

  private arrowDirection: ArrowStyle = DEFAULT_ARROW
  private width = DEFAULT_EDGE_WIDTH
  private color: Color = DEFAULT_EDGE_COLOR
  private opacity = DEFAULT_EDGE_OPACITY
  private sourceX = Infinity
  private sourceY = Infinity
  private targetX = Infinity
  private targetY = Infinity

  constructor(
    private renderer: Renderer,
    source: NodeRenderer,
    target: NodeRenderer
  ) {
    this.source = source
    this.target = target
    this.lineSegment = new LineSegment(this.renderer.containers.edges)
    this.forwardArrow = new Arrow(this.renderer.containers.edges, this.renderer.textures.arrow)
    this.reverseArrow = new Arrow(this.renderer.containers.edges, this.renderer.textures.arrow)
    this.eventHandler = new EdgeEventHandler(this.renderer, this)
  }

  style(nextEdge: Edge) {
    if (nextEdge !== this.edge) {
      if (this.renderer.components.debug) {
        this.renderer.components.debug.edgeUpdateCount++
      }

      this.arrowDirection = nextEdge.style?.arrow ?? DEFAULT_ARROW
      this.width = nextEdge.style?.width ?? DEFAULT_EDGE_WIDTH
      this.color = nextEdge.style?.stroke ?? DEFAULT_EDGE_COLOR
      this.opacity = nextEdge.style?.strokeOpacity ?? DEFAULT_EDGE_OPACITY

      if (this.arrowDirection === 'forward' || this.arrowDirection === 'both') {
        this.forwardArrow.style(this.color, this.opacity)
      } else {
        this.forwardArrow.exit()
      }
      if (this.arrowDirection === 'reverse' || this.arrowDirection === 'both') {
        this.reverseArrow.style(this.color, this.opacity)
      } else {
        this.reverseArrow.exit()
      }

      this.lineSegment.style(this.width, this.color, this.opacity)

      this.edge = nextEdge
    }

    return this
  }

  position() {
    const sourceX = this.source.x ?? 0,
      sourceY = this.source.y ?? 0,
      targetX = this.target.x ?? 0,
      targetY = this.target.y ?? 0

    if (sourceX !== this.sourceX || sourceY !== this.sourceY || targetX !== this.targetX || targetY !== this.targetY) {
      const sourceRadius = this.source.strokes.radius ?? this.source.radius ?? 0,
        targetRadius = this.target.strokes.radius ?? this.target.radius ?? 0,
        dx = targetX - sourceX,
        dy = targetY - sourceY,
        theta = Math.atan2(dy, dx) + Math.PI,
        thetaPerpendicular = theta + HALF_PI,
        lengthSquared = dx ** 2 + dy ** 2

      if (lengthSquared <= (sourceRadius + targetRadius) ** 2) {
        // edge is shorter than the source/target node's combined radius, don't render
        this.forwardArrow.hide()
        this.reverseArrow.hide()
        this.lineSegment.hide()
      } else {
        this.forwardArrow.show()
        this.reverseArrow.show()
        this.lineSegment.show()

        let x0: number, y0: number, x1: number, y1: number

        // Update Edge Arrows
        if (this.arrowDirection === 'reverse' || this.arrowDirection === 'both') {
          const arrowX0 = sourceX + Math.cos(theta) * -sourceRadius
          const arrowY0 = sourceY + Math.sin(theta) * -sourceRadius
          this.reverseArrow.position(arrowX0, arrowY0, thetaPerpendicular + Math.PI)

          const radiusPlusArrowLength = sourceRadius + this.reverseArrow.height
          x0 = sourceX + Math.cos(theta) * -radiusPlusArrowLength
          y0 = sourceY + Math.sin(theta) * -radiusPlusArrowLength
        } else {
          x0 = sourceX + Math.cos(theta) * -sourceRadius
          y0 = sourceY + Math.sin(theta) * -sourceRadius
        }

        if (this.arrowDirection === 'forward' || this.arrowDirection === 'both') {
          const arrowX1 = targetX + Math.cos(theta) * targetRadius
          const arrowY1 = targetY + Math.sin(theta) * targetRadius
          this.forwardArrow.position(arrowX1, arrowY1, thetaPerpendicular)

          const radiusPlusArrowLength = targetRadius + this.forwardArrow.height
          x1 = targetX + Math.cos(theta) * radiusPlusArrowLength
          y1 = targetY + Math.sin(theta) * radiusPlusArrowLength
        } else {
          x1 = targetX + Math.cos(theta) * targetRadius
          y1 = targetY + Math.sin(theta) * targetRadius
        }

        const edgeLengthSquared = (x1 - x0) ** 2 + (y1 - y0) ** 2

        // Update Edge LineSegment
        this.lineSegment.position(x0, y0, thetaPerpendicular, Math.sqrt(edgeLengthSquared))

        // Update Hit Area
        this.eventHandler.update(x0, y0, x1, y1, this.width, edgeLengthSquared)
      }

      this.sourceX = sourceX
      this.sourceY = sourceY
      this.targetX = targetX
      this.targetY = targetY
    }

    return this
  }

  exit() {
    this.lineSegment.exit()
    this.forwardArrow.exit()
    this.reverseArrow.exit()
  }
}
