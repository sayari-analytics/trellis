import type { Id, Node, Edge } from '@sayari/trellis'

/**
 * Graph generators for stress-testing the renderer + layouts with large graphs of varied topology.
 *
 * Every generator returns trellis-shaped `{ nodes, edges }`.
 *
 * Each generator names the algorithm it implements. Topology-only generators (random, scale-free, tree,
 * clustered) scatter their nodes so the graph renders before a force layout runs; the spatially-defined
 * ones (grid, small-world ring, geometric) place nodes by construction.
 */

export type Graph = { nodes: Node[]; edges: Edge[] }

export type GraphOptions = Partial<{
  radius: number // node radius, world units (default 18)
  nodeStyle: number // NodeStyle pointer into GraphState's nodeStyles palette (default 0)
  edgeWidth: number // edge width, world units (default 2)
  edgeStyle: number // EdgeStyle pointer (default 0)
  spacing: number // world-unit spacing between nodes, used to size the layout area (default 60)
  label: (id: Id, index: number) => string | undefined // optional per-node label
  seed: number // seed the RNG for reproducible graphs (default: Math.random, non-deterministic)
}>

const DEFAULT_RADIUS = 18
const DEFAULT_EDGE_WIDTH = 2
const DEFAULT_SPACING = 60

// mulberry32 PRNG; undefined seed preserves Math.random behavior.
const rng = (seed: number | undefined): (() => number) => {
  if (seed === undefined) return Math.random
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const makeNode = (id: number, x: number, y: number, o: GraphOptions, index: number): Node => ({
  id,
  x,
  y,
  radius: o.radius ?? DEFAULT_RADIUS,
  style: o.nodeStyle ?? 0,
  label: o.label?.(id, index)
})

const makeEdge = (id: number, source: number, target: number, o: GraphOptions): Edge => ({
  id,
  source,
  target,
  width: o.edgeWidth ?? DEFAULT_EDGE_WIDTH,
  style: o.edgeStyle ?? 0
})

// unordered edge key for dedup (safe-integer for n up to ~3M: n*n < 2^53)
const edgeKey = (size: number, a: number, b: number) => (a < b ? a * size + b : b * size + a)

/**
 * Regular 2D lattice (grid graph). Each kept cell links to its left and lower/upper grid neighbours, so
 * the result is a near-planar mesh — the baseline "well-behaved spatial graph". `sample` (0..1) is the
 * probability of keeping any given cell, for a sparser, irregular lattice.
 */
export type GridOptions = GraphOptions & { size: number; step?: number; sample?: number }

export const gridGraph = (options: GridOptions): Graph => {
  const { size, step = 100, sample = 1 } = options
  const rand = rng(options.seed)
  const nodes: Node[] = []
  const edges: Edge[] = []
  const idByCoord = new Map<number, Map<number, number>>() // x -> (y -> node id)
  const side = Math.sqrt(size / sample) * step
  let edgeId = 0

  for (let px = -(side / 2); px < side / 2 && nodes.length < size; px += step) {
    for (let py = -(side / 2); py < side / 2 && nodes.length < size; py += step) {
      if (rand() >= sample) continue
      const x = Math.round(px)
      const y = Math.round(py)
      const id = nodes.length
      nodes.push(makeNode(id, x, y, options, id))

      let column = idByCoord.get(x)
      if (column === undefined) {
        column = new Map()
        idByCoord.set(x, column)
      }
      column.set(y, id)

      for (const adjacentX of [x - step, x]) {
        for (const adjacentY of [y - step, y, y + step]) {
          if (adjacentX === x && adjacentY === y) continue
          const neighbor = idByCoord.get(adjacentX)?.get(adjacentY)
          if (neighbor !== undefined) edges.push(makeEdge(edgeId++, id, neighbor, options))
        }
      }
    }
  }

  return { nodes, edges }
}

/**
 * Erdős–Rényi random graph G(n, m): `m` edges placed uniformly at random between distinct node pairs.
 * Unstructured connectivity with a Poisson degree distribution — the null model for "no structure at all".
 * Edge count defaults to `avgDegree * size / 2`; nodes scatter uniformly in a square.
 */
export type RandomOptions = GraphOptions & { size: number; edges?: number; avgDegree?: number }

export const randomGraph = (options: RandomOptions): Graph => {
  const { size, avgDegree = 2 } = options
  const rand = rng(options.seed)
  const target = options.edges ?? Math.round((avgDegree * size) / 2)
  const side = Math.sqrt(size) * (options.spacing ?? DEFAULT_SPACING)

  const nodes = Array.from({ length: size }, (_, i) => makeNode(i, (rand() - 0.5) * side, (rand() - 0.5) * side, options, i))
  const edges: Edge[] = []
  const used = new Set<number>()
  const maxAttempts = target * 4 // bail out if the requested edge count approaches the complete-graph limit
  let edgeId = 0
  for (let attempts = 0; edges.length < target && attempts < maxAttempts; attempts++) {
    const a = Math.floor(rand() * size)
    const b = Math.floor(rand() * size)
    if (a === b) continue
    const key = edgeKey(size, a, b)
    if (used.has(key)) continue
    used.add(key)
    edges.push(makeEdge(edgeId++, a, b, options))
  }

  return { nodes, edges }
}

/**
 * Barabási–Albert scale-free graph (preferential attachment). Each new node attaches `m` edges to existing
 * nodes chosen with probability proportional to their degree, producing a power-law degree distribution —
 * a few high-degree hubs and a long tail. Models the topology of social / web / citation networks.
 */
export type ScaleFreeOptions = GraphOptions & { size: number; m?: number }

export const scaleFreeGraph = (options: ScaleFreeOptions): Graph => {
  const { size, m = 2 } = options
  const rand = rng(options.seed)
  const side = Math.sqrt(size) * (options.spacing ?? DEFAULT_SPACING)
  const nodes: Node[] = []
  const edges: Edge[] = []
  // endpoint multiset: each node appears once per incident edge end, so a uniform draw is degree-weighted
  const repeated: number[] = []
  let edgeId = 0

  for (let i = 0; i < size; i++) {
    nodes.push(makeNode(i, (rand() - 0.5) * side, (rand() - 0.5) * side, options, i))
    const links = Math.min(m, i) // the first node has nothing to attach to; node i has i candidates
    const chosen = new Set<number>()
    while (chosen.size < links) {
      const target = repeated.length === 0 ? Math.floor(rand() * i) : repeated[Math.floor(rand() * repeated.length)]
      if (chosen.has(target)) continue
      chosen.add(target)
      edges.push(makeEdge(edgeId++, i, target, options))
    }
    for (const target of chosen) repeated.push(i, target)
  }

  return { nodes, edges }
}

/**
 * Watts–Strogatz small-world graph. Start from a ring lattice where each node links to its `neighbors`
 * nearest neighbours, then rewire each edge with probability `rewire` to a random node. Low `rewire` keeps
 * high clustering while the few shortcuts collapse the path length — the "small-world" regime. Nodes are
 * placed on the ring, so the shortcuts are visible as chords.
 */
export type SmallWorldOptions = GraphOptions & { size: number; neighbors?: number; rewire?: number }

export const smallWorldGraph = (options: SmallWorldOptions): Graph => {
  const { size, neighbors = 4, rewire = 0.1 } = options
  const rand = rng(options.seed)
  const half = Math.max(1, Math.floor(neighbors / 2))
  const ringRadius = (size * (options.spacing ?? DEFAULT_SPACING)) / (2 * Math.PI)
  const nodes = Array.from({ length: size }, (_, i) => {
    const a = (i / size) * 2 * Math.PI
    return makeNode(i, Math.cos(a) * ringRadius, Math.sin(a) * ringRadius, options, i)
  })

  const edges: Edge[] = []
  const used = new Set<number>()
  let edgeId = 0
  for (let i = 0; i < size; i++) {
    for (let j = 1; j <= half; j++) {
      let target = (i + j) % size
      if (rand() < rewire) {
        // rewire this end to a random node, avoiding self-loops and duplicate edges
        let tries = 0
        let r: number
        do {
          r = Math.floor(rand() * size)
          tries++
        } while ((r === i || used.has(edgeKey(size, i, r))) && tries < 20)
        target = r
      }
      if (i === target) continue
      const key = edgeKey(size, i, target)
      if (used.has(key)) continue
      used.add(key)
      edges.push(makeEdge(edgeId++, i, target, options))
    }
  }

  return { nodes, edges }
}

/**
 * Stochastic block model (planted-partition) clustered graph. `clusters` communities of `clusterSize`
 * nodes each, with a high intra-community edge probability and a low inter-community one — the canonical
 * test for community-detection and clustering layouts. Edges are sampled by count (not an O(n²) pair scan),
 * and each community is laid out as a separated disc so the structure is visible without a layout pass.
 */
export type ClusteredOptions = GraphOptions & { clusters: number; clusterSize: number; intra?: number; inter?: number }

export const clusteredGraph = (options: ClusteredOptions): Graph => {
  const { clusters, clusterSize, intra = 0.04, inter = 0.0005 } = options
  const rand = rng(options.seed)
  const size = clusters * clusterSize
  const spacing = options.spacing ?? DEFAULT_SPACING
  const cols = Math.ceil(Math.sqrt(clusters))
  const discRadius = Math.sqrt(clusterSize) * spacing
  const clusterGap = discRadius * 2.5

  const nodes: Node[] = new Array(size)
  for (let c = 0; c < clusters; c++) {
    const cx = (c % cols) * clusterGap
    const cy = Math.floor(c / cols) * clusterGap
    for (let k = 0; k < clusterSize; k++) {
      const id = c * clusterSize + k
      const a = rand() * 2 * Math.PI
      const r = Math.sqrt(rand()) * discRadius // sqrt for a uniform fill of the disc
      nodes[id] = makeNode(id, cx + Math.cos(a) * r, cy + Math.sin(a) * r, options, id)
    }
  }

  const edges: Edge[] = []
  const used = new Set<number>()
  let edgeId = 0
  // dense intra-community edges: ~ intra * C(clusterSize, 2) per community
  const intraPairs = Math.round((intra * clusterSize * (clusterSize - 1)) / 2)
  for (let c = 0; c < clusters; c++) {
    const base = c * clusterSize
    for (let e = 0; e < intraPairs; e++) {
      const a = base + Math.floor(rand() * clusterSize)
      const b = base + Math.floor(rand() * clusterSize)
      if (a === b) continue
      const key = edgeKey(size, a, b)
      if (used.has(key)) continue
      used.add(key)
      edges.push(makeEdge(edgeId++, a, b, options))
    }
  }
  // sparse inter-community bridges: ~ inter * C(size, 2) random cross pairs
  const interPairs = Math.round((inter * size * (size - 1)) / 2)
  for (let e = 0; e < interPairs; e++) {
    const a = Math.floor(rand() * size)
    const b = Math.floor(rand() * size)
    if (a === b || Math.floor(a / clusterSize) === Math.floor(b / clusterSize)) continue
    const key = edgeKey(size, a, b)
    if (used.has(key)) continue
    used.add(key)
    edges.push(makeEdge(edgeId++, a, b, options))
  }

  return { nodes, edges }
}

/**
 * Random recursive tree: node i (i > 0) attaches to a uniformly-random earlier node, yielding a connected
 * acyclic graph (n - 1 edges). With `maxChildren` set, parents are capped to that degree for a bushier,
 * more balanced tree. A good acyclic input for the hierarchy (tidy-tree) layout. Nodes scatter; run a
 * hierarchy/force layout to reveal the tree shape.
 */
export type TreeOptions = GraphOptions & { size: number; maxChildren?: number }

export const treeGraph = (options: TreeOptions): Graph => {
  const { size, maxChildren } = options
  const rand = rng(options.seed)
  const side = Math.sqrt(size) * (options.spacing ?? DEFAULT_SPACING)
  const scatter = (i: number) => makeNode(i, (rand() - 0.5) * side, (rand() - 0.5) * side, options, i)

  const nodes: Node[] = size > 0 ? [scatter(0)] : []
  const edges: Edge[] = []
  // when capping degree, keep a list of parents that still have capacity; pick from it in O(1)
  const childCount = maxChildren !== undefined ? new Int32Array(size) : undefined
  const open: number[] | undefined = maxChildren !== undefined ? [0] : undefined

  for (let i = 1; i < size; i++) {
    nodes.push(scatter(i))
    let parent: number
    if (open !== undefined && childCount !== undefined) {
      const ri = Math.floor(rand() * open.length)
      parent = open[ri]
      childCount[parent]++
      if (childCount[parent] >= maxChildren!) {
        open[ri] = open[open.length - 1] // swap-remove the now-full parent
        open.pop()
      }
      open.push(i)
    } else {
      parent = Math.floor(rand() * i) // any earlier node
    }
    edges.push(makeEdge(i - 1, i, parent, options))
  }

  return { nodes, edges }
}

/**
 * Random geometric graph (RGG): nodes placed uniformly at random in a square, with an edge between any two
 * within `range` of each other. Produces strong spatial locality and natural clustering — a realistic test
 * for spatial indexing and edge-heavy local neighbourhoods. Neighbour search uses a uniform spatial hash
 * (cell size = `range`), so it stays ~O(n) instead of O(n²).
 */
export type GeometricOptions = GraphOptions & { size: number; range?: number }

export const geometricGraph = (options: GeometricOptions): Graph => {
  const { size } = options
  const rand = rng(options.seed)
  const spacing = options.spacing ?? DEFAULT_SPACING
  const side = Math.sqrt(size) * spacing
  const range = options.range ?? spacing * 1.5
  const range2 = range * range

  const xs = new Float64Array(size)
  const ys = new Float64Array(size)
  const nodes: Node[] = new Array(size)
  for (let i = 0; i < size; i++) {
    const x = rand() * side
    const y = rand() * side
    xs[i] = x
    ys[i] = y
    nodes[i] = makeNode(i, x - side / 2, y - side / 2, options, i) // center the cloud on the origin
  }

  // bucket nodes into cells of width `range`; any neighbour within range lives in the 3x3 surrounding cells
  const cols = Math.max(1, Math.ceil(side / range))
  const cellOf = (v: number) => Math.floor(v / range)
  const buckets = new Map<number, number[]>()
  for (let i = 0; i < size; i++) {
    const key = cellOf(xs[i]) + cellOf(ys[i]) * cols
    const bucket = buckets.get(key)
    if (bucket === undefined) buckets.set(key, [i])
    else bucket.push(i)
  }

  const edges: Edge[] = []
  let edgeId = 0
  for (let i = 0; i < size; i++) {
    const cx = cellOf(xs[i])
    const cy = cellOf(ys[i])
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const bucket = buckets.get(gx + gy * cols)
        if (bucket === undefined) continue
        for (const j of bucket) {
          if (j <= i) continue // each unordered pair once
          const dx = xs[i] - xs[j]
          const dy = ys[i] - ys[j]
          if (dx * dx + dy * dy <= range2) edges.push(makeEdge(edgeId++, i, j, options))
        }
      }
    }
  }

  return { nodes, edges }
}

/**
 * Ego-network forest. Models the topology of real-world ownership / entity-resolution graphs: a handful of
 * high-degree hub centers, each surrounded by a star of mostly degree-1 leaves (subsidiaries, accounts,
 * addresses…), with the hubs loosely joined by a few bridges. Leaves attach to hubs by **preferential
 * attachment** (a hub's pull grows with its current size), so hub sizes follow a power law — a few dominant
 * stars plus a long tail of small ones, the way these datasets actually look. A fraction of leaves are
 * promoted to sub-hubs that accrue their own leaves, giving the nested second-tier stars.
 *
 * The result is very sparse (edges ≈ nodes, average degree ~2), so a force layout spreads it into the radial
 * star-of-stars shape — unlike dense block-model communities, which settle into "yarn balls". Nodes scatter so
 * the graph renders before a force layout runs.
 */
export type EgoForestOptions = GraphOptions & {
  size: number // total node count
  hubs?: number // number of top-level hub centers (default ~ sqrt(size) / 2)
  bridges?: number // number of inter-hub bridge edges (default = hubs)
  subHubProbability?: number // chance a leaf becomes a sub-hub that accrues its own leaves (default 0.08)
}

export const egoForestGraph = (options: EgoForestOptions): Graph => {
  const { size } = options
  const rand = rng(options.seed)
  const side = Math.sqrt(size) * (options.spacing ?? DEFAULT_SPACING)
  const hubCount = Math.min(size, Math.max(2, options.hubs ?? Math.round(Math.sqrt(size) / 2)))
  const subHubProbability = options.subHubProbability ?? 0.08
  const bridgeCount = options.bridges ?? hubCount

  const nodes: Node[] = []
  const edges: Edge[] = []
  let edgeId = 0
  const scatter = (i: number) => makeNode(i, (rand() - 0.5) * side, (rand() - 0.5) * side, options, i)

  // hub centers
  const hubIds: number[] = []
  for (let h = 0; h < hubCount && nodes.length < size; h++) {
    const id = nodes.length
    nodes.push(scatter(id))
    hubIds.push(id)
  }

  // preferential-attachment target multiset: a node appears once per leaf it has gained, so a uniform draw is
  // size-weighted (rich-get-richer). Seeded with each hub once; promoted sub-hubs are added as they appear.
  const attach: number[] = [...hubIds]
  while (nodes.length < size) {
    const id = nodes.length
    nodes.push(scatter(id))
    const parent = attach[Math.floor(rand() * attach.length)]
    edges.push(makeEdge(edgeId++, parent, id, options)) // parent -> child (ownership direction)
    attach.push(parent) // reinforce the parent's pull
    if (rand() < subHubProbability) attach.push(id) // promote: this leaf can now accrue its own leaves
  }

  // sparse bridges between distinct hubs, loosely linking the otherwise-separate ego networks
  const used = new Set<number>()
  for (let b = 0, attempts = 0, max = bridgeCount * 8; b < bridgeCount && hubCount > 1 && attempts < max; attempts++) {
    const a = hubIds[Math.floor(rand() * hubCount)]
    const c = hubIds[Math.floor(rand() * hubCount)]
    if (a === c) continue
    const key = edgeKey(size, a, c)
    if (used.has(key)) continue
    used.add(key)
    edges.push(makeEdge(edgeId++, a, c, options))
    b++
  }

  return { nodes, edges }
}
