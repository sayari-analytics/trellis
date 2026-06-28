# @sayari/trellis-sugiyama

Sugiyama layered graph layout for Trellis `GraphState` instances. The layout mutates node positions and edge paths in the supplied graph state and returns layout metrics.

## Usage

```ts
import { layout } from '@sayari/trellis-sugiyama'

const run = layout(graphState, {
  orientation: 'top',
  route: { type: 'spline', smoothing: 2 },
  layerGap: 220,
  rowGap: 16
})
const result = run({ orderingIterations: 6, coordinateIterations: 6 })
```

## API

```ts
layout(graphState: GraphState, options?: Options): (options?: Options) => LayoutResult<SugiyamaMetrics>
```

Options passed to the returned runner update the cached layout configuration, so callers can start with a fast preview and rerun with higher `orderingIterations`, `coordinateIterations`, or routing detail.

### Options

- `orientation`: `'top' | 'bottom' | 'left' | 'right'`. Direction of layer flow. Defaults to `'top'`.
- `ranking`: `'longest-path' | 'network-simplex'`. Rank assignment strategy. Defaults to `'network-simplex'`.
- `ordering`: `'barycenter' | 'sifting'`. Crossing minimization strategy. Defaults to `'sifting'`.
- `refinement`: `'none' | 'adjacent-swaps' | 'sifting'`. Crossing refinement after barycenter sweeps. Defaults to adjacent swaps for barycenter ordering and sifting for sifting ordering.
- `route`: Edge path style. Defaults to `{ type: 'orthogonal', mode: 'bus' }`.
- `breadthAlignment`: `'center' | 'min' | 'max'`. Aligns layer breadth bounds after coordinate assignment. Defaults to `'center'`.
- `layerGap`: Distance between ranks. Defaults to `240`.
- `rowGap`: Distance between nodes within a rank. Defaults to `28`.
- `orderingIterations`: Barycenter sweep count before refinement. Defaults to `6`.
- `coordinateIterations`: Dense coordinate relaxation pass count. Defaults to `6`.
- `maxSiftingRounds`: Sifting refinement rounds. Defaults to `3`.
- `portGrouping`: Enables high-degree port grouping. Defaults to `true`.
- `bundling`: Enables long-edge dummy-chain bundling. Defaults to `true`.
- `confluentBundling`: Enables strict topology-preserving biclique bundles between adjacent layers. Defaults to `false`.
- `nodeBreadth(node)`: Node size along the layer breadth axis. Defaults to `node.radius * 2`.
- `linkValue(edge)`: Edge weight for ranking, ordering, and coordinate assignment. Defaults to `1`.
- `minLayerSpan(edge)`: Minimum number of layers an edge must span. Defaults to `1`.
- `decorateEdge(edge, layout)`: Optional postprocessor for edge `label`, `style`, or `width`. Path generation is controlled only by `route`.

### Route

```ts
type Route =
  | { type: 'straight'; backEdges?: 'loop' | 'route' | 'hide' }
  | { type: 'spline'; smoothing?: number; backEdges?: 'loop' | 'route' | 'hide' }
  | {
      type: 'orthogonal'
      mode?: 'bus' | 'control-points'
      radius?: number
      spacing?: number
      fanRouting?: false | {
        minDegree?: number
        trunkOffset?: number
        stubSpacing?: number
        maxTrunksPerNode?: number
      }
      corridors?: false | {
        enabled?: boolean
        padding?: number
        trackSpacing?: number
      }
      backEdges?: 'loop' | 'route' | 'hide'
    }
```

- `{ type: 'straight' }`: Omits explicit paths so the renderer draws direct source-to-target lines.
- `{ type: 'spline' }`: Follows Sugiyama dummy chains and smooths them with bounded Chaikin subdivision. `smoothing` defaults to `0`.
- `{ type: 'orthogonal', mode: 'bus' }`: Routes overlapping edge channels through separated bus lanes. `spacing` defaults to the widest edge width plus `2`; `radius` defaults to `12`.
- `{ type: 'orthogonal', mode: 'control-points' }`: Uses dummy/control points directly but renders them as axis-aligned segments.
- `fanRouting`: For high-degree `K1,n` / `Kn,1` structures, routes selected orthogonal edges through ordered shared trunks while preserving each edge path. `stubSpacing` controls the small per-edge lane and port spread within the trunk.
- `corridors`: Places fan trunks on inter-layer corridor tracks computed from adjacent rank bounds. Overlapping trunks use separate interval-colored tracks.
- `backEdges`: Controls feedback edges from cyclic input. Defaults to `'loop'`; `'route'` draws direct restored routes; `'hide'` sets feedback edge width to `0`.

### Confluent Bundling

```ts
confluentBundling:
  | false
  | {
      enabled?: boolean
      minBicliqueEdges?: number
      maxBundlesPerLayerPair?: number
    }
```

Confluent bundling detects strict adjacent-layer `Kp,q` structures where `p >= 2` and `q >= 2` after long edges are made proper. Routed edges keep their original identities, but selected biclique segments share a center track.

### Metrics

The returned `metrics` include SCC counts, reversed edge counts, layer count, total edge span, virtual node count, crossing count, coordinate extent, routed segment/control counts, confluent bundle counts, fan trunk counts, corridor track counts, approximate edge ink, port group count, and edge straightness.

## Computation Phases

### Phase 1: Decycling

Tarjan SCC detection isolates cyclic components. Eades-Lin-Smyth greedy feedback arc set reverses low-cost edges inside cyclic components so later phases operate on a DAG. Reversed edges are restored to their original direction during output.

### Phase 2: Ranking

Longest-path ranking creates an initial feasible layering. A network-simplex-style tightening pass reduces weighted edge span while preserving `minLayerSpan` constraints. This limits virtual node count and keeps long edges as short as possible.

### Phase 3: Crossing Minimization

Long edges are split into dummy chains so every edge connects adjacent layers. Barycenter sweeps reorder each layer, bundled dummy chains keep parallel routes stable, optional confluent biclique metadata is selected for routing, and sifting plus adjacent swaps refine the crossing count with local crossing matrices.

### Phase 4: Coordinate Assignment

Port grouping widens high-degree nodes so incident edges share stable anchor bands. Dense graphs use Brandes-Köpf-style median relaxation with dummy-aware spacing and large group-gap compaction. Sparse branch/merge DAGs use lane alignment to preserve long tracks. `breadthAlignment` can align layer bounds to the minimum, center, or maximum breadth.

### Phase 5: Routing

Routing is fully controlled by `route`. Spline routing follows dummy chains and smooths them with Chaikin subdivision. Orthogonal bus routing separates overlapping channel runs, while control-point routing renders the dummy chain as axis-aligned segments. Feedback edges can route as forward loops, restored direct routes, or hidden edges.
