import { forceSimulation, forceManyBody, forceCenter, forceLink, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'
import { Observable, BehaviorSubject } from 'rxjs'


type Node = SimulationNodeDatum & { id: string, label: string } // TODO add style properties
type Edge = SimulationLinkDatum<Node> & { label: string } // TODO add style properties
type Options = {
  nodeRepulsion: number
  iterations: number
}

const DEFAULT_OPTIONS = {
  nodeRepulsion: 250,
  iterations: 300,
}


export class Graph {

  nodes: { [key: string]: Node } = {}
  edges: { [key: string]: Edge } = {}
  options: Options = DEFAULT_OPTIONS

  simulation = forceSimulation<Node, Edge>()
    .force('charge', forceManyBody().strength(-this.options.nodeRepulsion))
    .force('center', forceCenter())
    .stop()

  source = new BehaviorSubject({ nodes: this.nodes, edges: this.edges })

  layout(props: {
    nodes?: { [key: string]: Node },
    edges?: { [key: string]: Edge },
    options?: Partial<Options>
  } = {}): Observable<{
    nodes: { [key: string]: Node },
    edges: { [key: string]: Edge },
  }> {
    if (props.options !== undefined && props.options !== this.options) {
      if (props.options.nodeRepulsion && props.options.nodeRepulsion !== this.options.nodeRepulsion) {
        this.simulation.force('charge', forceManyBody().strength(-props.options.nodeRepulsion))
      }
      
      this.options = { ...this.options, ...props.options }
    }

    if (props.nodes && props.nodes !== this.nodes) {
      for (const nodeId in props.nodes) {
        if (this.nodes[nodeId] === undefined) {
          // enter
        } else if (this.nodes[nodeId] !== props.nodes[nodeId]) {
          // update
        }
      }

      for (const nodeId in this.nodes) {
        if (props.nodes[nodeId] === undefined) {
          // exit
        }
      }

      this.nodes = props.nodes
    }

    if (props.edges && props.edges !== this.edges) {
      for (const edgeId in props.edges) {
        if (this.edges[edgeId] === undefined) {
          // enter
          // set props.edges[edgeId] source and target
        } else if (this.edges[edgeId] !== props.edges[edgeId]) {
          // update
          // set props.edges[edgeId] source and target
        }
      }

      for (const edgeId in this.edges) {
        if (props.edges[edgeId] === undefined) {
          // exit
        }
      }

      this.edges = props.edges
    }

    this.simulation
      .nodes(Object.values(this.nodes))
      .force('link', forceLink<Node, Edge>(Object.values(this.edges)).id((node) => node.id))
      // .on('tick', () => this.source.next({ nodes: this.nodes, edges: this.edges, progress: 0 }))
      // .on('end', () => this.source.next({ nodes: this.nodes, edges: this.edges, progress: 1 }))
      .stop()
      .tick(this.options.iterations)

    this.source.next({ nodes: this.nodes, edges: this.edges })

    return this.source
  }
}
