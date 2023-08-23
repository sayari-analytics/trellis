import { StaticRenderer } from '.'
import * as Graph from '../../'


export class Edge {

  #renderer: StaticRenderer
  #source: Graph.Node
  #target: Graph.Node

  constructor(renderer: StaticRenderer, source: Graph.Node, target: Graph.Node) {
    this.#renderer = renderer
    this.#source = source
    this.#target = target
    this.#renderer.edgesGraphic
      .lineStyle(1, '#aaa')
      .moveTo(source.x ?? 0, source.y ?? 0)
      .lineTo(target.x ?? 0, target.y ?? 0)
  }

  render() {

  }
}
