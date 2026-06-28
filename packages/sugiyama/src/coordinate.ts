import type { LayeredGraph, LayeredNode } from './layered'

export type Orientation = 'bottom' | 'left' | 'top' | 'right'
export type BreadthAlignment = 'center' | 'min' | 'max'

export type CoordinateResult = {
  extent: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }
  edgeStraightness: number
}

const ALIGNMENT_ITERATIONS = 16
const SPARSE_LAYER_THRESHOLD = 32
const DENSE_GROUP_GAP_RATIO = 4
const DENSE_GROUP_GAP_COMPACTION = 0.5
const DUMMY_DUMMY_GAP_RATIO = 0.02
const REAL_DUMMY_GAP_RATIO = 0.2

const midpoint = (values: number[]) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

type CoordinateNeighbor = { node: LayeredNode; weight: number }
type CoordinateAdjacency = { incoming: CoordinateNeighbor[]; outgoing: CoordinateNeighbor[] }[]

const createCoordinateAdjacency = (layered: LayeredGraph): CoordinateAdjacency => {
  const adjacency: CoordinateAdjacency = []
  for (const node of layered.nodes) adjacency[node.ref] = { incoming: [], outgoing: [] }
  for (const edge of layered.edges) {
    const source = layered.nodeByRef[edge.source]!
    const target = layered.nodeByRef[edge.target]!
    adjacency[target.ref].incoming.push({ node: source, weight: edge.weight })
    adjacency[source.ref].outgoing.push({ node: target, weight: edge.weight })
  }
  return adjacency
}

const neighborBreadthPosition = (adjacency: CoordinateAdjacency, node: LayeredNode, incoming: boolean) => {
  const neighbors = adjacency[node.ref]?.[incoming ? 'incoming' : 'outgoing'] ?? []
  let sum = 0
  let weight = 0
  for (const neighbor of neighbors) {
    sum += neighbor.weight * neighbor.node.y
    weight += neighbor.weight
  }
  return weight === 0 ? undefined : sum / weight
}

const resolveLayerOverlaps = (layer: LayeredNode[], rowGap: number) => {
  if (layer.length === 0) return
  layer.sort((a, b) => a.order - b.order)
  for (let index = 1; index < layer.length; index++) {
    const previous = layer[index - 1]
    const node = layer[index]
    const min = previous.y + previous.breadth / 2 + rowGap + node.breadth / 2
    if (node.y < min) node.y = min
  }
  for (let index = layer.length - 2; index >= 0; index--) {
    const next = layer[index + 1]
    const node = layer[index]
    const max = next.y - next.breadth / 2 - rowGap - node.breadth / 2
    if (node.y > max) node.y = max
  }
}

const denseSeparation = (a: LayeredNode, b: LayeredNode, rowGap: number) => {
  let gap = rowGap
  if (a.dummy && b.dummy) gap = rowGap * DUMMY_DUMMY_GAP_RATIO
  else if (a.dummy || b.dummy) gap = rowGap * REAL_DUMMY_GAP_RATIO
  return a.breadth / 2 + gap + b.breadth / 2
}

const compactLayer = (layer: LayeredNode[], rowGap: number) => {
  if (layer.length === 0) return
  layer.sort((a, b) => a.order - b.order)
  let cursor = layer[0].y
  for (let index = 0; index < layer.length; index++) {
    const node = layer[index]
    const min = index === 0 ? node.y : cursor + denseSeparation(layer[index - 1], node, rowGap)
    if (node.y < min) node.y = min
    cursor = node.y
  }
  const center = (layer[0].y + layer[layer.length - 1].y) / 2
  for (const node of layer) node.y -= center
}

const compactLargeGroupGaps = (layer: LayeredNode[], rowGap: number) => {
  if (layer.length < 2) return
  layer.sort((a, b) => a.order - b.order)

  const maxGap = rowGap * DENSE_GROUP_GAP_RATIO
  let originalSum = 0
  let originalWeight = 0
  for (const node of layer) {
    const nodeWeight = Math.max(1, node.breadth)
    originalSum += node.y * nodeWeight
    originalWeight += nodeWeight
  }
  const originalCenter = originalWeight === 0 ? 0 : originalSum / originalWeight
  const positions: number[] = [layer[0].y]
  let changed = false

  for (let index = 1; index < layer.length; index++) {
    const previous = layer[index - 1]
    const node = layer[index]
    const delta = node.y - previous.y
    const gap = delta - previous.breadth / 2 - node.breadth / 2
    const excess = Math.max(0, gap - maxGap)
    const compactedDelta = delta - excess * DENSE_GROUP_GAP_COMPACTION
    positions[index] = positions[index - 1] + compactedDelta
    changed ||= excess > 0
  }

  if (!changed) return
  for (let index = 0; index < layer.length; index++) layer[index].y = positions[index]

  let compactedSum = 0
  let compactedWeight = 0
  for (const node of layer) {
    const nodeWeight = Math.max(1, node.breadth)
    compactedSum += node.y * nodeWeight
    compactedWeight += nodeWeight
  }
  const offset = originalCenter - (compactedWeight === 0 ? 0 : compactedSum / compactedWeight)
  for (const node of layer) node.y += offset
}

const initializeCompactCoordinates = (layered: LayeredGraph, layerGap: number, rowGap: number) => {
  for (const layer of layered.layers) {
    for (let index = 0; index < layer.length; index++) {
      const node = layer[index]
      node.x = node.rank * layerGap
      if (index === 0) {
        node.y = node.breadth / 2
      } else {
        const previous = layer[index - 1]
        node.y = previous.y + denseSeparation(previous, node, rowGap)
      }
    }
    const center = layer.length === 0 ? 0 : (layer[0].y + layer[layer.length - 1].y) / 2
    for (const node of layer) node.y -= center
  }
}

const compactCoordinates = (layered: LayeredGraph, layerGap: number, rowGap: number, iterations: number) => {
  initializeCompactCoordinates(layered, layerGap, rowGap)
  const adjacency = createCoordinateAdjacency(layered)
  const blockTarget: number[] = []

  // Phase 4: dense Brandes-Köpf-style relaxation pulls nodes toward neighbor medians.
  for (let iteration = 0; iteration < Math.max(1, iterations); iteration++) {
    for (const layer of layered.layers) {
      for (const node of layer) {
        const neighbors = adjacency[node.ref]
        if (neighbors === undefined || (neighbors.incoming.length === 0 && neighbors.outgoing.length === 0)) {
          blockTarget[node.ref] = node.y
          continue
        }
        const positions: number[] = []
        for (const neighbor of neighbors.incoming) positions.push(neighbor.node.y)
        for (const neighbor of neighbors.outgoing) positions.push(neighbor.node.y)
        blockTarget[node.ref] = midpoint(positions)
      }
    }

    for (const layer of layered.layers) {
      for (const node of layer) node.y = (node.y + (blockTarget[node.ref] ?? node.y) * 2) / 3
      compactLayer(layer, rowGap)
    }
  }

  // Phase 4: block compaction reduces large inter-group gaps without changing node order.
  for (const layer of layered.layers) compactLargeGroupGaps(layer, rowGap)
}

const initializeLaneCoordinates = (layered: LayeredGraph, layerGap: number, rowGap: number) => {
  let depth = 0
  let previousMaxHalf = 0
  for (let rank = 0; rank < layered.layers.length; rank++) {
    const layer = layered.layers[rank]
    let maxHalf = 0
    for (const node of layer) maxHalf = Math.max(maxHalf, node.breadth / 2)
    if (rank > 0) depth += previousMaxHalf + layerGap + maxHalf
    let cursor = 0
    for (const node of layer) {
      cursor += node.breadth / 2
      node.x = depth
      node.y = cursor
      cursor += node.breadth / 2 + rowGap
    }
    previousMaxHalf = maxHalf
  }
}

const alignCoordinates = (layered: LayeredGraph, layerGap: number, rowGap: number) => {
  initializeLaneCoordinates(layered, layerGap, rowGap)
  const adjacency = createCoordinateAdjacency(layered)

  // Phase 4: sparse lane alignment preserves long branch/merge tracks.
  for (let iteration = 0; iteration < ALIGNMENT_ITERATIONS; iteration++) {
    if (iteration % 2 === 0) {
      for (let rank = 1; rank < layered.layers.length; rank++) {
        for (const node of layered.layers[rank]) node.y = neighborBreadthPosition(adjacency, node, true) ?? node.y
        resolveLayerOverlaps(layered.layers[rank], rowGap)
      }
    } else {
      for (let rank = layered.layers.length - 2; rank >= 0; rank--) {
        for (const node of layered.layers[rank]) node.y = neighborBreadthPosition(adjacency, node, false) ?? node.y
        resolveLayerOverlaps(layered.layers[rank], rowGap)
      }
    }
  }

  let realCount = 0
  let realSum = 0
  for (const node of layered.nodes) {
    if (node.dummy) continue
    realCount += 1
    realSum += node.y
  }
  const center = realCount === 0 ? 0 : realSum / realCount
  for (const node of layered.nodes) node.y -= center
}

const isSparseBranchGraph = (layered: LayeredGraph) => {
  let maxLayerSize = 0
  for (const layer of layered.layers) maxLayerSize = Math.max(maxLayerSize, layer.length)
  return maxLayerSize <= SPARSE_LAYER_THRESHOLD
}

const orient = (x: number, y: number, orientation: Orientation) => {
  switch (orientation) {
    case 'bottom':
      return { x: y, y: x }
    case 'left':
      return { x, y }
    case 'right':
      return { x: -x, y }
    case 'top':
    default:
      return { x: y, y: -x }
  }
}

const edgeStraightness = (layered: LayeredGraph) => {
  let total = 0
  let weighted = 0
  for (const edge of layered.edges) {
    const source = layered.nodeByRef[edge.source]!
    const target = layered.nodeByRef[edge.target]!
    total += edge.weight
    weighted += edge.weight * (1 / (1 + Math.abs(source.y - target.y)))
  }
  return total === 0 ? 1 : weighted / total
}

const alignLayerBounds = (layers: LayeredNode[][], alignment: BreadthAlignment) => {
  if (alignment === 'center') return
  for (const layer of layers) {
    if (layer.length === 0) continue
    let hasReal = false
    for (const node of layer) {
      if (!node.dummy) {
        hasReal = true
        break
      }
    }
    let min = Infinity
    let max = -Infinity
    for (const node of layer) {
      if (hasReal && node.dummy) continue
      min = Math.min(min, node.y - node.breadth / 2)
      max = Math.max(max, node.y + node.breadth / 2)
    }
    const offset = alignment === 'min' ? min : max
    for (const node of layer) node.y -= offset
  }
}

export const assignCoordinates = (
  layered: LayeredGraph,
  orientation: Orientation,
  layerGap: number,
  rowGap: number,
  iterations: number,
  breadthAlignment: BreadthAlignment
): CoordinateResult => {
  if (isSparseBranchGraph(layered)) alignCoordinates(layered, layerGap, rowGap)
  else compactCoordinates(layered, layerGap, rowGap, iterations)

  alignLayerBounds(layered.layers, breadthAlignment)

  for (const node of layered.nodes) {
    const oriented = orient(node.x, node.y, orientation)
    node.x = oriented.x
    node.y = oriented.y
  }

  let realCount = 0
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const node of layered.nodes) {
    if (node.dummy) continue
    realCount += 1
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y)
  }

  if (realCount === 0) {
    return { extent: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 }, edgeStraightness: 1 }
  }

  return {
    extent: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY },
    edgeStraightness: edgeStraightness(layered)
  }
}
