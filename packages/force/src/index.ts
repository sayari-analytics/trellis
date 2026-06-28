import { GraphState, type LayoutResult } from '@sayari/trellis'
import { Simulation, SimulationOptions } from './simulation'

export type Options = {
  ticks?: number
  params?: SimulationOptions
}

export type ForceMetrics = {
  alpha: number
  alphaMin: number
}

export type { SimulationConfig, SimulationOptions } from './simulation'

export const layout = (graphState: GraphState, options: Options = {}) => {
  const simulation = new Simulation({
    nodePositions: graphState.nodePositions,
    nodeRadii: graphState.nodeRadii,
    edgeEndpoints: graphState.edgeEndpoints,
    nodeCount: graphState.nodeSlotCount,
    edgeCount: graphState.edgeSlotCount,
    ...options.params
  })

  return (options: Options = {}): LayoutResult<ForceMetrics> => {
    if (options.params !== undefined) simulation.configure(options.params)
    simulation.tick(options.ticks ?? 300)
    graphState.markNodePositionsDirty()

    return {
      done: simulation.alpha <= simulation.alphaMin,
      metrics: {
        alpha: simulation.alpha,
        alphaMin: simulation.alphaMin
      }
    }
  }
}
