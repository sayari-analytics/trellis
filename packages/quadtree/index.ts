export class Quadtree {
  // Constants
  private static readonly QUAD_STRIDE = 5
  private static readonly QUAD_ELEMENTS_STRIDE = 2

  // Quadtree Properties
  minX: number = 0
  minY: number = 0
  maxX: number = 0
  maxY: number = 0
  maxCapacity: number
  maxDepth!: number

  // Element Data
  private elements: Float32Array
  private elementStride: number
  private elementXOffset: number
  private elementYOffset: number
  private elementRadiusOffset: number
  private elementCount: number

  // Tree Data Structures
  private quadBuffer: ArrayBuffer
  private quadElementsBuffer: ArrayBuffer
  /**
   * Uint32Array<[quadElementPtr, firstChildQuadId, _centerOfMassX, _centerOfMassY, aggregateMass]>
   */
  private quads: Uint32Array
  /**
   * Uint32Array<[_quadElementPtr, _firstChildQuadId, centerOfMassX, centerOfMassY, _aggregateMass]>
   */
  private quadsCenterOfMass: Float32Array
  /**
   * Uint32Array<[elementId, nextQuadElementPtr]>
   */
  private quadElements: Uint32Array

  // Allocators
  private nextQuadId = 1
  private nextQuadElementPtr = 1
  private deallocatedQuadElementHeadPtr = 0 // quadElements free list head

  /**
   * Create a pointerless region Quadtree from the given element circles
   * @param elements Float32Array containing each circle element. By default, each element is packed as [x, y, radius]
   * @param stride Default 3, which assumes datum packing of [x, y, radius]
   * @param xOffset Default 0, which assumes datum packing of [x, y, radius]
   * @param yOffset Default 1, which assumes datum packing of [x, y, radius]
   * @param radiusOffset Default 2, which assumes datum packing of [x, y, radius]
   * @param maxCapacity Default 8
   * @param maxDepth Default estimated as Math.ceil(Math.log2(bbox side / average radius))
   */
  constructor(elements: Float32Array, stride = 3, xOffset = 0, yOffset = 1, radiusOffset = 2, maxCapacity = 8, maxDepth = 7) {
    this.elements = elements
    this.elementStride = stride
    this.elementXOffset = xOffset
    this.elementYOffset = yOffset
    this.elementRadiusOffset = radiusOffset
    this.maxCapacity = maxCapacity
    this.maxDepth = maxDepth
    this.elementCount = this.elements.length / this.elementStride

    if (this.elements.length % this.elementStride !== 0) {
      throw new Error(`Invalid elements length. Must be a multiple of stride (${this.elementStride}).`)
    }

    // Calculate buffer sizes
    const estimatedQuadCount = Math.ceil(this.elementCount / this.maxCapacity / 2)
    const quadBufferDefaultByteLength = estimatedQuadCount * Quadtree.QUAD_STRIDE * Uint32Array.BYTES_PER_ELEMENT
    const estimatedQuadElementCount = Math.ceil(this.elementCount * 1.1) // Estimate that each quad may be inserted into 1.1 quads on average
    const quadElementsBufferDefaultByteLength = estimatedQuadElementCount * Quadtree.QUAD_ELEMENTS_STRIDE * Uint32Array.BYTES_PER_ELEMENT

    // Create buffers and views
    this.quadBuffer = this.createResizableBuffer(quadBufferDefaultByteLength, quadBufferDefaultByteLength * 8)
    this.quadElementsBuffer = this.createResizableBuffer(quadElementsBufferDefaultByteLength, quadElementsBufferDefaultByteLength * 8)
    this.quads = new Uint32Array(this.quadBuffer)
    this.quadsCenterOfMass = new Float32Array(this.quadBuffer)
    this.quadElements = new Uint32Array(this.quadElementsBuffer)

    // Build initial tree
    this.rebuild()
  }

  /**
   * Rebuild the quadtree index from the existing element data after modifying element positions
   */
  public rebuild(): void {
    // Bulk remove all elements from all quads
    this.quads.fill(0)
    this.quadElements.fill(0)
    this.nextQuadId = 1
    this.nextQuadElementPtr = 1
    this.deallocatedQuadElementHeadPtr = 0

    // Calculate bounding box
    this.minX = Infinity
    this.minY = Infinity
    this.maxX = -Infinity
    this.maxY = -Infinity
    for (let i = 0; i < this.elementCount; ++i) {
      const elementIndex = i * this.elementStride
      const x = this.elements[elementIndex + this.elementXOffset]
      const y = this.elements[elementIndex + this.elementYOffset]
      const r = this.elements[elementIndex + this.elementRadiusOffset]
      if (x - r < this.minX) this.minX = x - r
      if (y - r < this.minY) this.minY = y - r
      if (x + r > this.maxX) this.maxX = x + r
      if (y + r > this.maxY) this.maxY = y + r
    }
    if (!isFinite(this.minX)) this.minX = this.minY = this.maxX = this.maxY = 0
    if (this.minX === this.maxX) this.maxX++
    if (this.minY === this.maxY) this.maxY++

    // Insert each element into the quadtree's root quad
    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementIndex = elementId * this.elementStride
      const x = this.elements[elementIndex + this.elementXOffset]
      const y = this.elements[elementIndex + this.elementYOffset]
      const r2 = this.elements[elementIndex + this.elementRadiusOffset] ** 2
      this.insert(elementId, x, y, r2, 0, 0, this.minX, this.minY, this.maxX, this.maxY)
    }
  }

  /**
   * Visit each quad
   */
  public forEachQuad(cb: (quadId: number) => void, quadId: number = 0): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const firstChildId = this.quads[quadPtr + 1]
    cb(quadId)

    if (firstChildId > 0) {
      // If quad is a branch - recurse to child nodes
      this.forEachQuad(cb, firstChildId)
      this.forEachQuad(cb, firstChildId + 1)
      this.forEachQuad(cb, firstChildId + 2)
      this.forEachQuad(cb, firstChildId + 3)
      return
    }
  }

  /**
   * Find all unique collision pairs
   * @param cb callback function invoked for each colliding pair
   */
  public forEachCollision(cb: (id1: number, id2: number) => void): void {
    this.compareCollisions(cb, 0, new Uint8Array(Math.ceil(this.elementCount / 8)))
  }

  private compareCollisions(cb: (id1: number, id2: number) => void, quadId: number, traversed: Uint8Array): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const firstChildId = this.quads[quadPtr + 1]

    if (firstChildId > 0) {
      // If quad is a branch - recurse to child nodes
      this.compareCollisions(cb, firstChildId, traversed)
      this.compareCollisions(cb, firstChildId + 1, traversed)
      this.compareCollisions(cb, firstChildId + 2, traversed)
      this.compareCollisions(cb, firstChildId + 3, traversed)
      return
    }

    // If quad is a leaf - check all quad elements for collisions
    let quadElementAPtr = this.quads[quadPtr]
    while (quadElementAPtr > 0) {
      const elementAId = this.quadElements[quadElementAPtr]
      const byteIndexA = Math.floor(elementAId / 8)
      const bitIndexA = elementAId % 8
      const maskA = 1 << bitIndexA

      if ((traversed[byteIndexA] & maskA) === 0) {
        traversed[byteIndexA] |= maskA

        let quadElementBPtr = quadElementAPtr
        while (quadElementBPtr > 0) {
          const elementBId = this.quadElements[quadElementBPtr]
          if (elementAId !== elementBId) {
            const elementAPtr = elementAId * this.elementStride
            const elementBPtr = elementBId * this.elementStride
            const dx = this.elements[elementAPtr + this.elementXOffset] - this.elements[elementBPtr + this.elementXOffset]
            const dy = this.elements[elementAPtr + this.elementYOffset] - this.elements[elementBPtr + this.elementYOffset]
            const r = this.elements[elementAPtr + this.elementRadiusOffset] + this.elements[elementBPtr + this.elementRadiusOffset]
            if (dx * dx + dy * dy <= r * r) {
              cb(elementAId, elementBId)
            }
          }
          quadElementBPtr = this.quadElements[quadElementBPtr + 1]
        }
      }

      quadElementAPtr = this.quadElements[quadElementAPtr + 1]
    }
  }

  /**
   * Compare each element to all other centers of mass, using a Barnes-Hut approximation
   * Elements in nearby quads are treated as separate bodies. Elements in distant quads are approximated by the quad's center of mass.
   * The theta approximation threshold defines which quads are close vs. distant
   * @param cb callback function invoked for each element and body
   * @param theta [default 0.9] approximation threshold. if quad_width/quad_distance < theta, recursively compare the element to the quad's childrens' center of mass
   */
  public forEachBody(
    cb: (elementId: number, bodyX: number, bodyY: number, mass: number, distanceSq: number) => void,
    theta: number = 0.9
  ): void {
    const thetaSq = theta * theta

    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementIndex = elementId * this.elementStride
      const x = this.elements[elementIndex + this.elementXOffset]
      const y = this.elements[elementIndex + this.elementYOffset]

      this.compareBodies(elementId, x, y, 0, this.minX, this.minY, this.maxX, this.maxY, cb, thetaSq)
    }
  }

  private compareBodies(
    elementId: number,
    x: number,
    y: number,
    quadId: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    cb: (elementId: number, bodyX: number, bodyY: number, mass: number, distanceSq: number) => void,
    thetaSq: number
  ): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const mass = this.quads[quadPtr + 4]
    if (mass === 0) return

    const quadCenterOfMassX = this.quadsCenterOfMass[quadPtr + 2] / mass
    const quadCenterOfMassY = this.quadsCenterOfMass[quadPtr + 3] / mass
    const dx = x - quadCenterOfMassX
    const dy = y - quadCenterOfMassY
    const distanceSq = dx * dx + dy * dy
    const width = maxX - minX
    const firstChildId = this.quads[quadPtr + 1]

    if (firstChildId === 0) {
      // leaf quad, compute mass comparisons for each quad element
      let quadElementPtr = this.quads[quadPtr]
      while (quadElementPtr > 0) {
        const elementBId = this.quadElements[quadElementPtr]

        if (elementId !== elementBId) {
          const elementBPtr = elementBId * this.elementStride
          const bodyX = this.elements[elementBPtr + this.elementXOffset]
          const bodyY = this.elements[elementBPtr + this.elementYOffset]
          const distanceSq = (x - bodyX) ** 2 + (y - bodyY) ** 2

          cb(elementId, bodyX, bodyY, 1, distanceSq)
        }
        quadElementPtr = this.quadElements[quadElementPtr + 1]
      }
      return
    }

    if (width * width < thetaSq * distanceSq) {
      // branch quad is sufficiently distant to approximate as a single body
      return cb(elementId, quadCenterOfMassX, quadCenterOfMassY, mass, distanceSq)
    }

    // branch quad is sufficiently near, recurse to child quads
    const mx = (minX + maxX) / 2
    const my = (minY + maxY) / 2
    this.compareBodies(elementId, x, y, firstChildId, minX, my, mx, maxY, cb, thetaSq)
    this.compareBodies(elementId, x, y, firstChildId + 1, mx, my, maxX, maxY, cb, thetaSq)
    this.compareBodies(elementId, x, y, firstChildId + 2, minX, minY, mx, my, cb, thetaSq)
    this.compareBodies(elementId, x, y, firstChildId + 3, mx, minY, maxX, my, cb, thetaSq)
  }

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

    const elements: { id: number; x: number; y: number; radius: number }[] = []
    let quadElementPtr = this.quads[quadPtr]
    while (quadElementPtr > 0) {
      const elementId = this.quadElements[quadElementPtr]
      const elementIndex = elementId * this.elementStride
      elements.push({
        id: elementId,
        x: this.elements[elementIndex + this.elementXOffset],
        y: this.elements[elementIndex + this.elementYOffset],
        radius: this.elements[elementIndex + this.elementRadiusOffset]
      })
      quadElementPtr = this.quadElements[quadElementPtr + 1]
    }

    const mass = this.quads[quadPtr + 4] ?? 0
    const quad: MaterializedQuad = {
      id: quadId,
      minX,
      minY,
      maxX,
      maxY,
      centerOfMassX: mass > 0 ? this.quadsCenterOfMass[quadPtr + 2] / mass : undefined,
      centerOfMassY: mass > 0 ? this.quadsCenterOfMass[quadPtr + 3] / mass : undefined,
      aggregateMass: mass,
      elements
    }

    const firstChildId = this.quads[quadPtr + 1]
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

  private insert(
    elementId: number,
    x: number,
    y: number,
    r2: number,
    quadId: number,
    depth: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const firstChildId = this.quads[quadPtr + 1]

    // Update quad's center and aggregate mass if element's center point is within quad bounds
    this.quadsCenterOfMass[quadPtr + 2] += x
    this.quadsCenterOfMass[quadPtr + 3] += y
    this.quads[quadPtr + 4]++

    if (firstChildId > 0) {
      // Quad is a branch (has child quads) - insert into overlapping quads
      const mx = (minX + maxX) / 2
      const my = (minY + maxY) / 2

      // Insert element into all overlapping child quads
      const westDistanceSquared = (x - Math.max(minX, Math.min(x, mx))) ** 2
      const eastDistanceSquared = (x - Math.max(mx, Math.min(x, maxX))) ** 2
      const northDistanceSquared = (y - Math.max(my, Math.min(y, maxY))) ** 2
      const southDistanceSquared = (y - Math.max(minY, Math.min(y, my))) ** 2
      if (westDistanceSquared + northDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId, depth + 1, minX, my, mx, maxY) // NW
      if (eastDistanceSquared + northDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId + 1, depth + 1, mx, my, maxX, maxY) // NE
      if (westDistanceSquared + southDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId + 2, depth + 1, minX, minY, mx, my) // SW
      if (eastDistanceSquared + southDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId + 3, depth + 1, mx, minY, maxX, my) // SE
      return
    }

    // Quad is a leaf (does not have child quads) - append element to quad's linked list
    const currentHeadPtr = this.quads[quadPtr]
    const newHeadPtr = this.allocateQuadElement()
    this.quads[quadPtr] = newHeadPtr
    this.quadElements[newHeadPtr] = elementId
    this.quadElements[newHeadPtr + 1] = currentHeadPtr

    // Split quad if over capacity and under max depth
    if (depth < this.maxDepth) {
      let localElementCount = 0
      let nodePtr = newHeadPtr
      while (nodePtr > 0) {
        localElementCount++
        nodePtr = this.quadElements[nodePtr + 1]
      }

      if (localElementCount > this.maxCapacity) {
        this.subdivide(quadId, depth, minX, minY, maxX, maxY)
      }
    }
  }

  private subdivide(quadId: number, depth: number, minX: number, minY: number, maxX: number, maxY: number): void {
    const quadPtr = quadId * Quadtree.QUAD_STRIDE
    const firstChildId = this.allocateQuadBlock()
    let quadElementPtr = this.quads[quadPtr]
    this.quads[quadPtr + 1] = firstChildId // Point parent quad to first NW child
    this.quads[quadPtr] = 0 // Detach parent quad's element list
    const mx = (minX + maxX) / 2
    const my = (minY + maxY) / 2
    const nextDepth = depth + 1

    // Detatch parent quad elements and reattach to overlapping child quads' element lists
    while (quadElementPtr > 0) {
      const elementId = this.quadElements[quadElementPtr]
      const nextPtr = this.quadElements[quadElementPtr + 1]
      const elementIndex = elementId * this.elementStride
      const x = this.elements[elementIndex + this.elementXOffset]
      const y = this.elements[elementIndex + this.elementYOffset]
      const r2 = this.elements[elementIndex + this.elementRadiusOffset] ** 2

      // attach element to overlapping child quads
      const westDistanceSquared = (x - Math.max(minX, Math.min(x, mx))) ** 2
      const eastDistanceSquared = (x - Math.max(mx, Math.min(x, maxX))) ** 2
      const northDistanceSquared = (y - Math.max(my, Math.min(y, maxY))) ** 2
      const southDistanceSquared = (y - Math.max(minY, Math.min(y, my))) ** 2
      if (westDistanceSquared + northDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId, nextDepth, minX, my, mx, maxY) // NW
      if (eastDistanceSquared + northDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId + 1, nextDepth, mx, my, maxX, maxY) // NE
      if (westDistanceSquared + southDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId + 2, nextDepth, minX, minY, mx, my) // SW
      if (eastDistanceSquared + southDistanceSquared < r2) this.insert(elementId, x, y, r2, firstChildId + 3, nextDepth, mx, minY, maxX, my) // SE

      // Deallocate parent quad element and repeat
      this.deallocateQuadElement(quadElementPtr)
      quadElementPtr = nextPtr
    }
  }

  /**
   * Allocate a contiguous block of new 4 quads, resizing the buffer if necessary
   * @returns The ID of the first quad in the block (the NW child)
   */
  private allocateQuadBlock(): number {
    // Allocate a new quad
    const quadId = this.nextQuadId
    this.nextQuadId += 4

    // Resize buffer if there's not space for a new quad
    const nextQuadPtr = this.nextQuadId * Quadtree.QUAD_STRIDE
    if (nextQuadPtr > this.quads.length) {
      const buffer = this.resizeBuffer(
        this.quadBuffer,
        Math.max(this.quadBuffer.byteLength, nextQuadPtr * Uint32Array.BYTES_PER_ELEMENT) * 2
      )
      if (buffer !== this.quadBuffer) {
        this.quadBuffer = buffer
        this.quads = new Uint32Array(this.quadBuffer)
        this.quadsCenterOfMass = new Float32Array(this.quadBuffer)
      }
    }

    return quadId
  }

  /**
   * Allocate a new quadElement, resizing the buffer if necessary
   * @returns The quadElement pointer, used like this.quadElements[elementPtr]
   */
  private allocateQuadElement(): number {
    if (this.deallocatedQuadElementHeadPtr !== 0) {
      // Re-allocate deallocated quad element from the free-list
      const quadElementPtr = this.deallocatedQuadElementHeadPtr
      this.deallocatedQuadElementHeadPtr = this.quadElements[quadElementPtr + 1]
      return quadElementPtr
    }

    // Allocate new quadElement
    const quadElementPtr = this.nextQuadElementPtr
    this.nextQuadElementPtr += Quadtree.QUAD_ELEMENTS_STRIDE

    // Resize buffer if there's not space for a new quadElement
    if (this.nextQuadElementPtr > this.quadElements.length) {
      const buffer = this.resizeBuffer(this.quadElementsBuffer, this.quadElementsBuffer.byteLength * 2)
      if (buffer !== this.quadElementsBuffer) {
        this.quadElementsBuffer = buffer
        this.quadElements = new Uint32Array(this.quadElementsBuffer)
      }
    }

    return quadElementPtr
  }

  /**
   * Deallocate a quad element from the quadElement free list
   * Future quad element allocations will reuse deallocated quad elements
   */
  private deallocateQuadElement(quadElementPtr: number): void {
    this.quadElements[quadElementPtr + 1] = this.deallocatedQuadElementHeadPtr
    this.deallocatedQuadElementHeadPtr = quadElementPtr
  }

  private createResizableBuffer = (byteLength: number, maxByteLength: number): ArrayBuffer => {
    return typeof ArrayBuffer.prototype.resize === 'function'
      ? new ArrayBuffer(byteLength, { maxByteLength })
      : new ArrayBuffer(maxByteLength)
  }

  private resizeBuffer = (buffer: ArrayBuffer, byteLength: number): ArrayBuffer => {
    if ('resizable' in buffer && buffer.resizable) {
      if (byteLength <= buffer.maxByteLength) {
        // Buffer can be resized to byteLength - return resized buffer
        buffer.resize(byteLength)
        return buffer
      } else {
        // Buffer is too small - return new buffer
        const newBuffer = new ArrayBuffer(byteLength, { maxByteLength: byteLength * 1.5 })
        new Uint8Array(newBuffer).set(new Uint8Array(buffer).subarray(0, byteLength))
        return newBuffer
      }
    } else {
      // Buffer cannot be resized - return new buffer
      const newBuffer = new ArrayBuffer(byteLength)
      new Uint8Array(newBuffer).set(new Uint8Array(buffer).subarray(0, byteLength))
      return newBuffer
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
  aggregateMass: number
  elements: { id: number; x: number; y: number; radius: number }[]
  children?: { nw: MaterializedQuad; ne: MaterializedQuad; sw: MaterializedQuad; se: MaterializedQuad }
}
