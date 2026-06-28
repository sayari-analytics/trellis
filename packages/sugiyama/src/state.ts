import type { EdgeRef, GraphState, NodeRef } from '@sayari/trellis'

export type SugiyamaState = {
  graphState: GraphState
  breadth: number[]
  rank: number[]
  reversed: boolean[]
  feedback: boolean[]
  weight: number[]
  minLayerSpan: number[]
  routeNodeRefs: number[][]
}

export const edgeSource = (state: SugiyamaState, edge: EdgeRef): NodeRef =>
  state.reversed[edge] ? state.graphState.edgeTarget(edge) : state.graphState.edgeSource(edge)

export const edgeTarget = (state: SugiyamaState, edge: EdgeRef): NodeRef =>
  state.reversed[edge] ? state.graphState.edgeSource(edge) : state.graphState.edgeTarget(edge)

export function* activeEdges(state: SugiyamaState): IterableIterator<EdgeRef> {
  for (const edge of state.graphState.edges()) {
    if (!state.feedback[edge]) yield edge
  }
}

export function* outgoingEdges(state: SugiyamaState, node: NodeRef): IterableIterator<EdgeRef> {
  for (const edge of state.graphState.incidentEdges(node)) {
    if (!state.feedback[edge] && edgeSource(state, edge) === node) yield edge
  }
}

export function* incomingEdges(state: SugiyamaState, node: NodeRef): IterableIterator<EdgeRef> {
  for (const edge of state.graphState.incidentEdges(node)) {
    if (!state.feedback[edge] && edgeTarget(state, edge) === node) yield edge
  }
}
