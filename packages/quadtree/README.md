# Quadtree

A pointerless circle region quadtree for efficient force-directed graph simulations, including collision detection and Barnes-Hut N-body comparisons.
The Quadtree indexes quads in Typed Arrays, leading to better data locality and increased cache hits.
This implementation is heavily inspired by [this StackOverflow answer by Dragon Energy](https://stackoverflow.com/a/48330314/2287885).

## Usage
TODO

## Element
- each element stored in the quadtree has an x and y position and radius stored in the Float32 `elements` array
  - the elements stride is configurable, allowing the user to associate additional metadata with each element, which the quadtree ignores
- each element's id indexes into the elements array, with stride `[x, y, r, ...]`. given elements: `[10, 10, 3, 5, 5, 2, -6, -6, 4]` and a stride of 3
  - element 1 = (x: 10, y: 10, r: 3)
  - element 2 = (x: 5, y: 5, r: 2)
  - element 3 = (x: -6, y: -6, r: 4)

## Quad
- each quad's id indexes into the quads array, with stride `[firstElementId, firstChildQuadId, mass]`
  - `firstElementId` is an index pointer of that quad's first element in `quadElements` linked list. if 0, the quad has no elements
  - for branch quads, `firstChildQuadId` points to the first child quad. leaf quads' `firstChildQuadId` is 0.
    - a quad's NW child id quads[parentQuadId + 1]
    - a quad's NE child id quads[parentQuadId + 1] + 1
    - a quad's SW child id quads[parentQuadId + 1] + 2
    - a quad's SE child id quads[parentQuadId + 1] + 3
- the root quad has id 0
- to save space, quad bounds are only stored for the root quad. all other quads' bounds are computed on the fly when traversing the quadtree

## Storage
- quads: stride 3 * bytes per quad 4 = 12 bytes/quad
- quadElements: stride 2 * bytes per element 4 = 8 bytes/element
- total storage when indexing 100k elements: ~21,845 quads * 12 bytes + 100,000 elements * 8 bytes ~= 1,062,140 bytes

## Performance
TODO
