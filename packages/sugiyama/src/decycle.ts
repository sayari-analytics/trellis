import type { EdgeRef, NodeRef } from '@sayari/trellis'
import { edgeSource, edgeTarget, outgoingEdges, type SugiyamaState } from './state'

export type DecycleResult = {
  sccs: NodeRef[][]
  cyclicSccs: NodeRef[][]
  reversedEdges: EdgeRef[]
}

// Phase 1: Tarjan SCC detection isolates cyclic components before feedback-arc reversal.
export const tarjanScc = (state: SugiyamaState): NodeRef[][] => {
  let index = 0
  const stack: NodeRef[] = []
  const onStack: boolean[] = []
  const indexByNode: number[] = []
  const lowlink: number[] = []
  const sccs: NodeRef[][] = []

  const strongConnect = (ref: NodeRef) => {
    indexByNode[ref] = index
    lowlink[ref] = index
    index += 1
    stack.push(ref)
    onStack[ref] = true

    for (const edgeRef of outgoingEdges(state, ref)) {
      const next = edgeTarget(state, edgeRef)
      if (indexByNode[next] === undefined) {
        strongConnect(next)
        lowlink[ref] = Math.min(lowlink[ref], lowlink[next])
      } else if (onStack[next]) {
        lowlink[ref] = Math.min(lowlink[ref], indexByNode[next])
      }
    }

    if (lowlink[ref] === indexByNode[ref]) {
      const component: NodeRef[] = []
      let next: NodeRef | undefined
      do {
        next = stack.pop()
        if (next === undefined) break
        onStack[next] = false
        component.push(next)
      } while (next !== ref)
      sccs.push(component)
    }
  }

  for (const ref of state.graphState.nodes()) {
    if (indexByNode[ref] === undefined) strongConnect(ref)
  }

  return sccs
}

const greedyFeedbackArcSet = (state: SugiyamaState, component: Set<NodeRef>, edges: EdgeRef[]): Set<EdgeRef> => {
  const remaining = new Set(component)
  const left: NodeRef[] = []
  const right: NodeRef[] = []

  const degree = (ref: NodeRef) => {
    let incoming = 0
    let outgoing = 0
    for (const edgeRef of edges) {
      const source = edgeSource(state, edgeRef)
      const target = edgeTarget(state, edgeRef)
      if (!remaining.has(source) || !remaining.has(target)) continue
      if (source === ref) outgoing += state.weight[edgeRef]
      if (target === ref) incoming += state.weight[edgeRef]
    }
    return { incoming, outgoing }
  }

  while (remaining.size > 0) {
    let changed = true
    while (changed) {
      changed = false
      for (const ref of [...remaining]) {
        const { incoming, outgoing } = degree(ref)
        if (outgoing === 0) {
          right.unshift(ref)
          remaining.delete(ref)
          changed = true
        } else if (incoming === 0) {
          left.push(ref)
          remaining.delete(ref)
          changed = true
        }
      }
    }

    if (remaining.size === 0) break
    let best: NodeRef | undefined
    let bestScore = -Infinity
    for (const ref of remaining) {
      const { incoming, outgoing } = degree(ref)
      const score = outgoing - incoming
      if (score > bestScore) {
        bestScore = score
        best = ref
      }
    }
    if (best === undefined) break
    left.push(best)
    remaining.delete(best)
  }

  const position: number[] = []
  let order = 0
  for (const ref of left) position[ref] = order++
  for (const ref of right) position[ref] = order++

  const feedback = new Set<EdgeRef>()
  for (const edgeRef of edges) {
    const source = edgeSource(state, edgeRef)
    const target = edgeTarget(state, edgeRef)
    if (!component.has(source) || !component.has(target)) continue
    if ((position[source] ?? 0) > (position[target] ?? 0)) feedback.add(edgeRef)
  }
  return feedback
}

// Phase 1: Eades-Lin-Smyth greedy feedback arc set reverses low-cost cycle edges.
export const decycle = (state: SugiyamaState): DecycleResult => {
  const selfLoops: EdgeRef[] = []
  for (const edgeRef of state.graphState.edges()) {
    if (edgeSource(state, edgeRef) === edgeTarget(state, edgeRef)) selfLoops.push(edgeRef)
  }
  for (const edgeRef of selfLoops) {
    state.feedback[edgeRef] = true
    state.reversed[edgeRef] = true
  }

  const sccs = tarjanScc(state)
  const cyclicSccs: NodeRef[][] = []
  for (const scc of sccs) {
    if (scc.length > 1) cyclicSccs.push(scc)
  }
  const reversedEdges: EdgeRef[] = [...selfLoops]

  for (const scc of cyclicSccs) {
    const component = new Set(scc)
    const componentEdges: EdgeRef[] = []
    for (const edgeRef of state.graphState.edges()) {
      if (state.feedback[edgeRef]) continue
      const source = edgeSource(state, edgeRef)
      const target = edgeTarget(state, edgeRef)
      if (component.has(source) && component.has(target)) componentEdges.push(edgeRef)
    }
    for (const edgeRef of greedyFeedbackArcSet(state, component, componentEdges)) {
      state.reversed[edgeRef] = !state.reversed[edgeRef]
      state.feedback[edgeRef] = true
      reversedEdges.push(edgeRef)
    }
  }

  return { sccs, cyclicSccs, reversedEdges }
}
