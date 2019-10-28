import { forceSimulation, forceManyBody, forceCenter, forceLink, SimulationNodeDatum } from 'd3-force'
import { Subject } from 'rxjs'


export type Node = { id: string, label?: string } // TODO add style properties
export type Edge = { id: string, label?: string, source: string, target: string } // TODO add style properties
export type PositionedNode = Node & SimulationNodeDatum
export type PositionedEdge = { id: string, label?: string, source: PositionedNode, target: PositionedNode, index?: number }
export type Options = {
  nodeRepulsion: number
  synchronous: number | false
}

const DEFAULT_OPTIONS: Options = {
  nodeRepulsion: 250,
  synchronous: 300,
}


export class Graph {

  nodeMap: { [key: string]: Node } = {}
  edgeMap: { [key: string]: Edge } = {}

  nodes: { [key: string]: PositionedNode } = {}
  edges: { [key: string]: PositionedEdge } = {}
  options: Options = DEFAULT_OPTIONS

  simulation = forceSimulation<PositionedNode, PositionedEdge>()
    .force('charge', forceManyBody().strength(-this.options.nodeRepulsion))
    .force('center', forceCenter())
    .stop()

  layout$: Subject<{ nodes: { [id: string]: PositionedNode }, edges: { [id: string]: PositionedEdge } }> = new Subject()

  layout = ({ nodes, edges, options: { nodeRepulsion = DEFAULT_OPTIONS.nodeRepulsion, synchronous = DEFAULT_OPTIONS.synchronous } = {} }: {
    nodes?: { [key: string]: Node },
    edges?: { [key: string]: Edge },
    options?: Partial<Options>
  } = {}) => {
    this.layout$.complete()
    this.layout$ = new Subject()

    let update = false

    if (nodeRepulsion !== this.options.nodeRepulsion) {
      this.simulation.force('charge', forceManyBody().strength(-nodeRepulsion))
      this.options = { ...this.options, nodeRepulsion }
      update = true
    }

    if (synchronous !== this.options.synchronous) {
      this.options = { ...this.options, synchronous }
      update = true
    }

    if (nodes && nodes !== this.nodeMap) {
      for (const nodeId in nodes) {
        if (this.nodeMap[nodeId] === undefined) {
          // enter
          this.nodes[nodeId] = { ...nodes[nodeId] }
          update = true
        } else if (this.nodeMap[nodeId] !== nodes[nodeId]) {
          // update
          this.nodes[nodeId] = { ...this.nodes[nodeId], ...nodes[nodeId] }
          update = true
        }
      }

      for (const nodeId in this.nodes) {
        if (nodes[nodeId] === undefined) {
          // exit
          delete this.nodes[nodeId]
          update = true
        }
      }

      this.nodeMap = nodes
    }

    if (edges && edges !== this.edgeMap) {
      for (const edgeId in edges) {
        if (this.edgeMap[edgeId] === undefined) {
          // enter
          this.edges[edgeId] = {
            id: edges[edgeId].id,
            label: edges[edgeId].label,
            source: this.nodes[edges[edgeId].source],
            target: this.nodes[edges[edgeId].target]
          }
          update = true
        } else if (this.edgeMap[edgeId] !== edges[edgeId]) {
          // update
          this.edges[edgeId] = {
            id: edges[edgeId].id,
            label: edges[edgeId].label,
            source: this.nodes[edges[edgeId].source],
            target: this.nodes[edges[edgeId].target]
          }
          update = true
        }
      }

      for (const edgeId in this.edges) {
        if (edges[edgeId] === undefined) {
          delete this.edges[edgeId]
          update = true
        }
      }

      this.edgeMap = edges
    }

    if (update) {
      if (this.options.synchronous) {
        this.simulation
          .nodes(Object.values(this.nodes))
          .force('link', forceLink<PositionedNode, PositionedEdge>(Object.values(this.edges)).id((node) => node.id))
          .alpha(1)
          .tick(this.options.synchronous)

        // to allow the simulation to be restarted without calling the layout function
        this.simulation
          .restart()
          .alpha(0)
          .on('tick', () => this.layout$.next({ nodes: this.nodes, edges: this.edges }))
      } else {
        this.simulation
          .nodes(Object.values(this.nodes))
          .force('link', forceLink<PositionedNode, PositionedEdge>(Object.values(this.edges)).id((node) => node.id))
          .alpha(1)
          .restart()
          .on('tick', () => this.layout$.next({ nodes: this.nodes, edges: this.edges }))
      }
    }

    return this.layout$
  }
}
