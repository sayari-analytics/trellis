import { forceSimulation, forceManyBody, forceCenter, forceLink, SimulationNodeDatum } from 'd3-force'
import { Subject, Observable } from 'rxjs'
import { switchMap } from 'rxjs/operators'
import { Simulation } from './simulation'


export type Node = { id: string, label?: string } // TODO add style properties
export type Edge = { id: string, label?: string, source: string, target: string } // TODO add style properties
export type PositionedNode = Node & SimulationNodeDatum
export type PositionedEdge = { id: string, label?: string, source: PositionedNode, target: PositionedNode, index?: number }
export type Options = {
  strength: number
  synchronous: number | false
}

const DEFAULT_OPTIONS: Options = {
  strength: 250,
  synchronous: 300,
}


// convert this from object to function?
export class Graph {

  nodeMap: { [key: string]: Node } = {}
  edgeMap: { [key: string]: Edge } = {}

  nodes: { [key: string]: PositionedNode } = {}
  edges: { [key: string]: PositionedEdge } = {}
  options: Options = DEFAULT_OPTIONS

  simulation: (nodeMap: { [key: string]: PositionedNode }, edgeMap: { [key: string]: PositionedEdge }, options: Options, update: boolean) => Subject<{ nodes: PositionedNode[], edges: PositionedEdge[] }>

  constructor() {
    const { simulation, dispose } = Simulation()
    this.simulation = simulation
  }

  layout = ({ nodes, edges, options: { strength = DEFAULT_OPTIONS.strength, synchronous = DEFAULT_OPTIONS.synchronous } = {} }: {
    nodes?: { [key: string]: Node },
    edges?: { [key: string]: Edge },
    options?: Partial<Options>
  } = {}) => {
    let update = false

    if (strength !== this.options.strength) {
      this.options = { ...this.options, strength }
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


    return this.simulation(this.nodes, this.edges, this.options, update)
  }
}
