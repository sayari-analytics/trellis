# Quadtree

A pointerless (aka linear) region quadtree for efficiently indexing millions of circles.
The Quadtree indexes quads in Typed Arrays using pointer arithmetic, leading to better data locality and increased cache hits.
This implementation is heavily inspired by [this StackOverflow answer by Dragon Energy](https://stackoverflow.com/a/48330314/2287885)

## Element
- each element stored in the quadtree has an x and y position and radius stored in the elements Float32 typed array
  - the elements stride is configurable, allowing the user to associate additional metadata with each element, which the quadtree ignores
- each element has an integer id to index into the elements typed array. given elements: [10, 10, 3, 5, 5, 2, -6, -6, 4]
  - element 1 = (x: 10, y: 10, r: 3)
  - element 2 = (x: 5, y: 5, r: 2)
  - element 3 = (x: -6, y: -6, r: 4)

## QuadNode
- the quad tree has a max depth of 8, and 21,845 total possible child quads. 4 ^ depth for depth 0..8, or 1 + 4 + 16 + 64 + 256 + 1,024 + 4,096 + 16,384 = 21,845 quads
- each quad has an integer id that indexes into the quads typed array, which packs quad metadata as [firstElementIndex, elementCount, firstChildQuadIndex]
  - firstElementIndex is the index of the index of the first element in quadElementsLinkedList. if 0, the quad has no elements
  - elementCount is the count of all elements in this quad and across all child quads
  - for branch quads, firstChildQuadIndex points to the first child quad. leaf quads' firstChildQuadIndex is 0.
    - a quad's NW child id is stored in quads[parentQuadId + 2]
    - a quad's NE child id is stored in quads[parentQuadId + 2] + 1
    - a quad's SW child id is stored in quads[parentQuadId + 2] + 2
    - a quad's SE child id is stored in quads[parentQuadId + 2] + 3
- the root quad has id 0
- quadElementsLinkedList contains linked lists of all elements in all quads, which are packed as [elementIndex, nextElementIndex]
  - if nextElementIndex = 0, elementIndex is the quad's last element
  - if nextElementIndex > 0, it stores the index into quadElementsLinkedList of the quad's next element
- to save space, quad bounds are only stored for the root quad. all other quads' bounds are computed on the fly when inserting into and retrieving from the quadtree

## Storage
- elements: elements * default stride of 3 array values per element * 4 Float32 bytes per value. 100k elements = 1,200,000 bytes
- quads: 21,845 quads * stride of 3 values per element, 4 Uint32 bytes per quad. 262,140 bytes
- quadsMass: 21,845 quads * stride of 2 values per element, 4 Float32 bytes per quad. 174,760 bytes
- quadElementsLinkedList: elements * stride of 2 array values per element * 4 Uint32 bytes per value. 100k elements = 800,000 bytes
- storage for 100k elements: 2.4MB

## Performance
- TODO
