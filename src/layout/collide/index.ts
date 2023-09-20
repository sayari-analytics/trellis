import { forceCollide, forceSimulation, SimulationNodeDatum } from 'd3-force'
import { Node, Edge } from '../../trellis'

export type Options = Partial<{
  nodePadding: number
  tick: number
}>

type SimulationNode = {
  id: string
  radius: number
} & SimulationNodeDatum

const COLLIDE_LAYOUT_OPTIONS = {
  nodePadding: 8,
  tick: 50
}

const Layout = () => {
  return <N extends Node, E extends Edge>(graph: { nodes: N[]; edges: E[]; options?: Options }) => {
    forceSimulation<SimulationNode>(graph.nodes)
      .force(
        'collide',
        forceCollide<SimulationNode>()
          .radius((d) => d.radius + (graph.options?.nodePadding ?? COLLIDE_LAYOUT_OPTIONS.nodePadding))
          .iterations(3)
      )
      .stop()
      .tick(graph.options?.tick ?? COLLIDE_LAYOUT_OPTIONS.tick)

    return { nodes: graph.nodes, edges: graph.edges }
  }
}

export default { Layout }
