# @sayari/trellis

WebGL renderer and graph state for Trellis.

`GraphState` owns the CPU-side typed arrays that feed the renderer:

- `nodePositions`: `Float32Array` of `[x, y]` by node slot
- `nodeRadii`: `Float32Array` by node slot
- `edgeEndpoints`: `Uint32Array` of `[sourceSlot, targetSlot]` by edge slot

The renderer uploads dirty ranges from these arrays to WebGL textures and buffers. WebGL rendering itself should stay on the main thread unless an application deliberately builds an `OffscreenCanvas` renderer integration.

## Main Thread

```ts
import { GraphState, Renderer } from '@sayari/trellis'

const state = new GraphState({ nodeStyles, edgeStyles })
const renderer = new Renderer(canvas)

state.addNodes(nodes)
state.addEdges(edges)
renderer.render(state)
```

## Worker-Compatible State

Layouts can run in an application worker and mutate the same CPU memory as the renderer when the hot columns are backed by `SharedArrayBuffer`:

```ts
const state = new GraphState({
  nodeStyles,
  edgeStyles,
  sharedArrayBuffers: true
})
```

The application owns the worker implementation. A typical setup is:

1. Main thread creates `GraphState` with `sharedArrayBuffers: true`.
2. Main thread adds nodes and edges, then sends the shared typed-array views and counts to a worker.
3. Worker runs a layout over those views and mutates `nodePositions`.
4. Worker posts progress or completion messages.
5. Main thread calls `state.markNodePositionsDirty()` when it receives those messages, then renders normally.

Example main-thread message handling:

```ts
worker.onmessage = () => {
  state.markNodePositionsDirty()
  renderer.render(state)
}
```

Browsers expose `SharedArrayBuffer` only for cross-origin isolated pages. Serve worker-enabled apps with:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

If `sharedArrayBuffers: true` is requested without `SharedArrayBuffer` support, `GraphState` throws immediately.
