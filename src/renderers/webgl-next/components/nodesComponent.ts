import { IComponent } from '.'
import { NodeComponent } from './nodeComponent'
import type { Renderer } from '..'
import type { Node } from '../../..'

export class NodesComponent implements IComponent {
  nodes: Node[] = []
  renderIdx = 0
  nodeComponents = new Map<string, NodeComponent>()
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
          this.nodeComponents.set(node.id, new NodeComponent(this.renderer).render(dt, node))
        } else {
          // update
          nodeComponent.render(dt, node)
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
            nodeComponent.delete()
            this.nodeComponents.delete(nodeComponent.node!.id)
          }
        }
      }

      this.nodes = nextNodes
      this.renderedNodes = this.nodes.length > 0
    } else {
      for (const nodeComponent of this.nodeComponents.values()) {
        nodeComponent.render(dt, nodeComponent.node!)
      }
    }

    return this
  }

  delete() {
    for (const nodeComponent of this.nodeComponents.values()) {
      nodeComponent.delete()
    }
  }
}
