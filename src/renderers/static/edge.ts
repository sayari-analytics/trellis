import { StaticRenderer } from '.'
import * as Graph from '../../'


const DEFAULT_EDGE_WIDTH = 1
const DEFAULT_EDGE_COLOR = 0xaaaaaa


export class EdgeRenderer {

  edge: Graph.Edge
  #renderer: StaticRenderer

  constructor(renderer: StaticRenderer, edge: Graph.Edge) {
    this.edge = edge
    this.#renderer = renderer

    const source = this.#renderer.nodesById[edge.source].node
    const target = this.#renderer.nodesById[edge.target].node

    this.#renderer.edgesGraphic
      .lineStyle(
        this.edge.style?.width ?? DEFAULT_EDGE_WIDTH,
        this.edge.style?.stroke ?? DEFAULT_EDGE_COLOR,
        this.edge.style?.strokeOpacity ?? 1
      )
      .moveTo(source.x ?? 0, source.y ?? 0)
      .lineTo(target.x ?? 0, target.y ?? 0)
  }

  render() {

  }
}
