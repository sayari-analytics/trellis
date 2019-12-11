import { SimulationNodeDatum } from 'd3-force'
import { throttleAnimationFrame } from './utils'
import { simulation } from './simulation'


export type NodeStyle = {
  width: number
  strokeWidth: number
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity: number
}
export type EdgeStyle = {
  width: number
  stroke: string
  strokeOpacity: number
}

export type Node = {
  id: string
  label?: string
  style?: Partial<NodeStyle>
}
export type Edge = {
  id: string
  source: string
  target: string
  label?: string
  style?: Partial<EdgeStyle>
}

export type PositionedNode = Node & SimulationNodeDatum
export type PositionedEdge = { id: string, label?: string, source: PositionedNode, target: PositionedNode, index?: number, style?: Partial<EdgeStyle> }

export type Options = {
  strength: number
  synchronous: number | false
}


const DEFAULT_OPTIONS: Options = {
  strength: 250,
  synchronous: 300,
}

export const DEFAULT_NODE_STYLES: NodeStyle = {
  width: 12,
  strokeWidth: 1,
  fill: '#ff4b4b',
  stroke: '#bb0000',
  fillOpacity: 1,
  strokeOpacity: 1,
}

export const DEFAULT_EDGE_STYLES: EdgeStyle = {
  width: 1,
  stroke: '#444',
  strokeOpacity: 0.6
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
