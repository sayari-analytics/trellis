import { SimulationNodeDatum } from 'd3-force'
import { throttleAnimationFrame } from './utils'
import { simulation } from './simulation'


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


export class Graph {

  workerUrl: string
  worker: Worker
  handler: (graph: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge } }) => void

  nodes: { [key: string]: PositionedNode } = {}
  edges: { [key: string]: PositionedEdge } = {}
  options: Options = DEFAULT_OPTIONS

  constructor(handler: (graph: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge } }) => void) {
    this.workerUrl = URL.createObjectURL(simulation)
    this.worker = new Worker(this.workerUrl)
    this.handler = throttleAnimationFrame(handler)
    this.worker.onmessage = (event) => {
      this.nodes = event.data.nodes
      this.edges = event.data.edges
      this.handler(event.data)
    }
  }

  layout = ({ nodes, edges, options: { strength = DEFAULT_OPTIONS.strength, synchronous = DEFAULT_OPTIONS.synchronous } = {} }: {
    nodes: { [key: string]: Node },
    edges: { [key: string]: Edge },
    options?: Partial<Options>
  }) => {
    // TODO - noop on nodes/edges/options equality
    this.worker.postMessage({ type: 'layout', nodes, edges, options: { strength, synchronous } })
    return this
  }

  dragStart = (id: string, x: number, y: number) => {
    this.worker.postMessage({ type: 'dragStart', id, x, y })
    return this
  }

  drag = (id: string, x: number, y: number) => {
    this.nodes[id].x = x
    this.nodes[id].y = y
    this.handler({ nodes: this.nodes, edges: this.edges })
    this.worker.postMessage({ type: 'drag', id, x, y })
    return this
  }

  dragEnd = (id: string) => {
    this.worker.postMessage({ type: 'dragEnd', id })
    return this
  }

  tick = () => {
    this.worker.postMessage({ type: 'tick' })
    return this
  }

  dispose = () => {
    this.worker.terminate()
    URL.revokeObjectURL(this.workerUrl)
  }
}
