import { SimulationNodeDatum } from 'd3-force'
import { Simulation, LayoutResultEvent, TypedMessageEvent, DEFAULT_SIMULATION_OPTIONS, SimulationOptions } from './simulation'
import { NodeStyle, EdgeStyle } from './renderers/options'
import { noop } from './utils'


export type Node = {
  id: string
  label?: string
  style?: Partial<NodeStyle>
  subGraph?: {
    nodes: Node[],
    edges: Edge[],
    options?: Partial<SimulationOptions>
  }
}
export type Edge = {
  id: string
  label?: string
  source: string
  target: string
  style?: Partial<EdgeStyle>
}

export type PositionedNode = Node
  & SimulationNodeDatum
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
  handler: (graph: { nodes: PositionedNode[], edges: PositionedEdge[] }) => void = noop
  options: SimulationOptions = DEFAULT_SIMULATION_OPTIONS

  constructor() {
    const { worker, dispose } = Simulation()
    this.worker = worker
    this.dispose = dispose
    this.worker.onmessage = (event: TypedMessageEvent<LayoutResultEvent>) => {
      this.handler(event.data)
    }
  }

  layout = ({
    nodes,
    edges,
    options: {
      strength = DEFAULT_SIMULATION_OPTIONS.strength,
      tick = DEFAULT_SIMULATION_OPTIONS.tick,
      distance = DEFAULT_SIMULATION_OPTIONS.distance,
      nodeWidth = DEFAULT_SIMULATION_OPTIONS.nodeWidth,
      nodePadding = DEFAULT_SIMULATION_OPTIONS.nodePadding,
    } = {}
  }: {
    nodes: Node[],
    edges: Edge[],
    options?: Partial<SimulationOptions>
  }) => {
    // TODO - noop on nodes/edges/options equality
    // TODO - does it make sense to only serialize node ids and edge id/source/target? e.g. drop style and remerge
    this.options = { strength, tick, distance, nodeWidth, nodePadding }
    this.worker.postMessage({
      type: 'layout',
      nodes,
      edges,
      options: this.options
    })
    return this
  }

  onLayout = (handler: (graph: { nodes: PositionedNode[], edges: PositionedEdge[] }) => void) => {
    this.handler = handler
    return this
  }

  dragStart = (id: string, x: number, y: number) => {
    this.worker.postMessage({ type: 'dragStart', id, x, y })
    return this
  }

  drag = (id: string, x: number, y: number) => {
    this.worker.postMessage({ type: 'drag', id, x, y })
    return this
  }

  dragEnd = (id: string) => {
    this.worker.postMessage({ type: 'dragEnd', id })
    return this
  }
}
