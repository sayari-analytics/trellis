# Quadtree

A linear circle region quadtree for efficient force-directed graph simulations, including collision detection and Barnes-Hut N-body comparisons.
The Quadtree indexes quads in Typed Arrays, leading to better data locality and increased cache hits.
This implementation is heavily inspired by [this StackOverflow answer by Dragon Energy](https://stackoverflow.com/a/48330314/2287885).

## Usage

```ts
import { Quadtree } from '@sayari/trellis-quadtree'

// elements packed as [x, y, radius], stride 3
const elements = new Float32Array([10, 10, 3, 5, 5, 2, -6, -6, 4])
const quadtree = new Quadtree(elements)

// after mutating element positions in place, reindex
quadtree.rebuild()

// unique collision pairs. dx/dy/distanceSquared are position[id1] - position[id2]
quadtree.forEachCollision((id1, id2, dx, dy, distanceSquared) => { /* resolve overlap */ })

// Barnes-Hut N-body. theta is the approximation threshold
quadtree.forEachBody((id, bodyX, bodyY, mass, distanceSquared) => { /* accumulate force */ }, 0.9)
```

- construct the quadtree once and call `rebuild()` each tick after positions change — it reuses its buffers
- the quadtree holds a reference to `elements` and reads positions in place, so there is no per-tick copy

## Element
- each element stored in the quadtree has an x and y position stored in the Float32 `elements` array
  - the stride is configurable, allowing the user to associate additional metadata with each element, which the quadtree ignores
- each element's id indexes into the elements array. given elements `[10, 10, 3, 5, 5, 2, -6, -6, 4]` and a stride of 3
  - element 0 = (x: 10, y: 10, r: 3)
  - element 1 = (x: 5, y: 5, r: 2)
  - element 2 = (x: -6, y: -6, r: 4)
- radius and mass are each either a constant shared by all elements, or read per element from the array at an offset
  - `{ radius: 5 }` gives every element a radius of 5; `{ radius: { offset: 2 } }` reads it from the array (the default)
  - `mass` (used by `forEachBody` and the center of mass) defaults to a constant of 1

## Quad
- the quadtree is a complete, pointerless tree: every possible quad is pre-allocated, so quads are navigated by arithmetic rather than pointers
  - a quad's first (NW) child id is `4 * quadId + 1`; NE, SW, SE follow
  - a quad's parent id is `Math.floor((quadId - 1) / 4)`
  - the total number of quads is `(4 ** (maxDepth + 1) - 1) / 3`
  - the root quad has id 0
- each quad is one of:
  - a branch, whose elements live in its children
  - a leaf, pointing to its first element in the `quadElements` linked list
  - an empty leaf
- elements are inserted into every leaf their bounding circle overlaps, then leaves are merged bottom-up into a parent quad when the parent has room for them
- to save space, quad bounds are only stored for the root quad. all other quads' bounds are computed on the fly when traversing the quadtree

## Storage
- `quads`: stride 1 * 4 bytes = 4 bytes/quad — pointer to the quad's first element (or a branch / empty marker)
- `quadMasses`: stride 3 * 4 bytes = 12 bytes/quad — aggregate mass and mass-weighted center of mass
- `quadElements`: stride 2 * 4 bytes = 8 bytes/element — a linked list of `[elementId, nextElementPtr]`
- total storage when indexing 100k elements at depth 8: 87,381 quads * 16 bytes + ~100k elements * 8 bytes ≈ 2.2 MB

## Configuration
- `maxDepth`: defaults to an adaptive `round(log4(elementCount))` clamped to `[4, 16]` (16 is the limit of 32-bit Morton encoding). pass a number to override
- `maxCapacity`: the most elements a leaf can hold before it becomes a branch. default 8

## Performance
- run `npm run perf` for the full suite, `npm run perf:d3` to compare against d3-quadtree / d3-force
- rough single-threaded figures for 100k normally-distributed elements:
  - rebuild ≈ 9 ms
  - collision pairs ≈ 21 ms — ~40x faster than d3-force's forceCollide
  - Barnes-Hut N-body ≈ a few hundred ms depending on theta — O(n log n), ~5M interactions at theta 1.5
