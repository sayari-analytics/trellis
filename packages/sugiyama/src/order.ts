import type { LayeredGraph, LayeredNode } from './layered'

export type Ordering = 'barycenter' | 'sifting'
export type OrderingRefinement = 'none' | 'adjacent-swaps' | 'sifting'

type Direction = 'down' | 'up'
type IncidentOrders = { incoming: number[]; outgoing: number[] }
type IncidentNodes = { incoming: LayeredNode[]; outgoing: LayeredNode[] }
type CrossingMatrix = {
  layer: LayeredNode[]
  indexByRef: number[]
  costs: Float64Array
}

class Fenwick {
  private tree: number[]

  constructor(size: number) {
    this.tree = new Array(size + 2).fill(0)
  }

  add(index: number, value: number) {
    for (let cursor = index + 1; cursor < this.tree.length; cursor += cursor & -cursor) this.tree[cursor] += value
  }

  sum(index: number) {
    let total = 0
    for (let cursor = index + 1; cursor > 0; cursor -= cursor & -cursor) total += this.tree[cursor]
    return total
  }
}

const createIncidentNodes = (layered: LayeredGraph): IncidentNodes[] => {
  const incident: IncidentNodes[] = []
  for (const node of layered.nodes) incident[node.ref] = { incoming: [], outgoing: [] }
  for (const edge of layered.edges) {
    const source = layered.nodeByRef[edge.source]!
    const target = layered.nodeByRef[edge.target]!
    incident[target.ref]?.incoming.push(source)
    incident[source.ref]?.outgoing.push(target)
  }
  return incident
}

const createIncidentOrders = (incident: IncidentNodes[], layer: LayeredNode[]): IncidentOrders[] => {
  const orders: IncidentOrders[] = []
  for (const node of layer) {
    const neighbors = incident[node.ref]
    const incoming: number[] = []
    const outgoing: number[] = []
    if (neighbors !== undefined) {
      for (const neighbor of neighbors.incoming) incoming.push(neighbor.order)
      for (const neighbor of neighbors.outgoing) outgoing.push(neighbor.order)
    }
    incoming.sort((a, b) => a - b)
    outgoing.sort((a, b) => a - b)
    orders[node.ref] = { incoming, outgoing }
  }
  return orders
}

export const countAdjacentCrossings = (layered: LayeredGraph, upperRank: number): number => {
  const lower = layered.layers[upperRank + 1] ?? []
  if (lower.length === 0) return 0
  const pairs: { upper: number; lower: number }[] = []
  for (const edge of layered.edges) {
    const source = layered.nodeByRef[edge.source]!
    const target = layered.nodeByRef[edge.target]!
    if (source.rank !== upperRank || target.rank !== upperRank + 1) continue
    pairs.push({ upper: source.order, lower: target.order })
  }
  pairs.sort((a, b) => a.upper - b.upper || a.lower - b.lower)

  const tree = new Fenwick(lower.length)
  let crossings = 0
  let seen = 0
  for (const pair of pairs) {
    crossings += seen - tree.sum(pair.lower)
    tree.add(pair.lower, 1)
    seen += 1
  }
  return crossings
}

export const countCrossings = (layered: LayeredGraph): number => {
  let crossings = 0
  for (let rank = 0; rank < layered.layers.length - 1; rank++) crossings += countAdjacentCrossings(layered, rank)
  return crossings
}

const barycenterSort = (layered: LayeredGraph, incident: IncidentNodes[], rank: number, direction: Direction) => {
  const layer = layered.layers[rank] ?? []
  const sortable: { node: LayeredNode; barycenter: number; order: number; id: string }[] = []
  for (const node of layer) {
    const neighbors = incident[node.ref]?.[direction === 'down' ? 'incoming' : 'outgoing'] ?? []
    let sum = 0
    for (const neighbor of neighbors) sum += neighbor.order
    sortable.push({
      node,
      barycenter: neighbors.length === 0 ? node.order : sum / neighbors.length,
      order: node.order,
      id: String(node.ref)
    })
  }
  sortable.sort((a, b) => {
    const byBarycenter = a.barycenter - b.barycenter
    if (byBarycenter !== 0) return byBarycenter
    const byOrder = a.order - b.order
    return byOrder !== 0 ? byOrder : a.id.localeCompare(b.id)
  })
  for (let index = 0; index < sortable.length; index++) layer[index] = sortable[index].node
  for (let order = 0; order < layer.length; order++) layer[order].order = order
}

// Phase 3: pairwise crossing matrices make sifting moves local delta updates.
const countGreaterThan = (left: number[], right: number[]): number => {
  let count = 0
  let cursor = 0
  for (const value of left) {
    while (cursor < right.length && right[cursor] < value) cursor++
    count += cursor
  }
  return count
}

const orderedPairCrossings = (a: IncidentOrders, b: IncidentOrders): number =>
  countGreaterThan(a.incoming, b.incoming) + countGreaterThan(a.outgoing, b.outgoing)

const createCrossingMatrix = (layered: LayeredGraph, incident: IncidentNodes[], rank: number): CrossingMatrix => {
  const layer = layered.layers[rank] ?? []
  const indexByRef: number[] = []
  for (let index = 0; index < layer.length; index++) indexByRef[layer[index].ref] = index
  const costs = new Float64Array(layer.length * layer.length)
  const incidentOrders = createIncidentOrders(incident, layer)

  for (let i = 0; i < layer.length; i++) {
    const a = incidentOrders[layer[i].ref]
    for (let j = 0; j < layer.length; j++) {
      if (i === j) continue
      costs[i * layer.length + j] = orderedPairCrossings(a, incidentOrders[layer[j].ref])
    }
  }

  return { layer, indexByRef, costs }
}

const pairCost = (matrix: CrossingMatrix, before: LayeredNode, after: LayeredNode): number => {
  const n = matrix.layer.length
  return matrix.costs[matrix.indexByRef[before.ref] * n + matrix.indexByRef[after.ref]]
}

const matrixCrossings = (matrix: CrossingMatrix): number => {
  const { layer } = matrix
  let crossings = 0
  for (let i = 0; i < layer.length; i++) {
    for (let j = i + 1; j < layer.length; j++) crossings += pairCost(matrix, layer[i], layer[j])
  }
  return crossings
}

const moveNode = (layer: LayeredNode[], from: number, to: number) => {
  if (from === to) return
  const node = layer[from]
  if (from < to) {
    for (let i = from; i < to; i++) layer[i] = layer[i + 1]
  } else {
    for (let i = from; i > to; i--) layer[i] = layer[i - 1]
  }
  layer[to] = node
}

const siftLayer = (layered: LayeredGraph, incident: IncidentNodes[], rank: number): number => {
  const matrix = createCrossingMatrix(layered, incident, rank)
  const layer = matrix.layer
  let currentCrossings = matrixCrossings(matrix)
  const priority = layer.slice()
  priority.sort((a, b) => {
    const incidentA = incident[a.ref]
    const incidentB = incident[b.ref]
    const degreeA = (incidentA?.incoming.length ?? 0) + (incidentA?.outgoing.length ?? 0)
    const degreeB = (incidentB?.incoming.length ?? 0) + (incidentB?.outgoing.length ?? 0)
    return degreeB - degreeA || a.order - b.order
  })

  for (const node of priority) {
    const currentIndex = layer.indexOf(node)
    if (currentIndex === -1) continue
    let bestIndex = currentIndex
    let bestCrossings = currentCrossings

    let crossings = currentCrossings
    for (let index = currentIndex - 1; index >= 0; index--) {
      const other = layer[index]
      crossings += pairCost(matrix, node, other) - pairCost(matrix, other, node)
      if (crossings < bestCrossings) {
        bestCrossings = crossings
        bestIndex = index
      }
    }

    crossings = currentCrossings
    for (let index = currentIndex + 1; index < layer.length; index++) {
      const other = layer[index]
      crossings += pairCost(matrix, other, node) - pairCost(matrix, node, other)
      if (crossings < bestCrossings) {
        bestCrossings = crossings
        bestIndex = index
      }
    }

    if (bestIndex !== currentIndex) {
      moveNode(layer, currentIndex, bestIndex)
      currentCrossings = bestCrossings
      for (let order = 0; order < layer.length; order++) layer[order].order = order
    }
  }

  return currentCrossings
}

const adjacentSwaps = (layered: LayeredGraph, incident: IncidentNodes[], maxRounds: number) => {
  let improvement = 0
  for (let round = 0; round < maxRounds; round++) {
    let improved = false
    for (let rank = 0; rank < layered.layers.length; rank++) {
      const layer = layered.layers[rank] ?? []
      const incidentOrders = createIncidentOrders(incident, layer)
      for (let index = 0; index < layer.length - 1; index++) {
        const a = layer[index]
        const b = layer[index + 1]
        const before = orderedPairCrossings(incidentOrders[a.ref], incidentOrders[b.ref])
        const after = orderedPairCrossings(incidentOrders[b.ref], incidentOrders[a.ref])
        if (after <= before) {
          layer[index] = b
          layer[index + 1] = a
          for (let order = 0; order < layer.length; order++) layer[order].order = order
          if (after < before) {
            improvement += before - after
            improved = true
          }
        }
      }
    }
    if (!improved) break
  }
  return improvement
}

const bundledLockLayers = (layers: LayeredNode[][]): LayeredNode[][] => {
  const result: LayeredNode[][] = []
  for (const layer of layers) {
    const bundleCounts = new Map<string, number>()
    for (const node of layer) {
      if (node.bundleId === undefined) continue
      const count = (bundleCounts.get(node.bundleId) ?? 0) + 1
      if (count > 1) {
        result.push(layer)
        break
      }
      bundleCounts.set(node.bundleId, count)
    }
  }
  return result
}

const lockBundledDummies = (layers: LayeredNode[][]) => {
  for (const layer of layers) {
    layer.sort((a, b) => {
      if (a.bundleId !== undefined && a.bundleId === b.bundleId) return String(a.sourceEdgeRef).localeCompare(String(b.sourceEdgeRef))
      return a.order - b.order
    })
    for (let order = 0; order < layer.length; order++) layer[order].order = order
  }
}

export const orderLayers = (
  layered: LayeredGraph,
  ordering: Ordering,
  iterations: number,
  maxSiftingRounds: number,
  refinement: OrderingRefinement = ordering === 'sifting' ? 'sifting' : 'adjacent-swaps'
): number => {
  const incident = createIncidentNodes(layered)
  const lockLayers = bundledLockLayers(layered.layers)
  // Phase 3: barycenter sweeps reduce crossings; bundled dummy chains stay ordered.
  for (let iteration = 0; iteration < iterations; iteration++) {
    for (let rank = 1; rank < layered.layers.length; rank++) barycenterSort(layered, incident, rank, 'down')
    for (let rank = layered.layers.length - 2; rank >= 0; rank--) barycenterSort(layered, incident, rank, 'up')
    lockBundledDummies(lockLayers)
  }

  if (refinement === 'sifting') {
    // Phase 3: sifting and adjacent swaps refine the barycenter order.
    for (let round = 0; round < maxSiftingRounds; round++) {
      const before = countCrossings(layered)
      for (let rank = 0; rank < layered.layers.length; rank++) siftLayer(layered, incident, rank)
      lockBundledDummies(lockLayers)
      if (countCrossings(layered) >= before) break
    }
  }

  const beforeSwaps = countCrossings(layered)
  if (refinement === 'none') return beforeSwaps
  return beforeSwaps - adjacentSwaps(layered, incident, Math.max(1, Math.min(8, maxSiftingRounds + 1)))
}
