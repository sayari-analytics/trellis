import { Graphics, Sprite } from 'pixi.js-legacy'
import { MIN_EDGES_ZOOM, StaticRenderer } from '.'
import { angle, movePoint } from './utils'
import { NodeRenderer } from './node'
import * as Graph from '../../'


const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = 0xaaaaaa
const DEFAULT_ARROW = 'none'


export class EdgeRenderer {

  edge?: Graph.Edge

  renderer: StaticRenderer
  edgeGraphic = new Graphics()
  source!: NodeRenderer
  target!: NodeRenderer
  x0?: number
  y0?: number
  x1?: number
  y1?: number
  width?: number
  stroke?: string | number
  strokeOpacity?: number
  sourceRadius?: number
  targetRadius?: number
  mounted = false

  private arrow?: { forward: Sprite, reverse?: undefined } |
    { forward?: undefined, reverse: Sprite } |
    { forward: Sprite, reverse: Sprite }

  constructor(renderer: StaticRenderer, edge: Graph.Edge, source: NodeRenderer, target: NodeRenderer) {
    this.renderer = renderer
    this.update(edge, source, target)
  }

  update(edge: Graph.Edge, source: NodeRenderer, target: NodeRenderer) {
    this.source = source
    this.target = target

    /**
     * Arrow
     */
    const arrow = edge.style?.arrow ?? DEFAULT_ARROW
    if (arrow !== (this.edge?.style?.arrow ?? DEFAULT_ARROW)) {
      this.arrow?.forward?.destroy()
      this.arrow?.reverse?.destroy()
      this.arrow = undefined

      const stroke = this.edge?.style?.stroke ?? DEFAULT_EDGE_COLOR
      const strokeOpacity = this.edge?.style?.strokeOpacity ?? 1

      if (arrow === 'forward') {
        this.arrow = { forward: this.renderer.arrow.create() }
        this.arrow.forward.scale.set(1 / this.renderer.arrow.scaleFactor)
        this.arrow.forward.tint = stroke
        this.arrow.forward.alpha = strokeOpacity
      } else if (arrow === 'reverse') {
        this.arrow = { reverse: this.renderer.arrow.create() }
        this.arrow.reverse.scale.set(1 / this.renderer.arrow.scaleFactor)
        this.arrow.reverse.tint = stroke
        this.arrow.reverse.alpha = strokeOpacity
      } else if (arrow === 'both') {
        this.arrow = {
          forward: this.renderer.arrow.create(),
          reverse: this.renderer.arrow.create(),
        }
        this.arrow.forward.scale.set(1 / this.renderer.arrow.scaleFactor)
        this.arrow.reverse.scale.set(1 / this.renderer.arrow.scaleFactor)
        this.arrow.forward.tint = stroke
        this.arrow.reverse.tint = stroke
        this.arrow.forward.alpha = strokeOpacity
        this.arrow.reverse.alpha = strokeOpacity
      }
    }

    this.edge = edge

    return this
  }

  render() {
    const x0 = this.source.node?.x ?? 0
    const y0 = this.source.node?.y ?? 0
    const sourceRadius = this.source.maxStrokeRadius
    const x1 = this.target.node?.x ?? 0
    const y1 = this.target.node?.y ?? 0
    const targetRadius = this.target.maxStrokeRadius

    if (this.visible(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1))) {
      if (!this.mounted) {
        this.renderer.edgesContainer.addChild(this.edgeGraphic)
        if (this.arrow?.forward) {
          this.renderer.edgesContainer.addChild(this.arrow.forward)
        }
        if (this.arrow?.reverse) {
          this.renderer.edgesContainer.addChild(this.arrow.reverse)
        }
        this.mounted = true
      }

      // this.edgeGraphic.alpha = this.renderer.zoom <= MIN_EDGES_ZOOM + 0.1 ?
      //   (this.renderer.zoom - MIN_EDGES_ZOOM) / MIN_EDGES_ZOOM + 0.1 : 1

      const width = this.edge?.style?.width ?? DEFAULT_EDGE_WIDTH
      const stroke = this.edge?.style?.stroke ?? DEFAULT_EDGE_COLOR
      const strokeOpacity = this.edge?.style?.strokeOpacity ?? 1

      if (
        x0 !== this.x0 || y0 !== this.y0 || x1 !== this.x1 || y1 !== this.y1 ||
        sourceRadius !== this.sourceRadius || targetRadius !== this.targetRadius ||
        width !== this.width || stroke !== this.stroke || strokeOpacity !== this.strokeOpacity
      ) {
        this.width = width
        this.stroke = stroke
        this.strokeOpacity = strokeOpacity
        this.sourceRadius = sourceRadius
        this.targetRadius = targetRadius

        if (!this.arrow) {
          this.x0 = x0
          this.y0 = y0
          this.x1 = x1
          this.y1 = y1
        } else {
          const theta = angle(x0, y0, x1, y1)

          if (this.arrow.forward) {
            const [edgeX1, edgeY1] = movePoint(x1, y1, theta, this.targetRadius + this.arrow.forward.height)
            const [arrowX1, arrowY1] = movePoint(x1, y1, theta, this.targetRadius)
            this.x1 = edgeX1
            this.y1 = edgeY1
            this.arrow.forward.tint = stroke
            this.arrow.forward.alpha = strokeOpacity
            this.arrow.forward.x = arrowX1
            this.arrow.forward.y = arrowY1
            this.arrow.forward.rotation = theta
          } else {
            this.x1 = x1
            this.y1 = y1
          }

          if (this.arrow.reverse) {
            const [edgeX0, edgeY0] = movePoint(x1, y1, theta, -targetRadius - this.arrow.reverse.height)
            const [arrowX0, arrowY0] = movePoint(x0, y0, theta, -targetRadius)
            this.x0 = edgeX0
            this.y0 = edgeY0
            this.arrow.reverse.tint = stroke
            this.arrow.reverse.alpha = strokeOpacity
            this.arrow.reverse.x = arrowX0
            this.arrow.reverse.y = arrowY0
            this.arrow.reverse.rotation = theta
          } else {
            this.x0 = x0
            this.y0 = y0
          }
        }

        this.edgeGraphic.clear()
        this.edgeGraphic
          .lineStyle(width, stroke, strokeOpacity)
          .moveTo(this.x0, this.y0)
          .lineTo(this.x1, this.y1)
      }
    } else {
      if (this.mounted) {
        this.renderer.edgesContainer.removeChild(this.edgeGraphic)
        if (this.arrow?.forward) {
          this.renderer.edgesContainer.removeChild(this.arrow.forward)
        }
        if (this.arrow?.reverse) {
          this.renderer.edgesContainer.removeChild(this.arrow.reverse)
        }
        this.mounted = false
      }
    }
  }

  delete() {

  }

  private visible(minX: number, minY: number, maxX: number, maxY: number) {
    // TODO - also calculate whether edge intersects with any of the 4 bbox edges
    return this.renderer.zoom > MIN_EDGES_ZOOM &&
      maxX >= this.renderer.minX && minX <= this.renderer.maxX &&
      maxY >= this.renderer.minY && minY <= this.renderer.maxY
  }
}
