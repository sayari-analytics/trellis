import type { Id, Node, Edge } from '@sayari/trellis'
import {
  createDirectedIndex,
  findBackEdges,
  assignLayers,
  buildLayeredGraph,
  orderVertices,
  assignCoordinates,
  nodeKey,
  LayerAlignment
} from './utils'

/**
 * Sugiyama layered-DAG layout for trellis graphs.
 *
 * Given a flat node/edge graph, it directs flow from `edge.source` -> `edge.target`, assigns each node to
 * a layer (longest-path layering), orders nodes within each layer to minimize edge crossings (barycenter
 * heuristic), and lays them out into rows.
 *
 * Cycles are unavoidable in real graphs but a sankey must be acyclic, so cycle-closing "back edges" are
 * detected and excluded from layering/ordering; they're surfaced (per edge) to `applyEdge` so a renderer
 * can still draw and style them.
 *
 * GEOMETRY IS NEVER ASSUMED. The layout's only intrinsic output is node *position*. Everything else crosses
 * the boundary through caller-supplied functions, in both directions:
 *   - INPUT accessors tell the layout how much space things occupy / how heavy links are:
 *       `nodeBreadth(node)` — across-flow extent (default `2 * radius`; a sankey returns a value-scaled
 *                             height). Drives stacking and overlap.
 *       `linkValue(edge)`   — link weight (default `() => 1`). Weights the crossing-minimization barycenter
 *                             and the per-node flow totals.
 *   - OUTPUT accessors let the caller fold the computed layout/flow data into renderable node/edge objects:
 *       `applyNode(node, layout)` — receives the positioned node + its NodeLayout; returns the final node.
 *       `applyEdge(edge, layout)` — receives the edge + its EdgeLayout; returns the final edge.
 * With no accessors the result is position-only nodes + unchanged edges (a Sugiyama layered-graph layout).
 * Provide accessors to build sankey-style node/edge geometry from the computed layout metadata.
 */

// `controlPoints` are routing waypoints for edges spanning multiple layers.

// TODO (link sub-band offsets): `source.offset`/`target.offset` are stubbed to 0. They will carry each
// link's stacked attachment offset within a node's breadth extent (ordered by partner position, d3-sankey's
// computeLinkBreadths) so ribbon edges attach to sub-bands rather than the node center. Only meaningful
// once a ribbon/curved edge renderer exists; the shape is fixed now so adding it is not an API change.

// the layout data computed for each node, handed to `applyNode`
export type NodeLayout = {
  layer: number // layer index, 0 = source-most
  order: number // index within its layer, top-most first
  breadth: number // breadth-axis extent used by the layout (the `nodeBreadth` value)
  flowIn: number // sum of incoming link values (incl. back edges)
  flowOut: number // sum of outgoing link values (incl. back edges)
}

// the layout data computed for each edge, handed to `applyEdge`
export type EdgeLayout = {
  value: number // the `linkValue` of this edge
  back: boolean // true if this edge closes a cycle and was excluded from layering
  layerSpan: number // |layer(target) - layer(source)|; 0 = intra-layer, 1 = adjacent, >1 = routed/long
  controlPoints: { x: number; y: number }[] // world-space routing waypoints (one per crossed layer); empty for short edges
  // laid-out endpoint positions (post-orientation + centroid transform) + stacked attachment offset (0 until
  // ribbons). x/y let applyEdge build geometry relative to the endpoints — e.g. orthogonal elbow routing.
  source: { x: number; y: number; offset: number }
  target: { x: number; y: number; offset: number }
}

export type Options<N extends Node, E extends Edge> = Partial<{
  x: number // additional x offset applied on top of the centroid centering
  y: number // additional y offset applied on top of the centroid centering
  orientation: 'bottom' | 'left' | 'top' | 'right' // direction the flow grows (left = flow rightward)
  layerAlignment: LayerAlignment // layer assignment: 'min' (default), 'max', or 'justify'
  layerGap: number // gap between layers along the flow axis
  rowGap: number // gap between nodes within a layer along the breadth axis
  iterations: number // crossing-minimization sweeps (default 6)
  sort: (a: N, b: N) => number // tie-break ordering between nodes with equal barycenter within a layer
  nodeBreadth: (node: N) => number // INPUT: across-flow extent of a node (default: 2 * node.radius)
  linkValue: (edge: E) => number // INPUT: link weight for ordering + flow totals (default: () => 1)
  applyNode: (node: N, layout: NodeLayout) => N // OUTPUT: fold layout/flow data into the rendered node
  applyEdge: (edge: E, layout: EdgeLayout) => E // OUTPUT: fold layout/flow data into the rendered edge
  // TODO: `size: [number, number]` to scale the whole diagram to fit a [width, height] box, mirroring the
  // hierarchy layout's `size` option (overrides layerGap/rowGap). Omitted until the extents-and-scale math is
  // worked out against the extent-aware coordinate assignment.
}>

const DEFAULT_LAYER_GAP = 200
const DEFAULT_ROW_GAP = 40
const DEFAULT_ITERATIONS = 6

export const layout = <N extends Node, E extends Edge>(nodes: N[], edges: E[], options: Options<N, E> = {}): { nodes: N[]; edges: E[] } => {
  const nodeBreadth = options.nodeBreadth ?? ((node: N) => 2 * node.radius)
  const linkValue = options.linkValue ?? (() => 1)
  const applyNode = options.applyNode ?? ((node: N) => node)
  const applyEdge = options.applyEdge ?? ((edge: E) => edge)

  if (nodes.length === 0) {
    return { nodes, edges }
  }

  const index = createDirectedIndex({ nodes, edges })
  const backEdges = findBackEdges(index, nodes)

  const { layer: layerOf, maxLayer } = assignLayers(index, nodes, backEdges, options.layerAlignment ?? 'min')
  const layered = buildLayeredGraph(index, nodes, edges, layerOf, maxLayer, linkValue)
  orderVertices(index, layered, maxLayer, options.iterations ?? DEFAULT_ITERATIONS, options.sort)

  const coords = assignCoordinates(index, layered, nodeBreadth, options.layerGap ?? DEFAULT_LAYER_GAP, options.rowGap ?? DEFAULT_ROW_GAP)

  const orderOf = new Map<Id, number>()
  layered.slots.forEach((layer) => {
    let i = 0
    for (const key of layer) {
      const vertex = layered.vertices.get(key)!
      if (vertex.kind === 'node') orderOf.set(vertex.id, i++)
    }
  })

  const flow = new Map<Id, { in: number; out: number }>()
  for (const node of nodes) {
    let inFlow = 0
    let outFlow = 0
    for (const { edge } of index[node.id].outgoing) outFlow += linkValue(edge)
    for (const { edge } of index[node.id].incoming) inFlow += linkValue(edge)
    flow.set(node.id, { in: inFlow, out: outFlow })
  }

  // Map raw layout coordinates onto world x/y per orientation; +y is up in the renderer.
  const toWorld = (coord: { depth: number; breadth: number }): { x: number; y: number } => {
    switch (options.orientation) {
      case 'left':
        return { x: coord.depth, y: coord.breadth } // flow rightward
      case 'right':
        return { x: -coord.depth, y: coord.breadth } // flow leftward
      case 'bottom':
        return { x: coord.breadth, y: coord.depth } // flow upward
      default:
        return { x: coord.breadth, y: -coord.depth } // 'top': flow downward
    }
  }

  const positioned = nodes.map((node) => ({ node, ...toWorld(coords.get(nodeKey(node.id))!) }))

  const count = nodes.length
  let inputCx = 0
  let inputCy = 0
  let layoutCx = 0
  let layoutCy = 0
  for (let i = 0; i < count; i++) {
    inputCx += nodes[i].x
    inputCy += nodes[i].y
    layoutCx += positioned[i].x
    layoutCy += positioned[i].y
  }
  const dx = (inputCx - layoutCx) / count + (options.x ?? 0)
  const dy = (inputCy - layoutCy) / count + (options.y ?? 0)

  // Interior virtual nodes become edge routing waypoints.
  const controlPointsByEdge = new Map<Id, { x: number; y: number }[]>()
  for (const { edge, keys } of layered.routes) {
    if (keys.length <= 2) continue // short edge: endpoints only, no waypoints
    const points: { x: number; y: number }[] = []
    for (let i = 1; i < keys.length - 1; i++) {
      const world = toWorld(coords.get(keys[i])!)
      points.push({ x: world.x + dx, y: world.y + dy })
    }
    controlPointsByEdge.set(edge.id, points)
  }

  // final (recentered) world position per node id, so applyEdge can route relative to the endpoints
  const finalPos = new Map<Id, { x: number; y: number }>()
  for (const { node, x, y } of positioned) finalPos.set(node.id, { x: x + dx, y: y + dy })

  return {
    nodes: positioned.map(({ node, x, y }) => {
      const positionedNode = { ...node, x: x + dx, y: y + dy }
      const coord = coords.get(nodeKey(node.id))!
      const f = flow.get(node.id)!
      return applyNode(positionedNode, {
        layer: layerOf.get(node.id)!,
        order: orderOf.get(node.id)!,
        breadth: coord.extent,
        flowIn: f.in,
        flowOut: f.out
      })
    }),
    edges: edges.map((edge) => {
      const sourceLayer = layerOf.get(edge.source)
      const targetLayer = layerOf.get(edge.target)
      const layerSpan = sourceLayer !== undefined && targetLayer !== undefined ? Math.abs(targetLayer - sourceLayer) : 0
      const s = finalPos.get(edge.source) ?? { x: 0, y: 0 }
      const t = finalPos.get(edge.target) ?? { x: 0, y: 0 }
      return applyEdge(edge, {
        value: linkValue(edge),
        back: backEdges.has(edge.id),
        layerSpan,
        controlPoints: controlPointsByEdge.get(edge.id) ?? [],
        source: { x: s.x, y: s.y, offset: 0 },
        target: { x: t.x, y: t.y, offset: 0 }
      })
    })
  }
}
