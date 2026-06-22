# @sayari/trellis-utils

Helpers that build on the trellis core but aren't part of the renderer, kept in a separate package so the
core stays dependency-free. All of it operates on the same `{ nodes, edges }` shape the generators produce,
the layouts consume, and `GraphState` accepts.

- **animation** — `animate`, `interpolatePosition`, `interpolateViewport`, `smootherstep`
- **generators** — `gridGraph`, `randomGraph`, `scaleFreeGraph`, `smallWorldGraph`, `clusteredGraph`,
  `treeGraph`, `geometricGraph`, `egoForestGraph` (for tests, demos, perf harnesses)
- **components** — `connectedComponents`, `subgraphs`
- **packing** — `packCircles`, `packRectangles`, `enclose`

This document focuses on **components + packing**, and on the two layout patterns they're meant to enable.

## Components

```ts
import { connectedComponents, subgraphs } from '@sayari/trellis-utils'

// label every node with its weakly-connected component (union-find, ~O(n + e))
const { count, componentByNode, components } = connectedComponents({ nodes, edges })

// or split the graph into one independent { nodes, edges } per component (objects preserved, not cloned)
const parts = subgraphs({ nodes, edges }) // { nodes, edges }[]
```

`subgraphs` is the bridge to the layouts: a graph with many disconnected components is both slower and uglier
to lay out all at once. Split it, lay out each part independently, then pack the parts back together.

## Packing

The packing exports are **geometry primitives** — they speak radii, sizes, and circles, never nodes and
edges. The graph-aware glue (which radius represents a node, how to bound a laid-out component, where to
translate each result) is intentionally left to the application, where the node and layout shapes are known.

```ts
import { packCircles, packRectangles, enclose } from '@sayari/trellis-utils'

// pack circles of these radii into a compact, overlap-free cluster centered on the origin.
// `padding` is the minimum gap between neighbors. Returns one { x, y } center per radius, in input order.
const centers = packCircles([10, 20, 5, 15], 4)

// pack axis-aligned boxes into a roughly square region (shelf packing). Returns one min-corner per box.
const corners = packRectangles([{ width: 100, height: 20 }, { width: 30, height: 200 }], 8)

// smallest circle enclosing a set of circles — useful for bounding a cluster
const bound = enclose([{ x: 0, y: 0, r: 5 }, { x: 30, y: 0, r: 10 }]) // -> { x, y, r }
```

**Circle vs. rectangle.** `packCircles` (Wang et al.'s front-chain algorithm, same as d3's `packSiblings`)
is the right model when each footprint is roughly round — a force-directed blob, a single node. It wastes
space on footprints that are far wider than tall or vice versa: a sugiyama/layered diagram is a long ribbon,
and a bounding circle leaves most of its disk empty. For those, bound each footprint with a box and use
`packRectangles`. A simple heuristic: switch to rectangles when `max(w/h, h/w)` exceeds ~2.5.

### Pattern: pack a batch of edge-less nodes

Dropping a set of unconnected nodes onto the graph? Pack them into a tight disk cluster. Map each node to its
radius, pack, then translate to wherever you want the cluster centered.

```ts
import type { Node } from '@sayari/trellis'
import { packCircles } from '@sayari/trellis-utils'

const packNodes = <N extends Node>(nodes: N[], { padding = 0, center = { x: 0, y: 0 } } = {}): N[] => {
  // pack largest-first for the roundest cluster, but return positions in the original node order
  const order = nodes.map((_, i) => i).sort((a, b) => nodes[b].radius - nodes[a].radius)
  const centers = packCircles(order.map((i) => nodes[i].radius), padding)
  const positions: { x: number; y: number }[] = []
  order.forEach((nodeIndex, packIndex) => (positions[nodeIndex] = centers[packIndex]))
  return nodes.map((node, i) => ({ ...node, x: positions[i].x + center.x, y: positions[i].y + center.y }))
}
```

### Pattern: pack independently laid-out components

For a graph with many disconnected components, lay out each component on its own (faster, more compact), then
pack the results into one non-overlapping scene by applying a single rigid translation per component — the
internal layout is never disturbed.

```ts
import type { Node, Edge, Bounds } from '@sayari/trellis'
import { subgraphs, packCircles, packRectangles, enclose } from '@sayari/trellis-utils'
import * as Force from '@sayari/trellis-force'

// derive each component's footprint from its node positions (until layouts return `Bounds` directly — below)
const boundsOf = <N extends Node>(nodes: N[]): Bounds => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.radius); minY = Math.min(minY, n.y - n.radius)
    maxX = Math.max(maxX, n.x + n.radius); maxY = Math.max(maxY, n.y + n.radius)
  }
  return { minX, minY, maxX, maxY }
}

const packComponents = <N extends Node, E extends Edge>(
  components: { nodes: N[]; edges: E[] }[],
  { padding = 0, aspectThreshold = 2.5 } = {}
): { nodes: N[]; edges: E[] } => {
  const parts = components.filter((c) => c.nodes.length > 0)
  const bounds = parts.map((c) => boundsOf(c.nodes))
  const elongated = bounds.some((b) => {
    const w = b.maxX - b.minX, h = b.maxY - b.minY
    return w > 0 && h > 0 && Math.max(w / h, h / w) > aspectThreshold
  })

  // compute a translation per component that moves its footprint onto the packed slot
  let translate: { dx: number; dy: number }[]
  if (elongated) {
    const corners = packRectangles(bounds.map((b) => ({ width: b.maxX - b.minX, height: b.maxY - b.minY })), padding)
    translate = bounds.map((b, i) => ({ dx: corners[i].x - b.minX, dy: corners[i].y - b.minY }))
  } else {
    const circles = parts.map((c) => enclose(c.nodes.map((n) => ({ x: n.x, y: n.y, r: n.radius }))))
    const centers = packCircles(circles.map((c) => c.r), padding)
    translate = circles.map((c, i) => ({ dx: centers[i].x - c.x, dy: centers[i].y - c.y }))
  }

  return {
    nodes: parts.flatMap((c, i) => c.nodes.map((n) => ({ ...n, x: n.x + translate[i].dx, y: n.y + translate[i].dy }))),
    edges: components.flatMap((c) => c.edges)
  }
}

// end to end: split → lay out each part → pack the parts
const layout = Force.LayoutSync()
const laidOut = subgraphs({ nodes, edges }).map((part) => layout(part))
const packed = packComponents(laidOut, { padding: 40 })
graphState.updateNodePositions(packed.nodes) // optionally via interpolatePosition for a transition
```

## Why the graph-aware wrappers live in user-land

`packCircles` / `packRectangles` stay graph-agnostic on purpose. The mapping from a graph to geometry is
where the application's decisions live: which value is a node's radius, whether to bound a component by its
circle or its box, how to order the pack, where to translate the result, and what to do with cross-component
edges. Baking those choices into the library would either hide them behind options or guess wrong. The
primitives are small and stable; the wrappers above are a starting point to copy and adapt.

## On `{ nodes, edges }` vs. geometry types

A deliberate split, worth stating since it drives the API above:

- **Graph-domain utils take and return `{ nodes, edges }`.** `connectedComponents` and `subgraphs` do, as do
  the generators and every layout. It's the lingua franca of the ecosystem — `GraphState` consumes it, the
  layouts round-trip it — so these compose without adapters.
- **Geometry primitives take and return geometry.** `packCircles`/`packRectangles`/`enclose` work on radii,
  sizes, and circles. Coupling them to the `Node` shape would make them less reusable and would force the
  graph→geometry mapping (the interesting part) to happen somewhere implicit. Keeping them pure pushes that
  mapping into the open, in the wrappers above.

## Future: layouts return `Bounds`

The component-packing pattern recomputes each footprint from node positions (`boundsOf`). The layouts already
know their own extent internally, so they could return it directly:

```ts
type LayoutResult<N, E> = { nodes: N[]; edges: E[]; bounds: Bounds }
```

`Bounds` is exported from `@sayari/trellis` (an axis-aligned box, `{ minX, minY, maxX, maxY }`). Once layouts
return it, `packComponents` drops `boundsOf` and uses the exact extent — and the same `Bounds` serves other
consumers (fit-camera-to-content, selection extents).
