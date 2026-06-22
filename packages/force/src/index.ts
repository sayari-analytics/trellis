import { GraphState } from '@sayari/trellis'
import { Simulation, SimulationOptions, ForceGraphViews } from './simulation'

/**
 * Minimal structural input types: the layout only needs an id, a radius, optional initial/pinned coordinates,
 * and edge endpoints. Any richer node/edge type (e.g. the trellis renderer's) is assignable, so callers can pass
 * their own objects without adapting them.
 */
export type Id = string | number
export type ForceNode = { id: Id; radius: number; x?: number; y?: number; fx?: number; fy?: number }
export type ForceEdge = { source: Id; target: Id }

/**
 * types
 */
export type GraphBuffer<N extends ForceNode, E extends ForceEdge> = {
  buffer: ArrayBufferLike
  nodes: N[]
  edges: E[]
}

export type ForceEvents<N extends ForceNode, E extends ForceEdge = ForceEdge> = {
  progress?: (percentage: number) => void
  complete?: (graph: { nodes: N[]; edges: E[] }) => void
  error?: (error: unknown) => void
}

export type Options = {
  mutate?: boolean
  ticks?: number
  ticksPerFrame?: number
  collidePadding?: number
  params?: SimulationOptions
}

export type ForceLayout = {
  views: () => ForceGraphViews
  simulation: () => Simulation
  reset: () => Simulation
  tick: (count?: number) => Simulation
  run: (ticks?: number) => Simulation
  start: () => void
  stop: () => void
  delete: () => void
}

export type { ForceGraphViews, SimulationOptions } from './simulation'
export { Simulation } from './simulation'

export const createForceGraphViews = (state: GraphState): ForceGraphViews => ({
  nodePositions: state.nodePositions,
  nodeRadii: state.nodeRadii,
  edgeEndpoints: state.edgeEndpoints,
  nodeCount: state.nodeSlotCount,
  edgeCount: state.edgeSlotCount
})

export const createForceLayout = (state: GraphState, options: Options = {}): ForceLayout => {
  const ticks = options?.ticks ?? 300
  const ticksPerFrame = options?.ticksPerFrame ?? 1
  const params = { ...options.params, collidePadding: options.collidePadding ?? options.params?.collidePadding }
  let simulation: Simulation | undefined
  let frame: number | undefined

  const reset = () => {
    simulation = new Simulation(createForceGraphViews(state), params)
    return simulation
  }

  const current = () => {
    if (
      simulation === undefined ||
      simulation.nodePositions !== state.nodePositions ||
      simulation.nodeRadii !== state.nodeRadii ||
      simulation.edgeEndpoints !== state.edgeEndpoints ||
      simulation.nodeCount !== state.nodeSlotCount ||
      simulation.edgeCount !== state.edgeSlotCount
    ) {
      return reset()
    }
    return simulation
  }

  const markDirty = (sim: Simulation) => state.markNodePositionsDirty(sim.dirtySlots())

  const tick = (count = 1) => {
    const sim = current()
    sim.tick(count)
    markDirty(sim)
    return sim
  }

  const run = (count = ticks) => {
    const sim = reset()
    sim.tick(count)
    markDirty(sim)
    return sim
  }

  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }

  const start = () => {
    stop()
    const step = () => {
      const sim = tick(ticksPerFrame)
      if (sim.alpha > sim.alphaMin) frame = requestAnimationFrame(step)
      else frame = undefined
    }
    frame = requestAnimationFrame(step)
  }

  return {
    views: () => createForceGraphViews(state),
    simulation: current,
    reset,
    tick,
    run,
    start,
    stop,
    delete: stop
  }
}

export const Layout = createForceLayout

/** Compatibility helper for object graphs. */
export const LayoutSync = (options?: Options) => {
  const mutate = options?.mutate ?? false
  const ticks = options?.ticks ?? 300

  return <N extends ForceNode, E extends ForceEdge>(graph: { nodes: N[]; edges: E[] }) => {
    const state = new GraphState({ nodeStyles: [{ fillColor: 0 }], edgeStyles: [{ fillColor: 0 }] })
    state.addNodes(
      graph.nodes.map((node) => ({ id: node.id, x: node.fx ?? node.x ?? NaN, y: node.fy ?? node.y ?? NaN, radius: node.radius, style: 0 }))
    )
    state.addEdges(graph.edges.map((edge, i) => ({ id: i, source: edge.source, target: edge.target, width: 1, style: 0 })))
    createForceLayout(state, options).run(ticks)

    const outputNodes = mutate ? graph.nodes : graph.nodes.map((node) => ({ ...node }))
    for (let i = 0; i < outputNodes.length; i++) {
      outputNodes[i].x = state.nodePositions[i * 2]
      outputNodes[i].y = state.nodePositions[i * 2 + 1]
    }
    return { nodes: outputNodes, edges: graph.edges }
  }
}
