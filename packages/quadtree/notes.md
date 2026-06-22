## Algorithms/Layouts
- map: for each node, apply a function to update the node
  - O(n)
  - replaces fisheye
- connected components: split graph into connected components
- tidy tree: Reingold-Tilford tidy layout algorithm to visualize hierarchy
- leiden community detection
- Force Layout
- Circle Packing
- Phyllotaxis Layout


## Layout Pipeline
- if the graph has no edges, layout using a circle packing algorithm
- otherwise, for each connected component
  - pack each each leiden community using circle packing
  - apply force layout
- combine all connected components using circle packing

## TODO
1. move aggregateMass from quads to quadsCenterOfMass and rename to quadMasses
2. compaction
  - create two element typed arrays: elementsLinkedList<[elementId, nextElementPtr]> and elementsArray<[length, ...elements]>
  - maybe create quadsSparseArray<[elementPtr, mass, comX, comY]> which is compacted into quadsLinkedList<[elementPtr, childQuadId]> and quadMassesLinkedList<[mass, comX, comY]>
    - compute comX/comY at compaction
4. explore better abstractions to accessing quads/elements that lowers complexity without impacting performance
5. allow fixed radius
6. what to do with collisions Set and traversedQuads Uint8Array
7. or
  - compactQuads: Uint32Array<[nwPtr, nePtr, swPtr, sePtr, mass, comX, comY, elementLength, ...elements]>
  - memory: 8 bytes/quad + 1 byte/element
