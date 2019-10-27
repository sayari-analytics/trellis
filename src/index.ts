import { forceSimulation, forceManyBody, forceCenter, forceLink, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'
import { Observable, BehaviorSubject } from 'rxjs'


export type Node = { id: string, label?: string } // TODO add style properties
export type Edge = { id: string, label?: string, source: string, target: string } // TODO add style properties
export type SimulatedNode = Node & SimulationNodeDatum
export type SimulatedEdge = { id: string, label?: string, source: SimulatedNode, target: SimulatedNode, index?: number }
export type Options = {
  nodeRepulsion: number
  iterations: number
}

const DEFAULT_OPTIONS = {
  nodeRepulsion: 250,
  iterations: 300,
}


export class Graph {

  previousNodes: { [key: string]: Node } = {}
  previousEdges: { [key: string]: Edge } = {}

  nodes: { [key: string]: SimulatedNode } = {}
  edges: { [key: string]: SimulatedEdge } = {}
  options: Options = DEFAULT_OPTIONS

  simulation = forceSimulation<SimulatedNode, SimulatedEdge>()
    .force('charge', forceManyBody().strength(-this.options.nodeRepulsion))
    .force('center', forceCenter())
    .stop()

  source = new BehaviorSubject({ nodes: this.nodes, edges: this.edges })

  layout(props: {
    nodes?: { [key: string]: Node },
    edges?: { [key: string]: Edge },
    options?: Partial<Options>
  } = {}): Observable<{
    nodes: { [key: string]: SimulatedNode },
    edges: { [key: string]: SimulatedEdge },
  }> {
    if (props.options !== undefined && props.options !== this.options) {
      if (props.options.nodeRepulsion && props.options.nodeRepulsion !== this.options.nodeRepulsion) {
        this.simulation.force('charge', forceManyBody().strength(-props.options.nodeRepulsion))
      }
      
      this.options = { ...this.options, ...props.options }
    }

    if (props.nodes && props.nodes !== this.previousNodes) {
      for (const nodeId in props.nodes) {
        if (this.previousNodes[nodeId] === undefined) {
          // enter
          this.nodes[nodeId] = { ...props.nodes[nodeId] }
        } else if (this.previousNodes[nodeId] !== props.nodes[nodeId]) {
          // update
          this.nodes[nodeId] = { ...props.nodes[nodeId] }
        }
      }

      for (const nodeId in this.nodes) {
        if (props.nodes[nodeId] === undefined) {
          // exit
          delete this.nodes[nodeId]
        }
      }

      this.previousNodes = props.nodes
    }

    if (props.edges && props.edges !== this.previousEdges) {
      for (const edgeId in props.edges) {
        if (this.previousEdges[edgeId] === undefined) {
          // enter
          this.edges[edgeId] = {
            id: props.edges[edgeId].id,
            label: props.edges[edgeId].label,
            source: this.nodes[props.edges[edgeId].source],
            target: this.nodes[props.edges[edgeId].target]
          }
        } else if (this.previousEdges[edgeId] !== props.edges[edgeId]) {
          // update
          this.edges[edgeId] = {
            id: props.edges[edgeId].id,
            label: props.edges[edgeId].label,
            source: this.nodes[props.edges[edgeId].source],
            target: this.nodes[props.edges[edgeId].target]
          }
        }
      }

      for (const edgeId in this.edges) {
        if (props.edges[edgeId] === undefined) {
          delete this.edges[edgeId]
        }
      }

      this.previousEdges = props.edges
    }

    this.simulation
      .nodes(Object.values(this.nodes))
      .force('link', forceLink<SimulatedNode, SimulatedEdge>(Object.values(this.edges)).id((node) => node.id))
      // .on('tick', () => this.source.next({ nodes: this.nodes, edges: this.edges, progress: 0 }))
      // .on('end', () => this.source.next({ nodes: this.nodes, edges: this.edges, progress: 1 }))
      .on('tick', () => {
        this.source.next({ nodes: this.nodes, edges: this.edges })
      })
      .stop()
      .tick(this.options.iterations)

    this.source.next({ nodes: this.nodes, edges: this.edges })

    return this.source
  }
}
