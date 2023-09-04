import { Graphics } from 'pixi.js'
import { MIN_EDGES_ZOOM, StaticRenderer } from '.'
import * as Graph from '../../'


const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = 0xaaaaaa


export class EdgeRenderer {

  edge: Graph.Edge
  renderer: StaticRenderer
  graphic = new Graphics()
  source!: Graph.Node
  target!: Graph.Node
  x0?: number
  y0?: number
  x1?: number
  y1?: number
  width?: number
  stroke?: string | number
  strokeOpacity?: number
  mounted = false

  constructor(renderer: StaticRenderer, edge: Graph.Edge) {
    this.edge = edge
    this.renderer = renderer

    this.update(edge)
  }

  update(edge: Graph.Edge) {
    this.edge = edge

    this.source = this.renderer.nodeRenderersById[this.edge.source].node
    this.target = this.renderer.nodeRenderersById[this.edge.target].node

    return this
  }

  render() {
    const x0 = this.source.x ?? 0
    const y0 = this.source.y ?? 0
    const x1 = this.target.x ?? 0
    const y1 = this.target.y ?? 0

    if (this.visible(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1))) {
      if (!this.mounted) {
        this.renderer.edgesContainer.addChild(this.graphic)
        this.mounted = true
      }

      this.graphic.alpha = this.renderer.zoom <= MIN_EDGES_ZOOM + 0.1 ?
        (this.renderer.zoom - MIN_EDGES_ZOOM) / MIN_EDGES_ZOOM + 0.1 : 1

      const width = this.edge.style?.width ?? DEFAULT_EDGE_WIDTH
      const stroke = this.edge.style?.stroke ?? DEFAULT_EDGE_COLOR
      const strokeOpacity = this.edge.style?.strokeOpacity ?? 1

      if (
        x0 !== this.x0 || y0 !== this.y0 || x1 !== this.x1 || y1 !== this.y1 ||
        width !== this.width || stroke !== this.stroke || strokeOpacity !== this.strokeOpacity
      ) {
        this.x0 = x0
        this.y0 = y0
        this.x1 = x1
        this.y1 = y1
        this.width = width
        this.stroke = stroke
        this.strokeOpacity = strokeOpacity

        this.graphic.clear()
        this.graphic
          .lineStyle(width, stroke, strokeOpacity)
          .moveTo(this.x0, this.y0)
          .lineTo(this.x1, this.y1)
      }
    } else {
      if (this.mounted) {
        this.renderer.edgesContainer.removeChild(this.graphic)
        this.mounted = false
      }
    }
  }

  delete() {

  }

  private visible(minX: number, minY: number, maxX: number, maxY: number) {
    // TODO - also calculate whether edge intersects with any of the 4 bbox edges
    return this.renderer.zoom > 0.2 &&
      maxX >= this.renderer.minX && minX <= this.renderer.maxX &&
      maxY >= this.renderer.minY && minY <= this.renderer.maxY
  }
}
