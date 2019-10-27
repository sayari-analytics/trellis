import { forceSimulation, forceManyBody, forceCenter, forceLink, SimulationNodeDatum } from 'd3-force'


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

  nodeMap: { [key: string]: Node } = {}
  edgeMap: { [key: string]: Edge } = {}

  nodes: { [key: string]: SimulatedNode } = {}
  edges: { [key: string]: SimulatedEdge } = {}
  options: Options = DEFAULT_OPTIONS

  simulation = forceSimulation<SimulatedNode, SimulatedEdge>()
    .force('charge', forceManyBody().strength(-this.options.nodeRepulsion))
    .force('center', forceCenter())
    .stop()

  layout(props: {
    nodes?: { [key: string]: Node },
    edges?: { [key: string]: Edge },
    options?: Partial<Options>
  } = {}) {
    let update = false

    if (props.options !== undefined && props.options !== this.options) {
      if (props.options.nodeRepulsion && props.options.nodeRepulsion !== this.options.nodeRepulsion) {
        this.simulation.force('charge', forceManyBody().strength(-props.options.nodeRepulsion))
        update = true
      }
      
      this.options = { ...this.options, ...props.options }
    }

    if (props.nodes && props.nodes !== this.nodeMap) {
      for (const nodeId in props.nodes) {
        if (this.nodeMap[nodeId] === undefined) {
          // enter
          this.nodes[nodeId] = { ...props.nodes[nodeId] }
          update = true
        } else if (this.nodeMap[nodeId] !== props.nodes[nodeId]) {
          // update
          this.nodes[nodeId] = { ...this.nodes[nodeId], ...props.nodes[nodeId] }
          update = true
        }
      }

      for (const nodeId in this.nodes) {
        if (props.nodes[nodeId] === undefined) {
          // exit
          delete this.nodes[nodeId]
          update = true
        }
      }

      this.nodeMap = props.nodes
    }

    if (props.edges && props.edges !== this.edgeMap) {
      for (const edgeId in props.edges) {
        if (this.edgeMap[edgeId] === undefined) {
          // enter
          this.edges[edgeId] = {
            id: props.edges[edgeId].id,
            label: props.edges[edgeId].label,
            source: this.nodes[props.edges[edgeId].source],
            target: this.nodes[props.edges[edgeId].target]
          }
          update = true
        } else if (this.edgeMap[edgeId] !== props.edges[edgeId]) {
          // update
          this.edges[edgeId] = {
            id: props.edges[edgeId].id,
            label: props.edges[edgeId].label,
            source: this.nodes[props.edges[edgeId].source],
            target: this.nodes[props.edges[edgeId].target]
          }
          update = true
        }
      }

      for (const edgeId in this.edges) {
        if (props.edges[edgeId] === undefined) {
          delete this.edges[edgeId]
          update = true
        }
      }

      this.edgeMap = props.edges
    }

    
    if (update) {
      this.simulation
        .nodes(Object.values(this.nodes))
        .force('link', forceLink<SimulatedNode, SimulatedEdge>(Object.values(this.edges)).id((node) => node.id))
        .alpha(1)
    }

    return this.simulation
  }
}
