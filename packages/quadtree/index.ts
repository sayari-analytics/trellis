export class Quadtree {
  // Constants
  private static readonly QUADS_STRIDE = 2
  private static readonly QUAD_ELEMENTS_STRIDE = 2
  private static readonly NULL_POINTER = 0xffffffff
  private static readonly BRANCH_POINTER = 0xfffffffe

  // Quadtree Properties
  minX: number = 0
  minY: number = 0
  maxX: number = 0
  maxY: number = 0
  maxCapacity: number
  maxDepth: number
  elementCount: number
  quadCount: number

  // Element Data
  private elements: Float32Array
  private elementStride: number
  private elementXOffset: number
  private elementYOffset: number
  private elementRadiusOffset: number

  // Tree Data Structures
  private quadsBuffer: ArrayBuffer
  private quadsCenterOfMassBuffer: ArrayBuffer
  private quadElementsBuffer: ArrayBuffer
  /**
   * Uint32Array<[quadElementPtr, aggregateMass]>
   */
  private quads: Uint32Array
  /**
   * Float32Array<[centerOfMassX, centerOfMassY]>
   */
  private quadsCenterOfMass: Float32Array
  /**
   * Uint32Array<[elementId, nextQuadElementPtr]>
   */
  private quadElements: Uint32Array
  private traversedElements: Uint8Array
  private childElementPtrs: Uint32Array
  private debug = false

  // Allocators
  private nextQuadElementPtr = 0

  /**
   * Create a pointerless region Quadtree from the given element circles
   * @param elements Float32Array containing each circle element. By default, each element is packed as [x, y, radius]
   * @param options { stride: number, xOffset: number, yOffset: number, radiusOffset: number, maxCapacity: number, maxDepth: number }
   * stride: Default 3, which assumes datum packing of [x, y, radius]
   * xOffset: Default 0, which assumes datum packing of [x, y, radius]
   * yOffset: Default 1, which assumes datum packing of [x, y, radius]
   * radiusOffset: Default 2, which assumes datum packing of [x, y, radius]
   * maxCapacity: Default 8
   * maxDepth: Default 7
   */
  constructor(elements: Float32Array, options?: Options) {
    this.elements = elements
    this.elementStride = options?.stride ?? 3
    this.elementXOffset = options?.xOffset ?? 0
    this.elementYOffset = options?.yOffset ?? 1
    this.elementRadiusOffset = options?.radiusOffset ?? 2
    this.maxCapacity = options?.maxCapacity ?? 8
    this.maxDepth = options?.maxDepth ?? 7
    this.elementCount = this.elements.length / this.elementStride
    this.quadCount = (4 ** (this.maxDepth + 1) - 1) / 3

    if (this.maxDepth > 16) throw new Error('maxDepth must be <= 16')

    if (this.elements.length % this.elementStride !== 0) {
      throw new Error(`Invalid elements length. Must be a multiple of stride (${this.elementStride}).`)
    }

    // Calculate buffer sizes
    const quadsBufferByteLength = this.quadCount * Quadtree.QUADS_STRIDE * Uint32Array.BYTES_PER_ELEMENT
    const quadsCenterOfMassBufferByteLength = this.quadCount * Quadtree.QUADS_STRIDE * Float32Array.BYTES_PER_ELEMENT
    const estimatedQuadElementCount = Math.ceil(this.elementCount * 1.1) // Estimate that each quad may be inserted into 1.1 quads on average
    const quadElementsBufferDefaultByteLength = estimatedQuadElementCount * Quadtree.QUAD_ELEMENTS_STRIDE * Uint32Array.BYTES_PER_ELEMENT

    // Create buffers and views
    this.quadsBuffer = new ArrayBuffer(quadsBufferByteLength)
    this.quadsCenterOfMassBuffer = new ArrayBuffer(quadsCenterOfMassBufferByteLength)
    this.quadElementsBuffer = this.createResizableBuffer(quadElementsBufferDefaultByteLength, quadElementsBufferDefaultByteLength * 4)
    this.quads = new Uint32Array(this.quadsBuffer)
    this.quadsCenterOfMass = new Float32Array(this.quadsCenterOfMassBuffer)
    this.quadElements = new Uint32Array(this.quadElementsBuffer)
    this.traversedElements = new Uint8Array(Math.ceil(this.elementCount / 8))
    this.childElementPtrs = new Uint32Array(this.maxCapacity)

    // Build initial tree
    this.rebuild()
  }

  /**
   * Rebuild the quadtree index from the existing element data after modifying element positions
   */
  public rebuild(): void {
    // Bulk remove all elements from all quads
    this.quads.fill(Quadtree.NULL_POINTER)
    this.quadsCenterOfMass.fill(NaN)
    this.quadElements.fill(Quadtree.NULL_POINTER)
    this.nextQuadElementPtr = 0

    // Calculate bounding box
    this.minX = Infinity
    this.maxX = -Infinity
    this.minY = Infinity
    this.maxY = -Infinity
    for (let i = 0; i < this.elementCount; ++i) {
      const elementIndex = i * this.elementStride
      const x = this.elements[elementIndex + this.elementXOffset]
      const y = this.elements[elementIndex + this.elementYOffset]
      const r = this.elements[elementIndex + this.elementRadiusOffset]
      if (x - r < this.minX) this.minX = x - r
      if (x + r > this.maxX) this.maxX = x + r
      if (y - r < this.minY) this.minY = y - r
      if (y + r > this.maxY) this.maxY = y + r
    }
    if (!isFinite(this.minX)) this.minX = this.minY = this.maxX = this.maxY = 0
    if (this.minX === this.maxX) this.maxX++
    if (this.minY === this.maxY) this.maxY++

    if (!this.debug) {
      this.insert()
      this.merge(0, 0)
    }
  }

  /**
   * Bulk insert elements into leaf quads at max depth
   *
   * The bottom up bulk insert/merge approach builds the quadtree in a single pass, bulk inserting elements into leaf quads and recursively merging them into parent quads
   * This is in contrast to traditional quadtrees, that use an incremental insert/split approach, inserting elements into parent quads and recursively splitting them into child quads
   *
   * This bulk insert requires a complete quadtree that allocates all quads when initialized or rebuilt
   * A quad's NW child quad id is `(4 * parentQuad) + 1`
   * A quad's parent quad id is `Math.floor((childQuad - 1) / 4)`
   * The total number of quads is `(4 ** (maxDepth + 1) - 1) / 3`
   *
   * After insert() and merge() complete:
   * - a branch quad has quadElementPtr = NULL and elementCount > 0
   * - a leaf quad either has quadElementPtr != NULL (it has elements) or has elementCount = 0 (it's an empty leaf)
   * - quads below leaf quads are implicitly deallocated
   */
  private insert() {
    const offset = (4 ** this.maxDepth - 1) / 3
    const leafQuadDimension = 2 ** this.maxDepth
    const cellWidth = (this.maxX - this.minX) / leafQuadDimension
    const cellHeight = (this.maxY - this.minY) / leafQuadDimension

    // Insert each element into the quadtree's root quad
    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementPtr = elementId * this.elementStride
      const x = this.elements[elementPtr + this.elementXOffset]
      const y = this.elements[elementPtr + this.elementYOffset]
      const r = this.elements[elementPtr + this.elementRadiusOffset]
      const r2 = r * r

      // Find all leaf quads at max depth overlapping the element's aabb
      const startRow = Math.floor((this.maxY - (y + r)) / cellHeight)
      const endRow = Math.floor((this.maxY - (y - r)) / cellHeight)
      const startCol = Math.floor((x - r - this.minX) / cellWidth)
      const endCol = Math.floor((x + r - this.minX) / cellWidth)

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const quadMinX = this.minX + col * cellWidth
          const quadMaxX = quadMinX + cellWidth
          const quadMaxY = this.maxY - row * cellHeight
          const quadMinY = quadMaxY - cellHeight

          const closestX = Math.max(quadMinX, Math.min(x, quadMaxX))
          const closestY = Math.max(quadMinY, Math.min(y, quadMaxY))
          const dx = x - closestX
          const dy = y - closestY

          if (dx * dx + dy * dy < r2) {
            // compute quadId via Morton Encoding
            // details of the approach are outlined in tests/zIndex.test.ts
            let zx = (col | (col << 8)) & 0x00ff00ff
            zx = (zx | (zx << 4)) & 0x0f0f0f0f
            zx = (zx | (zx << 2)) & 0x33333333
            zx = (zx | (zx << 1)) & 0x55555555

            let zy = (row | (row << 8)) & 0x00ff00ff
            zy = (zy | (zy << 4)) & 0x0f0f0f0f
            zy = (zy | (zy << 2)) & 0x33333333
            zy = (zy | (zy << 1)) & 0x55555555

            const quadId = offset + ((zy << 1) | zx)
            const quadPtr = quadId * Quadtree.QUADS_STRIDE
            const quadElementCurrentHead = this.quads[quadPtr]
            const quadElementNewHead = this.allocateQuadElement()

            // Insert element into overlapping leaf quad
            this.quadElements[quadElementNewHead] = elementId
            this.quadElements[quadElementNewHead + 1] = quadElementCurrentHead
            this.quads[quadPtr] = quadElementNewHead

            // If element center is within quad, update quad's center and total mass
            if (x >= quadMinX && x < quadMaxX && y >= quadMinY && y < quadMaxY) {
              if (this.quads[quadPtr + 1] === Quadtree.NULL_POINTER) {
                this.quadsCenterOfMass[quadPtr] = x
                this.quadsCenterOfMass[quadPtr + 1] = y
                this.quads[quadPtr + 1] = 1
              } else {
                this.quadsCenterOfMass[quadPtr] += x
                this.quadsCenterOfMass[quadPtr + 1] += y
                this.quads[quadPtr + 1]++
              }
            }
          }
        }
      }
    }
  }

  /**
   * Recursively merge leaf quads bottom-up
   * Redistribute child elements into parent elements if the parent has sufficient capacity
   */
  private merge(quadId: number, depth: number) {
    const nextDepth = depth + 1
    const quadPtr = quadId * Quadtree.QUADS_STRIDE
    const firstChildId = 4 * quadId + 1

    // Recursively merge quads
    if (nextDepth < this.maxDepth) {
      this.merge(firstChildId, nextDepth) // nw
      this.merge(firstChildId + 1, nextDepth) // ne
      this.merge(firstChildId + 2, nextDepth) // sw
      this.merge(firstChildId + 3, nextDepth) // se
    }

    // Collect elementPtrs from children
    this.childElementPtrs.fill(Quadtree.NULL_POINTER)
    this.traversedElements.fill(0)
    let nextChildElementPtr = 0

    childQuadLoop: for (let i = 0; i < 4; i++) {
      const childQuadPtr = (firstChildId + i) * Quadtree.QUADS_STRIDE
      let childQuadElementPtr = this.quads[childQuadPtr]

      // If any child quad is a branch, this quad becomes a branch
      if (childQuadElementPtr === Quadtree.BRANCH_POINTER) {
        nextChildElementPtr = this.maxCapacity + 1
        break childQuadLoop
      }

      // Collect unique child elements
      while (childQuadElementPtr !== Quadtree.NULL_POINTER) {
        const elementId = this.quadElements[childQuadElementPtr]
        const byteIndex = Math.floor(elementId / 8)
        const bitIndex = elementId % 8
        const mask = 1 << bitIndex

        if ((this.traversedElements[byteIndex] & mask) === 0) {
          if (nextChildElementPtr === this.maxCapacity) {
            nextChildElementPtr++
            break childQuadLoop
          }
          this.traversedElements[byteIndex] |= mask
          this.childElementPtrs[nextChildElementPtr++] = childQuadElementPtr
        }

        childQuadElementPtr = this.quadElements[childQuadElementPtr + 1]
      }
    }

    // Set quad elements
    if (nextChildElementPtr === 0) {
      // There are no child elements - this quad becomes an empty leaf with elements
      return
    } else if (nextChildElementPtr <= this.maxCapacity) {
      // Child elements fit into parent quad - this quad becomes a leaf with elements
      this.quads[quadPtr] = this.childElementPtrs[0] // Attach first element pointer to quad

      // Combine child element linked lists
      for (let i = 0; i < nextChildElementPtr; i++) {
        const elementPtr = this.childElementPtrs[i]
        const nextElementPtr = i < nextChildElementPtr - 1 ? this.childElementPtrs[i + 1] : Quadtree.NULL_POINTER
        this.quadElements[elementPtr + 1] = nextElementPtr
      }

      // Null out child quad element pointers
      this.quads[firstChildId * Quadtree.QUADS_STRIDE] = Quadtree.NULL_POINTER
      this.quads[(firstChildId + 1) * Quadtree.QUADS_STRIDE] = Quadtree.NULL_POINTER
      this.quads[(firstChildId + 2) * Quadtree.QUADS_STRIDE] = Quadtree.NULL_POINTER
      this.quads[(firstChildId + 3) * Quadtree.QUADS_STRIDE] = Quadtree.NULL_POINTER
    } else {
      // Child element count is greater than capacity or a child quad is a branch - this quad becomes a branch
      this.quads[quadPtr] = Quadtree.BRANCH_POINTER
    }

    // Set quad center and aggregate mass
    this.quads[quadPtr + 1] = 0
    this.quadsCenterOfMass[quadPtr] = 0
    this.quadsCenterOfMass[quadPtr + 1] = 0
    for (let i = 0; i < 4; i++) {
      const childQuadPtr = (firstChildId + i) * Quadtree.QUADS_STRIDE
      const childQuadCenterOfMassX = this.quadsCenterOfMass[childQuadPtr]
      const childQuadCenterOfMassY = this.quadsCenterOfMass[childQuadPtr + 1]
      const childQuadMass = this.quads[childQuadPtr + 1]
      if (!isNaN(childQuadCenterOfMassX)) this.quadsCenterOfMass[quadPtr] += childQuadCenterOfMassX
      if (!isNaN(childQuadCenterOfMassY)) this.quadsCenterOfMass[quadPtr + 1] += childQuadCenterOfMassY
      if (childQuadMass !== Quadtree.NULL_POINTER) this.quads[quadPtr + 1] += childQuadMass
    }
  }

  /**
   *
   */
  public getQuad(quadId: number) {
    const quadPtr = quadId * Quadtree.QUADS_STRIDE
    const mass = this.quads[quadPtr + 1]
    return mass === Quadtree.NULL_POINTER
      ? { centerOfMassX: undefined, quadsCenterOfMassY: undefined, aggregateMass: 0 }
      : {
          centerOfMassX: this.quadsCenterOfMass[quadPtr] / mass,
          centerOfMassY: this.quadsCenterOfMass[quadPtr + 1] / mass,
          aggregateMass: mass
        }
  }

  /**
   *
   */
  public *getQuadElements(quadId: number) {
    let quadElementPtr = this.quads[quadId * Quadtree.QUADS_STRIDE]

    if (quadElementPtr !== Quadtree.BRANCH_POINTER) {
      while (quadElementPtr !== Quadtree.NULL_POINTER) {
        yield this.quadElements[quadElementPtr]
        quadElementPtr = this.quadElements[quadElementPtr + 1]
      }
    }
  }

  /**
   * Visit each quad breadth first. Return true from the callback to continue recursing.
   */
  public forEachQuad(
    cb: (quadId: number, depth: number, minX: number, maxX: number, minY: number, maxY: number) => boolean | number,
    quadId = 0,
    depth = 0,
    minX = this.minX,
    maxX = this.maxX,
    minY = this.minY,
    maxY = this.maxY
  ): void {
    const recurse = cb(quadId, depth, minX, maxX, minY, maxY)
    const quadElementPtr = this.quads[quadId * Quadtree.QUADS_STRIDE]

    if (quadElementPtr === Quadtree.BRANCH_POINTER) {
      if (typeof recurse === 'number') {
        const nextDepth = depth + 1
        const mx = (minX + maxX) / 2
        const my = (minY + maxY) / 2
        if (recurse & 0x0001) this.forEachQuad(cb, 4 * quadId + 1, nextDepth, minX, mx, my, maxY)
        if ((recurse >> 1) & 0x0010) this.forEachQuad(cb, 4 * quadId + 2, nextDepth, mx, maxX, my, maxY)
        if ((recurse >> 2) & 0x0100) this.forEachQuad(cb, 4 * quadId + 3, nextDepth, minX, mx, minY, my)
        if ((recurse >> 3) & 0x1000) this.forEachQuad(cb, 4 * quadId + 4, nextDepth, mx, maxX, minY, my)
      } else if (recurse) {
        const nextDepth = depth + 1
        const mx = (minX + maxX) / 2
        const my = (minY + maxY) / 2
        this.forEachQuad(cb, 4 * quadId + 1, nextDepth, minX, mx, my, maxY)
        this.forEachQuad(cb, 4 * quadId + 2, nextDepth, mx, maxX, my, maxY)
        this.forEachQuad(cb, 4 * quadId + 3, nextDepth, minX, mx, minY, my)
        this.forEachQuad(cb, 4 * quadId + 4, nextDepth, mx, maxX, minY, my)
      }
    }
  }

  /**
   * Find all unique collision pairs
   * @param cb callback function invoked for each colliding pair
   */
  public forEachCollision(cb: (id1: number, id2: number) => void): void {
    this.traversedElements.fill(0)
    this.compareCollisions(cb, 0)
  }

  private compareCollisions(cb: (id1: number, id2: number) => void, quadId: number): void {
    const quadPtr = quadId * Quadtree.QUADS_STRIDE
    let quadElementAPtr = this.quads[quadPtr]

    if (quadElementAPtr === Quadtree.BRANCH_POINTER) {
      // quad is a branch - recurse to child quads
      this.compareCollisions(cb, 4 * quadId + 1)
      this.compareCollisions(cb, 4 * quadId + 2)
      this.compareCollisions(cb, 4 * quadId + 3)
      this.compareCollisions(cb, 4 * quadId + 4)
      return
    }

    // quad is a leaf - check elements for collisions
    while (quadElementAPtr !== Quadtree.NULL_POINTER) {
      const elementAId = this.quadElements[quadElementAPtr]
      const byteIndex = Math.floor(elementAId / 8)
      const bitIndex = elementAId % 8
      const mask = 1 << bitIndex

      if ((this.traversedElements[byteIndex] & mask) === 0) {
        this.traversedElements[byteIndex] |= mask

        // let quadElementBPtr = this.quadElements[quadElementAPtr + 1]
        let quadElementBPtr = this.quads[quadPtr]
        while (quadElementBPtr !== Quadtree.NULL_POINTER) {
          const elementBId = this.quadElements[quadElementBPtr]
          if (elementAId !== elementBId) {
            const elementAPtr = elementAId * this.elementStride
            const elementBPtr = elementBId * this.elementStride
            const dx = this.elements[elementAPtr + this.elementXOffset] - this.elements[elementBPtr + this.elementXOffset]
            const dy = this.elements[elementAPtr + this.elementYOffset] - this.elements[elementBPtr + this.elementYOffset]
            const r = this.elements[elementAPtr + this.elementRadiusOffset] + this.elements[elementBPtr + this.elementRadiusOffset]
            if (dx * dx + dy * dy < r * r) cb(elementAId, elementBId) // TODO - add initial aabb check?
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
  public forEachBody(cb: (elementId: number, x: number, y: number, mass: number, distance2: number) => void, theta: number = 0.9): void {
    const thetaSq = theta * theta

    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementIndex = elementId * this.elementStride
      const x = this.elements[elementIndex + this.elementXOffset]
      const y = this.elements[elementIndex + this.elementYOffset]

      this.compareBodies(cb, elementId, x, y, 0, this.minX, this.maxX, this.minY, this.maxY, thetaSq)
    }
  }

  private compareBodies(
    cb: (elementId: number, x: number, y: number, aggregateMass: number, distance2: number) => void,
    elementId: number,
    x: number,
    y: number,
    quadId: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    thetaSq: number
  ): void {
    const quadPtr = quadId * Quadtree.QUADS_STRIDE
    const aggregateMass = this.quads[quadPtr + 1]
    if (aggregateMass === Quadtree.NULL_POINTER) return
    let quadElementPtr = this.quads[quadPtr]

    if (quadElementPtr === Quadtree.BRANCH_POINTER) {
      const quadCenterOfMassX = this.quadsCenterOfMass[quadPtr] / aggregateMass
      const quadCenterOfMassY = this.quadsCenterOfMass[quadPtr + 1] / aggregateMass
      const distance2 = (x - quadCenterOfMassX) ** 2 + (y - quadCenterOfMassY) ** 2

      if ((maxX - minX) ** 2 < thetaSq * distance2) {
        // quad is a distant branch - approximate as a single body
        cb(elementId, quadCenterOfMassX, quadCenterOfMassY, aggregateMass, distance2)
      } else {
        // quad is a near branch - recurse to child quads
        const mx = (minX + maxX) / 2
        const my = (minY + maxY) / 2
        this.compareBodies(cb, elementId, x, y, 4 * quadId + 1, minX, mx, my, maxY, thetaSq)
        this.compareBodies(cb, elementId, x, y, 4 * quadId + 2, mx, maxX, my, maxY, thetaSq)
        this.compareBodies(cb, elementId, x, y, 4 * quadId + 3, minX, mx, minY, my, thetaSq)
        this.compareBodies(cb, elementId, x, y, 4 * quadId + 4, mx, maxX, minY, my, thetaSq)
      }
    } else {
      // quad is a leaf - compute aggregateMass comparisons for each quad element
      while (quadElementPtr !== Quadtree.NULL_POINTER) {
        const elementBId = this.quadElements[quadElementPtr]
        if (elementId !== elementBId) {
          const elementBPtr = elementBId * this.elementStride
          const bodyX = this.elements[elementBPtr + this.elementXOffset]
          const bodyY = this.elements[elementBPtr + this.elementYOffset]
          cb(elementId, bodyX, bodyY, 1, (x - bodyX) ** 2 + (y - bodyY) ** 2)
        }
        quadElementPtr = this.quadElements[quadElementPtr + 1]
      }
    }
  }

  // TODO - evaluate approximating leaf quads as a single body
  // private compareBodies(
  //   cb: (elementId: number, x: number, y: number, aggregateMass: number, distance2: number) => void,
  //   elementId: number,
  //   x: number,
  //   y: number,
  //   quadId: number,
  //   minX: number,
  //   maxX: number,
  //   minY: number,
  //   maxY: number,
  //   thetaSq: number
  // ): void {
  //   const quadPtr = quadId * Quadtree.QUADS_STRIDE
  //   const aggregateMass = this.quads[quadPtr + 1]
  //   if (aggregateMass === 0) return
  //   const quadCenterOfMassX = this.quadsCenterOfMass[quadPtr] / aggregateMass
  //   const quadCenterOfMassY = this.quadsCenterOfMass[quadPtr + 1] / aggregateMass
  //   const distance2 = (x - quadCenterOfMassX) ** 2 + (y - quadCenterOfMassY) ** 2

  //   if (this.quads[quadPtr] === Quadtree.BRANCH_POINTER) {
  //     if ((maxX - minX) ** 2 < thetaSq * distance2) {
  //       // quad is a distant branch - approximate as a single body
  //       cb(elementId, quadCenterOfMassX, quadCenterOfMassY, aggregateMass, distance2)
  //     } else {
  //       // quad is a near branch - recurse to child quads
  //       const mx = (minX + maxX) / 2
  //       const my = (minY + maxY) / 2
  //       this.compareBodies(cb, elementId, x, y, 4 * quadId + 1, minX, mx, my, maxY, thetaSq)
  //       this.compareBodies(cb, elementId, x, y, 4 * quadId + 2, mx, maxX, my, maxY, thetaSq)
  //       this.compareBodies(cb, elementId, x, y, 4 * quadId + 3, minX, mx, minY, my, thetaSq)
  //       this.compareBodies(cb, elementId, x, y, 4 * quadId + 4, mx, maxX, minY, my, thetaSq)
  //     }
  //   } else {
  //     // quad is a leaf - also approximate as a single body
  //     cb(elementId, quadCenterOfMassX, quadCenterOfMassY, aggregateMass, distance2)
  //   }
  // }

  /**
   * Allocate a new quadElement, resizing the buffer if necessary
   */
  private allocateQuadElement(): number {
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

  public _debug() {
    this.debug = true
    this.rebuild()
    const forEachQuad = (
      cb: (quadId: number, depth: number, minX: number, maxX: number, minY: number, maxY: number) => boolean | number,
      quadId = 0,
      depth = 0,
      minX = this.minX,
      maxX = this.maxX,
      minY = this.minY,
      maxY = this.maxY
    ) => {
      if (cb(quadId, depth, minX, maxX, minY, maxY) && depth < this.maxDepth) {
        forEachQuad(cb, 4 * quadId + 1, depth + 1, minX, (minX + maxX) / 2, (minY + maxY) / 2, maxY)
        forEachQuad(cb, 4 * quadId + 2, depth + 1, (minX + maxX) / 2, maxX, (minY + maxY) / 2, maxY)
        forEachQuad(cb, 4 * quadId + 3, depth + 1, minX, (minX + maxX) / 2, minY, (minY + maxY) / 2)
        forEachQuad(cb, 4 * quadId + 4, depth + 1, (minX + maxX) / 2, maxX, minY, (minY + maxY) / 2)
      }
    }

    return {
      insert: this.insert.bind(this),
      merge: this.merge.bind(this),
      forEachQuad: forEachQuad,
      quadElements: this.quadElements,
      quads: this.quads
    }
  }
}

export type Options = {
  stride?: number
  xOffset?: number
  yOffset?: number
  radiusOffset?: number
  maxCapacity?: number
  maxDepth?: number
}
