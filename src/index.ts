import { SimulationNodeDatum } from 'd3-force'
import { Simulation, LayoutResultEvent, TypedMessageEvent, DEFAULT_SIMULATION_OPTIONS, SimulationOptions } from './simulation'
import { NodeStyle, EdgeStyle } from './renderers/options'


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

export type PositionedNode = Node
  & SimulationNodeDatum
  & { x0?: number, y0?: number }
export type PositionedEdge = {
  id: string
  label?: string
  source: PositionedNode
  target: PositionedNode
  index?: number
  style?: Partial<EdgeStyle>
}


export class Graph {

  worker: Worker
  dispose: () => void
  handler: (graph: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge } }) => void

  nodes: { [key: string]: PositionedNode } = {}
  edges: { [key: string]: PositionedEdge } = {}
  options: SimulationOptions = DEFAULT_SIMULATION_OPTIONS

  constructor(handler: (graph: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge } }) => void) {
    const { worker, dispose } = Simulation()
    this.worker = worker
    this.dispose = dispose
    this.handler = handler
    this.worker.onmessage = (event: TypedMessageEvent<LayoutResultEvent>) => {
      this.nodes = event.data.nodes
      this.edges = event.data.edges
      this.handler(event.data)
    }
  }

  layout = ({ nodes, edges, options: { strength = DEFAULT_SIMULATION_OPTIONS.strength, tick = DEFAULT_SIMULATION_OPTIONS.tick } = {} }: {
    nodes: { [key: string]: Node },
    edges: { [key: string]: Edge },
    options?: Partial<SimulationOptions>
  }) => {
    // TODO - noop on nodes/edges/options equality
    // TODO - does it make sense to only serialize node ids and edge id/source/target? e.g. drop style and remerge 
    this.worker.postMessage({ type: 'layout', nodes, edges, options: { strength, tick } })
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
}
