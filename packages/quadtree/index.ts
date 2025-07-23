export class Quadtree {
  // Constants
  static readonly QUAD_MAX_CAPACITY = 8
  static readonly QUAD_MAX_DEPTH = 8
  static readonly QUAD_COUNT = 21_845 // 1 + 4 + ... + 4^8
  static readonly QUAD_STRIDE = 3 // [firstElementIndex, elementCount, firstChildId]
  static readonly QUAD_ELEMENTS_LINKED_LIST_STRIDE = 2 // [elementId, nextElementIndex]
  static readonly QUAD_MASS_STRIDE = 2 // [centerOfMassX, centerOfMassY]

  // Element Data
  private elements: Float32Array
  private elementStride: number
  private elementXOffset: number
  private elementYOffset: number
  private elementRadiusOffset: number
  private elementCount: number

  // Tree Bounds
  private minX: number
  private minY: number
  private maxX: number
  private maxY: number

  // Tree Data Structures
  private quadBuffer: ArrayBuffer
  private quads: Uint32Array
  private quadsMass: Float32Array
  private quadElementsLinkedList: Uint32Array
  private findQueue: number[] = []
  private subdivisionHeadPtrs = new Uint32Array(5)

  // Allocators
  private nextQuadId = 1 // 0 is reserved for the root node
  private nextElementsLinkedPtr = 1 // 0 is reserved to indicate end-of-list

  /**
   * Create a pointerless region Quadtree from the given element circles.
   * @param elements Float32Array containing each circle element. By default, each element is packed as [x, y, radius].
   * @param stride Default 3, which assumes datum packing of [x, y, radius].
   * @param xOffset Default 0, which assumes datum packing of [x, y, radius].
   * @param yOffset Default 1, which assumes datum packing of [x, y, radius].
   * @param radiusOffset Default 2, which assumes datum packing of [x, y, radius].
   */
  constructor(elements: Float32Array, stride = 3, xOffset = 0, yOffset = 1, radiusOffset = 2) {
    this.elements = elements
    this.elementStride = stride
    this.elementXOffset = xOffset
    this.elementYOffset = yOffset
    this.elementRadiusOffset = radiusOffset
    this.elementCount = this.elements.length / this.elementStride

    if (this.elements.length % this.elementStride !== 0) {
      throw new Error(`Invalid elements length. Must be a multiple of stride (${this.elementStride}).`)
    }

    const quadsByteLength = Quadtree.QUAD_COUNT * Quadtree.QUAD_STRIDE * Uint32Array.BYTES_PER_ELEMENT
    const quadsMassByteLength = Quadtree.QUAD_COUNT * Quadtree.QUAD_MASS_STRIDE * Float32Array.BYTES_PER_ELEMENT
    const quadElementsLinkedListByteLength =
      (this.elementCount + 1) * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE * Uint32Array.BYTES_PER_ELEMENT

    this.quadBuffer = new ArrayBuffer(quadsByteLength + quadsMassByteLength + quadElementsLinkedListByteLength)
    this.quads = new Uint32Array(this.quadBuffer, 0, Quadtree.QUAD_COUNT * Quadtree.QUAD_STRIDE)
    this.quadsMass = new Float32Array(this.quadBuffer, quadsByteLength, Quadtree.QUAD_COUNT * Quadtree.QUAD_MASS_STRIDE)
    this.quadElementsLinkedList = new Uint32Array(this.quadBuffer, quadsByteLength + quadsMassByteLength)

    this.rebuild()
  }

  /**
   * Rebuilds the quadtree index from the existing element data.
   * Useful after modifying element positions directly in the `elements` array.
   */
  public rebuild(): void {
    this.quads.fill(0)
    this.quadsMass.fill(0)
    this.quadElementsLinkedList.fill(0)
    this.nextQuadId = 1
    this.nextElementsLinkedPtr = 1

    if (this.elementCount === 0) return

    this.minX = Infinity
    this.minY = Infinity
    this.maxX = -Infinity
    this.maxY = -Infinity
    for (let i = 0; i < this.elementCount; ++i) {
      const elementIndex = i * this.elementStride,
        x = this.elements[elementIndex + this.elementXOffset],
        y = this.elements[elementIndex + this.elementYOffset],
        r = this.elements[elementIndex + this.elementRadiusOffset]
      if (x - r < this.minX) this.minX = x - r
      if (y - r < this.minY) this.minY = y - r
      if (x + r > this.maxX) this.maxX = x + r
      if (y + r > this.maxY) this.maxY = y + r
    }
    if (!isFinite(this.minX)) {
      this.minX = 0
      this.minY = 0
      this.maxX = 0
      this.maxY = 0
    }
    if (this.minX === this.maxX) this.maxX++
    if (this.minY === this.maxY) this.maxY++

    // Insert each element into the quadtree's root quad
    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      this.insert(elementId, 0, 0, this.minX, this.minY, this.maxX, this.maxY)
    }

    // After building tree, compute element count and center of mass for each quad
    this.computeQuadElementCountAndMass(0)
  }

  /**
   * Find all elements that intersect the given query circle (or point).
   * @param x The x-coordinate of the query circle's center.
   * @param y The y-coordinate of the query circle's center.
   * @param radius [optional] The search radius. Defaults to 0 for point queries.
   * @returns An array of element IDs.
   */
  public find(x: number, y: number, radius = 0): number[] {
    const radiusSquared = radius * radius,
      results: number[] = [],
      rootDx = Math.max(this.minX - x, 0, x - this.maxX),
      rootDy = Math.max(this.minY - y, 0, y - this.maxY)

    if (rootDx * rootDx + rootDy * rootDy > radiusSquared) {
      return results
    }

    let quadId: number,
      minX: number,
      minY: number,
      maxX: number,
      maxY: number,
      quadPtr: number,
      elementPtr: number,
      elementLinkedListIndex: number,
      elementId: number,
      elementIndex: number,
      ex: number,
      ey: number,
      er: number,
      edx: number,
      edy: number,
      totalRadius: number,
      firstChildId: number,
      mx: number,
      my: number,
      dx: number,
      dy: number

    this.findQueue.length = 0 // clear out the queue
    this.findQueue.push(0, this.minX, this.minY, this.maxX, this.maxY)

    while (this.findQueue.length > 0) {
      maxY = this.findQueue.pop()!
      maxX = this.findQueue.pop()!
      minY = this.findQueue.pop()!
      minX = this.findQueue.pop()!
      quadId = this.findQueue.pop()!

      quadPtr = quadId * Quadtree.QUAD_STRIDE
      elementPtr = this.quads[quadPtr]

      while (elementPtr > 0) {
        elementLinkedListIndex = elementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE
        elementId = this.quadElementsLinkedList[elementLinkedListIndex]
        elementIndex = elementId * this.elementStride
        ex = this.elements[elementIndex + this.elementXOffset]
        ey = this.elements[elementIndex + this.elementYOffset]
        er = this.elements[elementIndex + this.elementRadiusOffset]
        edx = ex - x
        edy = ey - y
        totalRadius = er + radius

        if (edx * edx + edy * edy <= totalRadius * totalRadius) results.push(elementId)

        elementPtr = this.quadElementsLinkedList[elementLinkedListIndex + 1]
      }

      firstChildId = this.quads[quadPtr + 2]
      if (firstChildId > 0) {
        mx = (minX + maxX) / 2
        my = (minY + maxY) / 2

        // Check NW child
        dx = Math.max(minX - x, 0, x - mx)
        dy = Math.max(my - y, 0, y - maxY)
        if (dx * dx + dy * dy <= radiusSquared) this.findQueue.push(firstChildId, minX, my, mx, maxY)

        // Check NE child
        dx = Math.max(mx - x, 0, x - maxX)
        dy = Math.max(my - y, 0, y - maxY)
        if (dx * dx + dy * dy <= radiusSquared) this.findQueue.push(firstChildId + 1, mx, my, maxX, maxY)

        // Check SW child
        dx = Math.max(minX - x, 0, x - mx)
        dy = Math.max(minY - y, 0, y - my)
        if (dx * dx + dy * dy <= radiusSquared) this.findQueue.push(firstChildId + 2, minX, minY, mx, my)

        // Check SE child
        dx = Math.max(mx - x, 0, x - maxX)
        dy = Math.max(minY - y, 0, y - my)
        if (dx * dx + dy * dy <= radiusSquared) this.findQueue.push(firstChildId + 3, mx, minY, maxX, my)
      }
    }

    return results
  }

  /**
   * Finds all unique colliding pairs and invokes a callback for each pair.
   * @param cb callback function invoked for each colliding pair
   */
  public forEachCollision(
    cb: (id1: number, x1: number, y1: number, r1: number, id2: number, x2: number, y2: number, r2: number) => void,
    quadId: number = 0,
    parentElements: number[] = []
  ): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    let localElements: number[] | undefined

    // Get elements stored locally in current quad
    let elementPtr = this.quads[quadPtr]
    if (elementPtr > 0) {
      localElements = []
      while (elementPtr > 0) {
        const elementLinkedListIndex = elementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE
        localElements.push(this.quadElementsLinkedList[elementLinkedListIndex])
        elementPtr = this.quadElementsLinkedList[elementLinkedListIndex + 1]
      }
    }

    // Check for collisions between local elements and elements in parent quads
    if (parentElements.length > 0 && localElements !== undefined) {
      for (const localId of localElements) {
        for (const parentId of parentElements) {
          const id1 = localId,
            id2 = parentId,
            arrayIndex1 = id1 * this.elementStride,
            arrayIndex2 = id2 * this.elementStride,
            x1 = this.elements[arrayIndex1 + this.elementXOffset],
            y1 = this.elements[arrayIndex1 + this.elementYOffset],
            r1 = this.elements[arrayIndex1 + this.elementRadiusOffset],
            x2 = this.elements[arrayIndex2 + this.elementXOffset],
            y2 = this.elements[arrayIndex2 + this.elementYOffset],
            r2 = this.elements[arrayIndex2 + this.elementRadiusOffset],
            dx = x1 - x2,
            dy = y1 - y2,
            totalRadius = r1 + r2

          if (dx * dx + dy * dy <= totalRadius * totalRadius) cb(id1, x1, y1, r1, id2, x2, y2, r2)
        }
      }
    }

    // Check for collisions among the local elements
    if (localElements !== undefined) {
      for (let i = 0; i < localElements.length; i++) {
        for (let j = i + 1; j < localElements.length; j++) {
          const id1 = localElements[i],
            id2 = localElements[j],
            arrayIndex1 = id1 * this.elementStride,
            arrayIndex2 = id2 * this.elementStride,
            x1 = this.elements[arrayIndex1 + this.elementXOffset],
            y1 = this.elements[arrayIndex1 + this.elementYOffset],
            r1 = this.elements[arrayIndex1 + this.elementRadiusOffset],
            x2 = this.elements[arrayIndex2 + this.elementXOffset],
            y2 = this.elements[arrayIndex2 + this.elementYOffset],
            r2 = this.elements[arrayIndex2 + this.elementRadiusOffset],
            dx = x1 - x2,
            dy = y1 - y2,
            totalRadius = r1 + r2

          if (dx * dx + dy * dy <= totalRadius * totalRadius) cb(id1, x1, y1, r1, id2, x2, y2, r2)
        }
      }
    }

    // Recursively check child quads for collisions with this quad's parent and local elements
    const firstChildId = this.quads[quadPtr + 2]
    if (firstChildId > 0) {
      for (let i = 0; i < 4; i++) {
        this.forEachCollision(cb, firstChildId + i, localElements === undefined ? parentElements : parentElements.concat(localElements))
      }
    }
  }

  // /**
  //  * Compare each element to all other centers of mass, using a Barnes-Hut approximation
  //  * Close elements are treated as a single body. Distant elements are approximated by their center of mass.
  //  * @param cb callback function invoked for each element and body
  //  * @param theta approximation threshold. if quad_width/quad_distance > theta, compare the element to the quad's center of mass instead of its elements.
  //  */
  // public forEachBody(
  //   cb: (
  //     elementId: number,
  //     elementX: number,
  //     elementY: number,
  //     elementRadius: number,
  //     bodyX: number,
  //     bodyY: number,
  //     count: number,
  //     distance: number
  //   ) => void,
  //   theta: number = 0.9
  // ): void {}

  /**
   * Converts the quadtree into a nested object for inspection. This is expensive and intended for testing.
   * @returns A materialized object representing the root quad and its children.
   */
  public materialize(
    quadId: number = 0,
    minX: number = this.minX,
    minY: number = this.minY,
    maxX: number = this.maxX,
    maxY: number = this.maxY
  ): MaterializedQuad {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const quadMassPtr = quadId * Quadtree.QUAD_MASS_STRIDE

    const elements: { id: number; x: number; y: number; radius: number }[] = []
    let elementPtr = this.quads[quadPtr]
    while (elementPtr > 0) {
      const id = this.quadElementsLinkedList[elementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE]
      const index = id * this.elementStride
      elements.push({
        id,
        x: this.elements[index + this.elementXOffset],
        y: this.elements[index + this.elementYOffset],
        radius: this.elements[index + this.elementRadiusOffset]
      })
      elementPtr = this.quadElementsLinkedList[elementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE + 1]
    }

    const totalMass = this.quads[quadPtr + 1]
    const quad: MaterializedQuad = {
      id: quadId,
      minX,
      minY,
      maxX,
      maxY,
      totalMass,
      centerOfMassX: totalMass === 0 ? 0 : this.quadsMass[quadMassPtr] / totalMass,
      centerOfMassY: totalMass === 0 ? 0 : this.quadsMass[quadMassPtr + 1] / totalMass,
      elements
    }

    const firstChildId = this.quads[quadPtr + 2]
    if (firstChildId > 0) {
      const mx = (minX + maxX) / 2
      const my = (minY + maxY) / 2
      quad.children = {
        nw: this.materialize(firstChildId + 0, minX, my, mx, maxY),
        ne: this.materialize(firstChildId + 1, mx, my, maxX, maxY),
        sw: this.materialize(firstChildId + 2, minX, minY, mx, my),
        se: this.materialize(firstChildId + 3, mx, minY, maxX, my)
      }
    }
    return quad
  }

  private insert(elementId: number, quadId: number, depth: number, minX: number, minY: number, maxX: number, maxY: number): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const firstChildId = this.quads[quadPtr + 2]

    // check if quad is a branch (has children)
    if (firstChildId > 0) {
      const elementIndex = elementId * this.elementStride,
        x = this.elements[elementIndex + this.elementXOffset],
        y = this.elements[elementIndex + this.elementYOffset],
        r = this.elements[elementIndex + this.elementRadiusOffset],
        childQuad = this.getChildQuadForElement(x, y, r, minX, minY, maxX, maxY)

      if (childQuad !== -1) {
        const mx = (minX + maxX) / 2,
          my = (minY + maxY) / 2

        this.insert(
          elementId,
          firstChildId + childQuad,
          depth + 1,
          childQuad % 2 === 0 ? minX : mx,
          childQuad < 2 ? my : minY,
          childQuad % 2 === 0 ? mx : maxX,
          childQuad < 2 ? maxY : my
        )
        return
      }
    }

    // quad is a leaf or element doesn't fit into the child. insert element into this quad
    const firstElementPtr = this.quads[quadPtr],
      newElementPtr = this.nextElementsLinkedPtr++
    this.quads[quadPtr] = newElementPtr
    this.quadElementsLinkedList[newElementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE] = elementId
    this.quadElementsLinkedList[newElementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE + 1] = firstElementPtr
    this.quads[quadPtr + 1]++ // Increment LOCAL count

    if (firstChildId === 0 && depth < Quadtree.QUAD_MAX_DEPTH && this.quads[quadPtr + 1] > Quadtree.QUAD_MAX_CAPACITY) {
      this.subdivide(quadId, minX, minY, maxX, maxY, depth)
    }
  }

  private subdivide(quadId: number, minX: number, minY: number, maxX: number, maxY: number, depth: number): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE,
      firstChildId = this.nextQuadId

    this.quads[quadPtr + 2] = firstChildId // Point parent quad to first NW child
    this.nextQuadId += 4
    this.subdivisionHeadPtrs.fill(0)
    let elementPtr = this.quads[quadPtr]
    this.quads[quadPtr] = 0 // Detach parent's list
    this.quads[quadPtr + 1] = 0 // Reset parent's LOCAL count

    // Get new quad for each parent element
    while (elementPtr > 0) {
      const elementListPtr = elementPtr * Quadtree.QUAD_ELEMENTS_LINKED_LIST_STRIDE,
        elementId = this.quadElementsLinkedList[elementListPtr],
        nextPtr = this.quadElementsLinkedList[elementListPtr + 1],
        elementIndex = elementId * this.elementStride,
        x = this.elements[elementIndex + this.elementXOffset],
        y = this.elements[elementIndex + this.elementYOffset],
        r = this.elements[elementIndex + this.elementRadiusOffset],
        listIndex = this.getChildQuadForElement(x, y, r, minX, minY, maxX, maxY) + 1

      this.quadElementsLinkedList[elementListPtr + 1] = this.subdivisionHeadPtrs[listIndex]
      this.subdivisionHeadPtrs[listIndex] = elementPtr
      elementPtr = nextPtr
    }

    // Re-link partitioned lists and set their initial LOCAL counts
    for (let i = 0; i < 5; i++) {
      const id = i === 0 ? quadId : firstChildId + (i - 1)
      const ptr = id * Quadtree.QUAD_STRIDE
      this.quads[ptr] = this.subdivisionHeadPtrs[i]

      let localCount = 0
      let p = this.quads[ptr]
      while (p > 0) {
        localCount++
        p = this.quadElementsLinkedList[p * 2 + 1]
      }
      this.quads[ptr + 1] = localCount
    }

    // recursively subdivide each child quad in case they have also exceeded their max capacity
    const mx = (minX + maxX) / 2,
      my = (minY + maxY) / 2
    for (let i = 0; i < 4; i++) {
      const childId = firstChildId + i
      const childLocalCount = this.quads[childId * 3 + 1]
      if (childLocalCount > Quadtree.QUAD_MAX_CAPACITY && depth + 1 < Quadtree.QUAD_MAX_DEPTH) {
        const cMinX = i % 2 === 0 ? minX : mx,
          cMaxX = i % 2 === 0 ? mx : maxX
        const cMinY = i < 2 ? my : minY,
          cMaxY = i < 2 ? maxY : my
        this.subdivide(childId, cMinX, cMinY, cMaxX, cMaxY, depth + 1)
      }
    }
  }

  private getChildQuadForElement(
    ex: number,
    ey: number,
    er: number,
    qMinX: number,
    qMinY: number,
    qMaxX: number,
    qMaxY: number
  ): -1 | 0 | 1 | 2 | 3 {
    const mx = (qMinX + qMaxX) / 2,
      my = (qMinY + qMaxY) / 2,
      fitsTop = ey - er > my,
      fitsBottom = ey + er < my,
      fitsLeft = ex + er < mx,
      fitsRight = ex - er > mx

    if (fitsLeft) {
      if (fitsTop) return 0 // NW
      if (fitsBottom) return 2 // SW
    } else if (fitsRight) {
      if (fitsTop) return 1 // NE
      if (fitsBottom) return 3 // SE
    }

    return -1 // Overlaps child boundaries. Keep element in parent
  }

  private computeQuadElementCountAndMass(quadId: number): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const quadMassPtr = quadId * Quadtree.QUAD_MASS_STRIDE
    const firstChildId = this.quads[quadPtr + 2]

    if (firstChildId > 0) {
      let totalChildCount = 0
      for (let i = 0; i < 4; i++) {
        const childId = firstChildId + i
        this.computeQuadElementCountAndMass(childId)
        totalChildCount += this.quads[childId * 3 + 1] // Use STRIDE
        const childMassPtr = childId * Quadtree.QUAD_MASS_STRIDE
        this.quadsMass[quadMassPtr] += this.quadsMass[childMassPtr]
        this.quadsMass[quadMassPtr + 1] += this.quadsMass[childMassPtr + 1]
      }
      this.quads[quadPtr + 1] += totalChildCount // Add children's aggregate count to parent's local count
    }

    let elementPtr = this.quads[quadPtr]
    while (elementPtr > 0) {
      const elementId = this.quadElementsLinkedList[elementPtr * 2]
      const elementIndex = elementId * this.elementStride
      this.quadsMass[quadMassPtr] += this.elements[elementIndex + this.elementXOffset]
      this.quadsMass[quadMassPtr + 1] += this.elements[elementIndex + this.elementYOffset]
      elementPtr = this.quadElementsLinkedList[elementPtr * 2 + 1]
    }
  }
}

export type MaterializedQuad = {
  id: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  centerOfMassX?: number
  centerOfMassY?: number
  totalMass?: number
  elements: { id: number; x: number; y: number; radius: number }[]
  children?: { nw: MaterializedQuad; ne: MaterializedQuad; sw: MaterializedQuad; se: MaterializedQuad }
}
