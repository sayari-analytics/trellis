# @sayari/trellis-force

Force layout for Trellis `GraphState`.

The layout mutates `GraphState.nodePositions` directly and reads `nodeRadii` and `edgeEndpoints` from the same slot-indexed typed arrays used by the WebGL renderer. The simulation owns only working memory such as velocities and quadtree scratch buffers.

## Main Thread

```ts
import { GraphState } from '@sayari/trellis'
import { Layout as ForceLayout } from '@sayari/trellis-force'

const state = new GraphState({ nodeStyles, edgeStyles })
state.addNodes(nodes)
state.addEdges(edges)

const force = ForceLayout(state, {
  ticks: 300,
  collidePadding: 8,
  params: {
    chargeStrength: -400,
    linkDistance: 140
  }
})

force.run()
```

For incremental or live layouts:

```ts
force.tick()
force.start()
force.stop()
```

Each main-thread tick marks the changed Trellis node slots dirty so the renderer uploads the shared positions on the next frame.

## Worker Setup

Worker construction and worker message protocols belong to the implementing app. This package intentionally does not export a worker entry because bundlers, deployment headers, cancellation, progress reporting, and scheduling vary by application.

To share renderer/layout memory with an app-owned worker, create the `GraphState` with `SharedArrayBuffer`-backed hot columns:

```ts
const state = new GraphState({
  nodeStyles,
  edgeStyles,
  sharedArrayBuffers: true
})
```

On the main thread, pass the shared views to your worker and mark positions dirty when the worker reports progress:

```ts
import { Layout as ForceLayout } from '@sayari/trellis-force'

const force = ForceLayout(state)
const worker = new Worker(new URL('./force.worker.ts', import.meta.url), { type: 'module' })

worker.onmessage = ({ data }) => {
  state.markNodePositionsDirty()
  if (typeof data === 'number') {
    console.log(`force progress: ${Math.round(data * 100)}%`)
  }
}

worker.postMessage({
  views: force.views(),
  ticks: 300,
  params: {
    chargeStrength: -400,
    linkDistance: 140
  }
})
```

In the app-owned worker, import the same simulation class the main-thread layout uses:

```ts
import { Simulation, ForceGraphViews, SimulationOptions } from '@sayari/trellis-force'

type Request = {
  views: ForceGraphViews
  ticks: number
  params?: SimulationOptions
}

self.onmessage = ({ data }: MessageEvent<Request>) => {
  const simulation = new Simulation(data.views, data.params)
  for (let i = 0; i < data.ticks; i++) {
    simulation.tick()
    if (i % 5 === 4) self.postMessage(i / data.ticks)
  }
  self.postMessage({ type: 'complete' })
}
```

Browsers expose `SharedArrayBuffer` only in cross-origin isolated pages. In practice that means serving with:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

If `sharedArrayBuffers: true` is requested without `SharedArrayBuffer` support, `GraphState` throws immediately.
