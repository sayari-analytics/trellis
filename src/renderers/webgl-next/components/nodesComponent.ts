import { IComponent } from '.'
import type { Renderer } from '..'
import { NodeRenderer } from '../objects/node'
import type { Node } from '../../..'

export class NodesComponent implements IComponent {
  nodes: Node[] = []
  renderIdx = 0
  nodeComponents = new Map<string, NodeRenderer>()
  renderedNodes = false

  constructor(private renderer: Renderer) {}

  render(dt: number, nextNodes: Node[] = this.nodes) {
    if (nextNodes !== this.nodes) {
      let edgeUpdateCount = 0
      this.renderIdx++

      for (let i = 0; i < nextNodes.length; i++) {
        const node = nextNodes[i]
        const nodeComponent = this.nodeComponents.get(node.id)

        if (nodeComponent === undefined) {
          // enter
          this.nodeComponents.set(node.id, new NodeRenderer(this.renderer).style(dt, node).position(dt))
        } else {
          // update
          nodeComponent.style(dt, node).position(dt)
          nodeComponent.renderIdx = this.renderIdx
          edgeUpdateCount++
        }
      }

      if (this.nodes.length > edgeUpdateCount) {
        for (let i = 0; i < this.nodes.length; i++) {
          const node = this.nodes[i]
          const nodeComponent = this.nodeComponents.get(node.id)

          if (nodeComponent && nodeComponent.renderIdx !== this.renderIdx) {
            // exit
            nodeComponent.exit()
            this.nodeComponents.delete(nodeComponent.node!.id)
          }
        }
      }

      this.nodes = nextNodes
      this.renderedNodes = this.nodes.length > 0
    } else {
      for (const nodeComponent of this.nodeComponents.values()) {
        nodeComponent.position(dt)
      }
    }

    return this
  }

  delete() {
    for (const nodeComponent of this.nodeComponents.values()) {
      nodeComponent.exit()
    }
  }
}
