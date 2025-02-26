import type { IComponent } from '.'
import { EdgeComponent } from './edgeComponent'
import type { Renderer } from '..'
import { logUnknownEdgeError } from '../utils'
import type { Edge } from '../../..'

export class EdgesComponent implements IComponent {
  edges: Edge[] = []
  edgeComponents: { [srcNodeId: string]: { [dstNodeId: string]: EdgeComponent } } = {}

  constructor(private renderer: Renderer) {}

  render(nextEdges: Edge[] | undefined, nodesChanged: boolean) {
    let renderCount = 0
    const shouldCullEdges = this.renderer.components.viewport.previousViewportChanged && !this.renderer.components.viewport.viewportChanged

    if (nextEdges !== undefined) {
      if (nextEdges !== this.edges || shouldCullEdges) {
        const edgeComponents: { [srcNodeId: string]: { [dstNodeId: string]: EdgeComponent } } = {}

        for (const edge of nextEdges) {
          if (this.edgeComponents[edge.source]?.[edge.target] === undefined) {
            // enter
            const source = this.renderer.components.nodes.nodeComponents[edge.source]
            const target = this.renderer.components.nodes.nodeComponents[edge.target]

            if (source === undefined || target === undefined) {
              logUnknownEdgeError(edge)
              continue
            }

            edgeComponents[edge.source] ??= {}
            edgeComponents[edge.source][edge.target] = new EdgeComponent(this.renderer, source, target).render(edge)
            renderCount++
          } else {
            // update
            edgeComponents[edge.source] ??= {}
            edgeComponents[edge.source][edge.target] = this.edgeComponents[edge.source][edge.target].render(edge)
            renderCount++
          }
        }

        if (nextEdges.length !== this.edges.length) {
          for (const edge of this.edges) {
            if (edgeComponents[edge.source]?.[edge.target] === undefined) {
              // exit
              this.edgeComponents[edge.source][edge.target].delete()
              renderCount++
            }
          }
        }

        this.edges = nextEdges
        this.edgeComponents = edgeComponents
      } else if (nodesChanged) {
        // TODO - make nodeComponent.render automatically update edgeComponent
        for (const edge of this.edges) {
          this.edgeComponents[edge.source][edge.target].render(edge)
        }
      }
    } else {
      if (shouldCullEdges) {
        for (const edge of this.edges) {
          this.edgeComponents[edge.source][edge.target].render(edge)
        }
      }
    }

    this.renderer.debug?.updateEdgeCountPanel?.update(renderCount, 100)

    return this
  }

  delete() {
    for (const edge of this.edges) {
      this.edgeComponents[edge.source][edge.target].delete()
    }
  }
}
