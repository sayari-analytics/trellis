# Trellis

[![npm version](https://badge.fury.io/js/%40sayari%2Ftrellis.svg)](https://badge.fury.io/js/%40sayari%2Ftrellis)

A set of small packages for high-performance graph visualization: a WebGL renderer, layout algorithms, controls,
graph utilities, and a typed-array quadtree used by the force layout.

## Installation

Install the packages you need:

```bash
npm install @sayari/trellis
npm install @sayari/trellis-force @sayari/trellis-sugiyama @sayari/trellis-hierarchy
npm install @sayari/trellis-controls @sayari/trellis-utils
```

The packages are ESM-first and are intended to be consumed through a modern bundler.

```ts
import { GraphState, Renderer, DOMInteractionHandler } from '@sayari/trellis'
import { LayoutSync as ForceLayout } from '@sayari/trellis-force'
import { Layout as SugiyamaLayout } from '@sayari/trellis-sugiyama'
import { Layout as HierarchyLayout } from '@sayari/trellis-hierarchy'
import { Control as ZoomControl } from '@sayari/trellis-controls/zoom'
import { gridGraph, animate } from '@sayari/trellis-utils'
```

## Packages

- `@sayari/trellis` - core WebGL renderer, graph state, camera, paths, and DOM interaction handler.
- `@sayari/trellis-force` - synchronous and Web Worker force layout.
- `@sayari/trellis-sugiyama` - layered DAG / sankey-style layout.
- `@sayari/trellis-hierarchy` - tree layout.
- `@sayari/trellis-controls` - DOM controls for zoom, selection, and download.
- `@sayari/trellis-utils` - animation helpers, graph generators, connected components, and packing utilities.
- `@sayari/trellis-quadtree` - typed-array quadtree used by force simulation and collision detection.

## Examples

The maintained example app lives in `packages/examples`:

```bash
npm run examples:dev
```

## Philosophy

Trellis decouples graph rendering from graph layout computations. The renderer is driven by explicit graph state,
while layouts and controls are separate packages that can be adopted independently. If an existing package does
not fit your needs, you can bring your own layout or interaction layer while keeping the WebGL renderer and data
utilities that are useful.

## See Also

- [Sigma.js](https://www.sigmajs.org/)

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

## Publishing

Publish workspace packages with the root publish scripts:

```bash
npm run pub:dry
npm run pub:rc
npm run pub:patch
npm run pub:minor
npm run pub:major
```
