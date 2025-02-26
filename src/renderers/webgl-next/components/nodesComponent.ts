import { IComponent } from '.'
import { NodeComponent } from './nodeComponent'
import type { Renderer } from '..'
import type { Node } from '../../..'

export class NodesComponent implements IComponent {
  nodes: Node[] = []
  nodeComponents: { [id: string]: NodeComponent } = {}

  constructor(private renderer: Renderer) {}

  render(dt: number, nextNodes?: Node[]) {
    let renderCount = 0
    const shouldCullNodes = this.renderer.components.viewport.previousViewportChanged && !this.renderer.components.viewport.viewportChanged

    if (nextNodes !== undefined) {
      if (nextNodes !== this.nodes || shouldCullNodes) {
        const nodeComponents: { [id: string]: NodeComponent } = {}

        for (const node of nextNodes) {
          if (this.nodeComponents[node.id] === undefined) {
            // enter
            nodeComponents[node.id] = new NodeComponent(this.renderer).render(dt, node)
            renderCount++
          } else {
            // update
            nodeComponents[node.id] = this.nodeComponents[node.id].render(dt, node)
            renderCount++
          }
        }

        if (nextNodes.length !== this.nodes.length) {
          for (const node of this.nodes) {
            if (nodeComponents[node.id] === undefined) {
              // exit
              this.nodeComponents[node.id].delete()
              renderCount++
            }
          }
        }

        this.nodes = nextNodes
        this.nodeComponents = nodeComponents
      }
    } else {
      if (shouldCullNodes) {
        for (const node of this.nodes) {
          this.nodeComponents[node.id].render(dt, node)
        }
      }
    }

    this.renderer.debug?.updateNodeCountPanel?.update(renderCount, 100)

    return this
  }

  delete() {
    for (const node of this.nodes) {
      this.nodeComponents[node.id].delete()
    }
  }
}
