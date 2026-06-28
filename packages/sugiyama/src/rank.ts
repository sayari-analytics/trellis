import type { EdgeRef, NodeRef } from '@sayari/trellis'
import { activeEdges, edgeSource, edgeTarget, incomingEdges, outgoingEdges, type SugiyamaState } from './state'

export type RankResult = {
  layerCount: number
  totalEdgeSpan: number
}

const normalizeRanks = (state: SugiyamaState) => {
  let min = 0
  for (const node of state.graphState.nodes()) min = Math.min(min, state.rank[node] ?? 0)
  for (const node of state.graphState.nodes()) state.rank[node] = (state.rank[node] ?? 0) - min
}

const topologicalOrder = (state: SugiyamaState): NodeRef[] => {
  const indegree: number[] = []
  for (const node of state.graphState.nodes()) indegree[node] = 0
  for (const edge of activeEdges(state)) {
    const target = edgeTarget(state, edge)
    indegree[target] = (indegree[target] ?? 0) + 1
  }

  const queue: NodeRef[] = []
  for (const node of state.graphState.nodes()) {
    if ((indegree[node] ?? 0) === 0) queue.push(node)
  }
  const order: NodeRef[] = []
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor]
    order.push(node)
    for (const edge of outgoingEdges(state, node)) {
      const target = edgeTarget(state, edge)
      const next = (indegree[target] ?? 0) - 1
      indegree[target] = next
      if (next === 0) queue.push(target)
    }
  }
  return order
}

export const longestPathRank = (state: SugiyamaState): RankResult => {
  const order = topologicalOrder(state)
  for (const node of state.graphState.nodes()) state.rank[node] = 0
  for (const node of order) {
    const sourceRank = state.rank[node] ?? 0
    for (const edge of outgoingEdges(state, node)) {
      const target = edgeTarget(state, edge)
      state.rank[target] = Math.max(state.rank[target] ?? 0, sourceRank + state.minLayerSpan[edge])
    }
  }

  normalizeRanks(state)
  return rankMetrics(state)
}

// Phase 2: network-simplex-style rank tightening minimizes weighted edge span while preserving layer constraints.
export const networkSimplexRank = (state: SugiyamaState): RankResult => {
  longestPathRank(state)

  const nodeRefs: NodeRef[] = []
  for (const node of state.graphState.nodes()) nodeRefs.push(node)
  const maxRounds = Math.max(1, nodeRefs.length)
  const ordered = nodeRefs.slice()
  for (let round = 0; round < maxRounds; round++) {
    let changed = false
    ordered.sort((a, b) => (state.rank[b] ?? 0) - (state.rank[a] ?? 0))
    for (const ref of ordered) {
      const incoming = [...incomingEdges(state, ref)]
      const outgoing = [...outgoingEdges(state, ref)]
      let lower = 0
      for (const edgeRef of incoming) {
        const source = edgeSource(state, edgeRef)
        lower = Math.max(lower, (state.rank[source] ?? 0) + state.minLayerSpan[edgeRef])
      }
      let upper = Infinity
      for (const edgeRef of outgoing) {
        const target = edgeTarget(state, edgeRef)
        upper = Math.min(upper, (state.rank[target] ?? 0) - state.minLayerSpan[edgeRef])
      }
      const current = state.rank[ref] ?? 0
      let best = current
      let bestCost = rankIncidentCost(state, incoming, outgoing, current)

      for (let candidate = lower; candidate <= Math.min(upper, current + 2); candidate++) {
        const cost = rankIncidentCost(state, incoming, outgoing, candidate)
        if (cost < bestCost) {
          bestCost = cost
          best = candidate
        }
      }

      if (best !== current) {
        state.rank[ref] = best
        changed = true
      }
    }
    if (!changed) break
  }

  normalizeRanks(state)
  return rankMetrics(state)
}

const rankIncidentCost = (state: SugiyamaState, incoming: EdgeRef[] | undefined, outgoing: EdgeRef[] | undefined, rank: number) => {
  let cost = 0
  for (const edgeRef of incoming ?? []) {
    const source = edgeSource(state, edgeRef)
    cost += state.weight[edgeRef] * (rank - (state.rank[source] ?? 0))
  }
  for (const edgeRef of outgoing ?? []) {
    const target = edgeTarget(state, edgeRef)
    cost += state.weight[edgeRef] * ((state.rank[target] ?? 0) - rank)
  }
  return cost
}

export const rankMetrics = (state: SugiyamaState): RankResult => {
  let totalEdgeSpan = 0
  for (const edgeRef of activeEdges(state)) {
    const source = edgeSource(state, edgeRef)
    const target = edgeTarget(state, edgeRef)
    const span = (state.rank[target] ?? 0) - (state.rank[source] ?? 0)
    if (span < state.minLayerSpan[edgeRef]) {
      throw new Error(`sugiyama: rank constraint violated by edge "${String(state.graphState.edgeId(edgeRef))}"`)
    }
    totalEdgeSpan += span
  }
  let layerCount = 0
  for (const node of state.graphState.nodes()) layerCount = Math.max(layerCount, (state.rank[node] ?? 0) + 1)
  return { layerCount, totalEdgeSpan }
}
