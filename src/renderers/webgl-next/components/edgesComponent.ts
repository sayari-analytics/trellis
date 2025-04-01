import type { IComponent } from '.'
import type { Renderer } from '..'
import { EdgeRenderer } from '../objects/edge'
import { logUnknownEdgeError } from '../utils'
import type { Edge } from '../../..'

export class EdgesComponent implements IComponent {
  edges: Edge[] = []
  renderIdx = 0
  edgeComponents = new Map<Edge, EdgeRenderer>()

  constructor(private renderer: Renderer) {}

  render(nextEdges: Edge[] = this.edges) {
    if (nextEdges !== this.edges) {
      let edgeUpdateCount = 0
      this.renderIdx++

      for (let i = 0; i < nextEdges.length; i++) {
        const edge = nextEdges[i]

        const edgeComponent = this.edgeComponents.get(edge)
        if (edgeComponent) {
          edgeComponent.renderIdx = this.renderIdx
          edgeUpdateCount++
        } else {
          const sourceNodeComponent = this.renderer.components.nodes.nodeComponents.get(edge.source)
          const targetNodeComponent = this.renderer.components.nodes.nodeComponents.get(edge.target)

          if (sourceNodeComponent === undefined || targetNodeComponent === undefined) {
            logUnknownEdgeError(edge)
            continue
          }

          const edgeComponent = sourceNodeComponent.outEdges.get(targetNodeComponent)
          if (edgeComponent === undefined) {
            // enter
            const edgeComponent = new EdgeRenderer(this.renderer, sourceNodeComponent, targetNodeComponent).style(edge).position()
            this.edgeComponents.set(edge, edgeComponent)
            sourceNodeComponent.outEdges.set(targetNodeComponent, edgeComponent)
            targetNodeComponent.inEdges.set(sourceNodeComponent, edgeComponent)
          } else {
            // update
            this.edgeComponents.delete(edgeComponent.edge!)
            this.edgeComponents.set(edge, edgeComponent)
            edgeComponent.style(edge)
            edgeComponent.renderIdx = this.renderIdx
            edgeUpdateCount++
          }
        }
      }

      if (this.edges.length > edgeUpdateCount) {
        for (let i = 0; i < this.edges.length; i++) {
          const edge = this.edges[i]
          const edgeComponent = this.edgeComponents.get(edge)

          if (edgeComponent && edgeComponent.renderIdx !== this.renderIdx) {
            // exit
            edgeComponent.exit()
            this.edgeComponents.delete(edge)

            const sourceNodeComponent = this.renderer.components.nodes.nodeComponents.get(edge.source)
            const targetNodeComponent = this.renderer.components.nodes.nodeComponents.get(edge.target)

            if (sourceNodeComponent === undefined || targetNodeComponent === undefined) {
              logUnknownEdgeError(edge)
              continue
            }

            sourceNodeComponent.outEdges.get(targetNodeComponent)?.exit()
            targetNodeComponent.inEdges.get(sourceNodeComponent)?.exit()
            sourceNodeComponent.outEdges.delete(targetNodeComponent)
            targetNodeComponent.inEdges.delete(sourceNodeComponent)
          }
        }
      }

      this.edges = nextEdges
    }

    return this
  }

  delete() {
    for (const edgeComponent of this.edgeComponents.values()) {
      edgeComponent.exit()
    }
  }
}
