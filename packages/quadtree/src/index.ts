// Resizable ArrayBuffer (ES2024) typed locally so the package builds under older `lib` targets. The runtime
// feature-detects support before using these.
type ResizableArrayBuffer = ArrayBuffer & { readonly resizable: boolean; readonly maxByteLength: number; resize(byteLength: number): void }
type ResizableArrayBufferConstructor = { new (byteLength: number, options?: { maxByteLength?: number }): ResizableArrayBuffer }

export class Quadtree {
  private static readonly QUAD_MASSES_STRIDE = 3
  private static readonly QUAD_ELEMENTS_STRIDE = 2
  private static readonly NULL_POINTER = 0xffffffff
  private static readonly BRANCH_POINTER = 0xfffffffe

  minX: number = 0
  minY: number = 0
  maxX: number = 0
  maxY: number = 0
  maxCapacity: number
  maxDepth: number
  elementCount: number
  quadCount: number

  private elements: Float32Array
  private elementStride: number
  private elementXOffset: number
  private elementYOffset: number
  // Constant radius/mass avoids per-element reads.
  private radiusIsConstant: boolean
  private radiusConstant: number
  private radiusOffset: number
  private massIsConstant: boolean
  private massConstant: number
  private massOffset: number

  private quadsBuffer: ArrayBuffer
  private quadMassesBuffer: ArrayBuffer
  private quadElementsBuffer: ArrayBuffer
  /**
   * Uint32Array<[quadElementPtr]>
   */
  private quads: Uint32Array
  /**
   * Float32Array<[aggregateMass, centerOfMassX, centerOfMassY]>
   */
  private quadMasses: Float32Array
  /**
   * Uint32Array<[elementId, nextQuadElementPtr]>
   */
  private quadElements: Uint32Array
  private traversedElements: Uint8Array
  private childElementPtrs: Uint32Array
  private debug = false

  // Scratch state for the inlined many-body force kernel.
  private forceAccumulator: Float32Array = new Float32Array(0)
  private forceStrength = 0
  private forceThetaSq = 0
  private forceDistanceMin2 = 0
  private forceDistanceMaxSq = 0

  private nextQuadElementPtr = 0

  /**
   * Create a pointerless region Quadtree from the given element circles
   * @param elements Float32Array containing each element. By default, each element is packed as [x, y, radius]
   * @param options { stride, xOffset, yOffset, radius, mass, maxCapacity, maxDepth }
   * stride: Default 3, which assumes datum packing of [x, y, radius]
   * xOffset: Default 0
   * yOffset: Default 1
   * radius: Element radius. Either a constant `number` shared by all elements, or `{ offset }` to read it per
   *   element from the element array. Default `{ offset: 2 }`.
   * mass: Element mass (used by forEachBody / center of mass). Either a constant `number`, or `{ offset }` to read
   *   it per element. Default `1` (every element has unit mass).
   * maxCapacity: Default 8
   * maxDepth: Default adaptive — round(log4(elementCount)), clamped to [4, 16] (see adaptiveDepth)
   */
  /**
   * Choose a maxDepth that targets ~1 element per finest leaf cell, giving the bottom-up merge room to coarsen
   * without allocating a needlessly deep complete tree. 4^depth ≈ count  =>  depth ≈ log4(count).
   * Calibrated against the rebuild+collide+nbody sweep: 1k→5, 10k→7, 100k→8 (see perf/RESEARCH.md).
   * Clamped to [4, 16]; 16 is the hard limit imposed by 32-bit Morton encoding.
   */
  static adaptiveDepth(count: number): number {
    if (count <= 1) return 4
    return Math.min(16, Math.max(4, Math.round(Math.log2(count) / 2)))
  }

  constructor(elements: Float32Array, options?: Options) {
    this.elements = elements
    this.elementStride = options?.stride ?? 3
    this.elementXOffset = options?.xOffset ?? 0
    this.elementYOffset = options?.yOffset ?? 1

    const radius = options?.radius ?? { offset: 2 }
    this.radiusIsConstant = typeof radius === 'number'
    this.radiusConstant = typeof radius === 'number' ? radius : NaN
    this.radiusOffset = typeof radius === 'number' ? -1 : radius.offset

    const mass = options?.mass ?? 1
    this.massIsConstant = typeof mass === 'number'
    this.massConstant = typeof mass === 'number' ? mass : NaN
    this.massOffset = typeof mass === 'number' ? -1 : mass.offset

    this.maxCapacity = options?.maxCapacity ?? 8
    this.elementCount = this.elements.length / this.elementStride
    this.maxDepth = options?.maxDepth ?? Quadtree.adaptiveDepth(this.elementCount)
    this.quadCount = (4 ** (this.maxDepth + 1) - 1) / 3

    if (this.maxDepth > 16) throw new Error('maxDepth must be <= 16')

    if (this.elements.length % this.elementStride !== 0) {
      throw new Error(`Invalid elements length. Must be a multiple of stride (${this.elementStride}).`)
    }

    const quadsBufferByteLength = this.quadCount * Uint32Array.BYTES_PER_ELEMENT
    const quadMassesBufferByteLength = this.quadCount * Quadtree.QUAD_MASSES_STRIDE * Float32Array.BYTES_PER_ELEMENT
    const estimatedQuadElementCount = Math.ceil(this.elementCount * 1.1) // Estimate that each quad may be inserted into 1.1 quads on average
    const quadElementsBufferDefaultByteLength = estimatedQuadElementCount * Quadtree.QUAD_ELEMENTS_STRIDE * Uint32Array.BYTES_PER_ELEMENT

    this.quadsBuffer = new ArrayBuffer(quadsBufferByteLength)
    this.quadMassesBuffer = new ArrayBuffer(quadMassesBufferByteLength)
    this.quadElementsBuffer = this.createResizableBuffer(quadElementsBufferDefaultByteLength, quadElementsBufferDefaultByteLength * 4)
    this.quads = new Uint32Array(this.quadsBuffer)
    this.quadMasses = new Float32Array(this.quadMassesBuffer)
    this.quadElements = new Uint32Array(this.quadElementsBuffer)
    this.traversedElements = new Uint8Array(Math.ceil(this.elementCount / 8))
    this.childElementPtrs = new Uint32Array(this.maxCapacity)

    this.rebuild()
  }

  /**
   * Rebuild the quadtree index from the existing element data after modifying element positions
   */
  public rebuild(): void {
    this.quads.fill(Quadtree.NULL_POINTER)
    this.quadMasses.fill(NaN)
    this.quadElements.fill(Quadtree.NULL_POINTER)
    this.nextQuadElementPtr = 0

    this.minX = Infinity
    this.maxX = -Infinity
    this.minY = Infinity
    this.maxY = -Infinity
    for (let i = 0; i < this.elementCount; ++i) {
      const elementPtr = i * this.elementStride
      const x = this.elements[elementPtr + this.elementXOffset]
      const y = this.elements[elementPtr + this.elementYOffset]
      const r = this.radiusIsConstant ? this.radiusConstant : this.elements[elementPtr + this.radiusOffset]
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

    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementPtr = elementId * this.elementStride
      const x = this.elements[elementPtr + this.elementXOffset]
      const y = this.elements[elementPtr + this.elementYOffset]
      const r = this.radiusIsConstant ? this.radiusConstant : this.elements[elementPtr + this.radiusOffset]
      const r2 = r * r

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
            const quadElementCurrentHead = this.quads[quadId]
            const quadElementNewHead = this.allocateQuadElement()

            this.quadElements[quadElementNewHead] = elementId
            this.quadElements[quadElementNewHead + 1] = quadElementCurrentHead
            this.quads[quadId] = quadElementNewHead

            // Center of mass stores mass-weighted sums.
            if (x >= quadMinX && x < quadMaxX && y >= quadMinY && y < quadMaxY) {
              const m = this.massIsConstant ? this.massConstant : this.elements[elementPtr + this.massOffset]
              const quadMassesPtr = quadId * Quadtree.QUAD_MASSES_STRIDE
              if (isNaN(this.quadMasses[quadMassesPtr])) {
                this.quadMasses[quadMassesPtr] = m
                this.quadMasses[quadMassesPtr + 1] = m * x
                this.quadMasses[quadMassesPtr + 2] = m * y
              } else {
                this.quadMasses[quadMassesPtr] += m
                this.quadMasses[quadMassesPtr + 1] += m * x
                this.quadMasses[quadMassesPtr + 2] += m * y
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
    const firstChildId = 4 * quadId + 1

    if (nextDepth < this.maxDepth) {
      this.merge(firstChildId, nextDepth) // nw
      this.merge(firstChildId + 1, nextDepth) // ne
      this.merge(firstChildId + 2, nextDepth) // sw
      this.merge(firstChildId + 3, nextDepth) // se
    }

    this.childElementPtrs.fill(Quadtree.NULL_POINTER)
    this.traversedElements.fill(0)
    let nextChildElementPtr = 0

    childQuadLoop: for (let i = 0; i < 4; i++) {
      let childQuadElementPtr = this.quads[firstChildId + i]

      if (childQuadElementPtr === Quadtree.BRANCH_POINTER) {
        nextChildElementPtr = this.maxCapacity + 1
        break childQuadLoop
      }

      while (childQuadElementPtr !== Quadtree.NULL_POINTER) {
        const elementId = this.quadElements[childQuadElementPtr]
        const byteIndex = Math.floor(elementId / 8)
        const bitIndex = elementId % 8
        const mask = 1 << bitIndex

        if ((this.traversedElements[byteIndex] & mask) === 0) {
          this.traversedElements[byteIndex] |= mask
          if (nextChildElementPtr === this.maxCapacity) {
            nextChildElementPtr++
            break childQuadLoop
          }
          this.childElementPtrs[nextChildElementPtr++] = childQuadElementPtr
        }

        childQuadElementPtr = this.quadElements[childQuadElementPtr + 1]
      }
    }

    if (nextChildElementPtr === 0) {
      return
    } else if (nextChildElementPtr <= this.maxCapacity) {
      this.quads[quadId] = this.childElementPtrs[0]

      for (let i = 0; i < nextChildElementPtr; i++) {
        const elementPtr = this.childElementPtrs[i]
        const nextElementPtr = i < nextChildElementPtr - 1 ? this.childElementPtrs[i + 1] : Quadtree.NULL_POINTER
        this.quadElements[elementPtr + 1] = nextElementPtr
      }

      this.quads[firstChildId] = Quadtree.NULL_POINTER
      this.quads[firstChildId + 1] = Quadtree.NULL_POINTER
      this.quads[firstChildId + 2] = Quadtree.NULL_POINTER
      this.quads[firstChildId + 3] = Quadtree.NULL_POINTER
    } else {
      this.quads[quadId] = Quadtree.BRANCH_POINTER
    }

    const quadMassesPtr = quadId * Quadtree.QUAD_MASSES_STRIDE
    this.quadMasses[quadMassesPtr] = 0
    this.quadMasses[quadMassesPtr + 1] = 0
    this.quadMasses[quadMassesPtr + 2] = 0
    for (let i = 0; i < 4; i++) {
      const childQuadMassesPtr = (firstChildId + i) * Quadtree.QUAD_MASSES_STRIDE
      const childQuadMass = this.quadMasses[childQuadMassesPtr]
      const childQuadCenterOfMassX = this.quadMasses[childQuadMassesPtr + 1]
      const childQuadCenterOfMassY = this.quadMasses[childQuadMassesPtr + 2]
      if (!isNaN(childQuadMass)) this.quadMasses[quadMassesPtr] += childQuadMass
      if (!isNaN(childQuadCenterOfMassX)) this.quadMasses[quadMassesPtr + 1] += childQuadCenterOfMassX
      if (!isNaN(childQuadCenterOfMassY)) this.quadMasses[quadMassesPtr + 2] += childQuadCenterOfMassY
    }
  }

  /**
   * Visit each quad breadth first. Return true from the callback to continue recursing.
   */
  public forEachQuad(
    cb: (
      quadId: number,
      depth: number,
      minX: number,
      maxX: number,
      minY: number,
      maxY: number,
      mass: number,
      massX?: number,
      massY?: number
    ) => boolean | number,
    quadId = 0,
    depth = 0,
    minX = this.minX,
    maxX = this.maxX,
    minY = this.minY,
    maxY = this.maxY
  ): void {
    const quadElementPtr = this.quads[quadId]
    const quadMasesPtr = quadId * Quadtree.QUAD_MASSES_STRIDE
    const mass = this.quadMasses[quadMasesPtr]
    let recurse: boolean | number
    if (isNaN(mass)) {
      recurse = cb(quadId, depth, minX, maxX, minY, maxY, 0, undefined, undefined)
    } else {
      const centerOfMassX = this.quadMasses[quadMasesPtr + 1] / mass
      const centerOfMassY = this.quadMasses[quadMasesPtr + 2] / mass
      recurse = cb(quadId, depth, minX, maxX, minY, maxY, mass, centerOfMassX, centerOfMassY)
    }

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

  public *forEachQuadElement(quadId: number): Generator<number, void, void> {
    let quadElementPtr = this.quads[quadId]

    if (quadElementPtr !== Quadtree.BRANCH_POINTER) {
      while (quadElementPtr !== Quadtree.NULL_POINTER) {
        yield this.quadElements[quadElementPtr]
        quadElementPtr = this.quadElements[quadElementPtr + 1]
      }
    }
  }

  /**
   * Find all unique collision pairs.
   *
   * Leaf-local strategy: every element is inserted into every leaf its bounding circle overlaps, so any two
   * overlapping circles necessarily share at least one leaf. We therefore visit each leaf and compare its members
   * pairwise — no per-element descent from the root.
   *
   * Duplicate pairs (a pair can co-occur in several leaves when both circles straddle the same boundaries) are
   * collapsed by stateless canonicalization: a colliding pair is reported only from the single leaf that contains
   * the point P dividing the segment between the two centers in proportion to the radii,
   *   P = A + (B - A) * rA / (rA + rB).
   * P lies inside both circles whenever they collide, so the leaf containing P always lists both elements, and
   * leaves partition space so exactly one leaf contains P. No dedup buffer or bookkeeping required.
   *
   * @param cb callback invoked for each colliding pair. `dx`/`dy`/`distanceSquared` describe the separation as
   *   (position[id1] - position[id2]), so the caller need not recompute them: dx = x1 - x2, dy = y1 - y2,
   *   distanceSquared = dx*dx + dy*dy.
   */
  public forEachCollision(cb: CollisionCallback): void {
    this.collideQuad(cb, 0, this.minX, this.maxX, this.minY, this.maxY)
  }

  private collideQuad(cb: CollisionCallback, quadId: number, minX: number, maxX: number, minY: number, maxY: number): void {
    const quadElementPtr = this.quads[quadId]

    if (quadElementPtr === Quadtree.BRANCH_POINTER) {
      const mx = (minX + maxX) / 2
      const my = (minY + maxY) / 2
      const firstChildId = 4 * quadId + 1
      this.collideQuad(cb, firstChildId, minX, mx, my, maxY) // nw
      this.collideQuad(cb, firstChildId + 1, mx, maxX, my, maxY) // ne
      this.collideQuad(cb, firstChildId + 2, minX, mx, minY, my) // sw
      this.collideQuad(cb, firstChildId + 3, mx, maxX, minY, my) // se
      return
    }

    if (quadElementPtr === Quadtree.NULL_POINTER) return // empty leaf

    // ptrB starts after ptrA, so each unordered pair is visited once per leaf.
    let quadElementAPtr = quadElementPtr
    while (quadElementAPtr !== Quadtree.NULL_POINTER) {
      const elementAId = this.quadElements[quadElementAPtr]
      const elementAPtr = elementAId * this.elementStride
      const ax = this.elements[elementAPtr + this.elementXOffset]
      const ay = this.elements[elementAPtr + this.elementYOffset]
      const ar = this.radiusIsConstant ? this.radiusConstant : this.elements[elementAPtr + this.radiusOffset]

      let quadElementBPtr = this.quadElements[quadElementAPtr + 1]
      while (quadElementBPtr !== Quadtree.NULL_POINTER) {
        const elementBId = this.quadElements[quadElementBPtr]
        const elementBPtr = elementBId * this.elementStride
        const bx = this.elements[elementBPtr + this.elementXOffset]
        const by = this.elements[elementBPtr + this.elementYOffset]
        const br = this.radiusIsConstant ? this.radiusConstant : this.elements[elementBPtr + this.radiusOffset]

        const dx = ax - bx
        const dy = ay - by
        const distanceSquared = dx * dx + dy * dy
        const radiusSum = ar + br
        if (distanceSquared < radiusSum * radiusSum) {
          // Canonical point: inside both circles and exactly one leaf.
          const t = ar / radiusSum
          const px = ax + (bx - ax) * t
          const py = ay + (by - ay) * t
          if (px >= minX && px < maxX && py >= minY && py < maxY) {
            if (elementAId < elementBId) cb(elementAId, elementBId, dx, dy, distanceSquared)
            else cb(elementBId, elementAId, -dx, -dy, distanceSquared)
          }
        }

        quadElementBPtr = this.quadElements[quadElementBPtr + 1]
      }

      quadElementAPtr = this.quadElements[quadElementAPtr + 1]
    }
  }

  /**
   * Compare each element to nearby bodies and distant quad centers of mass.
   * @param cb callback function invoked for each element and body
   * @param theta [default 0.9] Barnes-Hut approximation threshold
   * @param distanceMax [default Infinity] maximum interaction distance. Bodies (and approximated quad centers of
   *   mass) farther than this from the element exert no force, capping the interaction range (cf. d3 distanceMax)
   */
  public forEachBody(
    cb: (elementId: number, x: number, y: number, mass: number, distance2: number) => void,
    theta: number = 0.9,
    distanceMax: number = Infinity
  ): void {
    const thetaSq = theta * theta
    const distanceMaxSq = distanceMax === Infinity ? Infinity : distanceMax * distanceMax

    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementPtr = elementId * this.elementStride
      const x = this.elements[elementPtr + this.elementXOffset]
      const y = this.elements[elementPtr + this.elementYOffset]

      this.compareBodies(cb, 0, this.minX, this.maxX, this.minY, this.maxY, thetaSq, distanceMaxSq, elementId, x, y)
    }
  }

  private compareBodies(
    cb: (elementId: number, x: number, y: number, aggregateMass: number, distance2: number) => void,
    quadId: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    thetaSq: number,
    distanceMaxSq: number,
    elementId: number,
    x: number,
    y: number
  ): void {
    const quadMassesPtr = quadId * Quadtree.QUAD_MASSES_STRIDE
    const aggregateMass = this.quadMasses[quadMassesPtr]
    if (isNaN(aggregateMass)) return
    let quadElementPtr = this.quads[quadId]

    if (quadElementPtr === Quadtree.BRANCH_POINTER) {
      const quadCenterOfMassX = this.quadMasses[quadMassesPtr + 1] / aggregateMass
      const quadCenterOfMassY = this.quadMasses[quadMassesPtr + 2] / aggregateMass
      const distance2 = (x - quadCenterOfMassX) ** 2 + (y - quadCenterOfMassY) ** 2

      if ((maxX - minX) ** 2 < thetaSq * distance2) {
        if (distance2 < distanceMaxSq) cb(elementId, quadCenterOfMassX, quadCenterOfMassY, aggregateMass, distance2)
      } else {
        const mx = (minX + maxX) / 2
        const my = (minY + maxY) / 2
        this.compareBodies(cb, 4 * quadId + 1, minX, mx, my, maxY, thetaSq, distanceMaxSq, elementId, x, y)
        this.compareBodies(cb, 4 * quadId + 2, mx, maxX, my, maxY, thetaSq, distanceMaxSq, elementId, x, y)
        this.compareBodies(cb, 4 * quadId + 3, minX, mx, minY, my, thetaSq, distanceMaxSq, elementId, x, y)
        this.compareBodies(cb, 4 * quadId + 4, mx, maxX, minY, my, thetaSq, distanceMaxSq, elementId, x, y)
      }
    } else {
      // Approximate distant non-home leaves; enumerate home leaves to skip self.
      const elementInside = x >= minX && x < maxX && y >= minY && y < maxY
      if (!elementInside) {
        const quadCenterOfMassX = this.quadMasses[quadMassesPtr + 1] / aggregateMass
        const quadCenterOfMassY = this.quadMasses[quadMassesPtr + 2] / aggregateMass
        const distance2 = (x - quadCenterOfMassX) ** 2 + (y - quadCenterOfMassY) ** 2

        if ((maxX - minX) ** 2 < thetaSq * distance2) {
          if (distance2 < distanceMaxSq) cb(elementId, quadCenterOfMassX, quadCenterOfMassY, aggregateMass, distance2)
          return
        }
      }

      // Skip replicated straddlers; their mass belongs to their home leaf.
      while (quadElementPtr !== Quadtree.NULL_POINTER) {
        const elementBId = this.quadElements[quadElementPtr]
        if (elementId !== elementBId) {
          const elementBPtr = elementBId * this.elementStride
          const bodyX = this.elements[elementBPtr + this.elementXOffset]
          const bodyY = this.elements[elementBPtr + this.elementYOffset]
          if (bodyX >= minX && bodyX < maxX && bodyY >= minY && bodyY < maxY) {
            const distance2 = (x - bodyX) ** 2 + (y - bodyY) ** 2
            if (distance2 < distanceMaxSq) {
              const bodyMass = this.massIsConstant ? this.massConstant : this.elements[elementBPtr + this.massOffset]
              cb(elementId, bodyX, bodyY, bodyMass, distance2)
            }
          }
        }
        quadElementPtr = this.quadElements[quadElementPtr + 1]
      }
    }
  }

  /**
   * Inlined many-body force accumulation into `forces`, stride 2 ([fx, fy] per element):
   *   force on element e from a body/quad b  =  strength * mass_b / dist²  along (b - e)
   * `theta` is the Barnes-Hut threshold; `distanceMin2` softens close interactions; `distanceMax` caps range.
   * Pass `strength = chargeStrength * alpha` (negative for repulsion); accumulates, so zero `forces` beforehand.
   */
  public applyManyBodyForce(
    forces: Float32Array,
    strength: number,
    theta: number = 0.9,
    distanceMin2: number = 1,
    distanceMax: number = Infinity
  ): void {
    this.forceAccumulator = forces
    this.forceStrength = strength
    this.forceThetaSq = theta * theta
    this.forceDistanceMin2 = distanceMin2
    this.forceDistanceMaxSq = distanceMax === Infinity ? Infinity : distanceMax * distanceMax

    for (let elementId = 0; elementId < this.elementCount; elementId++) {
      const elementPtr = elementId * this.elementStride
      const x = this.elements[elementPtr + this.elementXOffset]
      const y = this.elements[elementPtr + this.elementYOffset]
      this.accumulateManyBodyForce(0, this.minX, this.maxX, this.minY, this.maxY, elementId, x, y)
    }
  }

  private accumulateManyBodyForce(
    quadId: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    elementId: number,
    x: number,
    y: number
  ): void {
    const quadMassesPtr = quadId * Quadtree.QUAD_MASSES_STRIDE
    const aggregateMass = this.quadMasses[quadMassesPtr]
    if (isNaN(aggregateMass)) return
    const quadElementPtr = this.quads[quadId]

    if (quadElementPtr === Quadtree.BRANCH_POINTER) {
      const comX = this.quadMasses[quadMassesPtr + 1] / aggregateMass
      const comY = this.quadMasses[quadMassesPtr + 2] / aggregateMass
      const distance2 = (x - comX) ** 2 + (y - comY) ** 2
      if ((maxX - minX) ** 2 < this.forceThetaSq * distance2) {
        if (distance2 > 0 && distance2 < this.forceDistanceMaxSq) {
          const d2 = distance2 < this.forceDistanceMin2 ? Math.sqrt(this.forceDistanceMin2 * distance2) : distance2
          const w = (this.forceStrength * aggregateMass) / d2
          this.forceAccumulator[elementId * 2] += (comX - x) * w
          this.forceAccumulator[elementId * 2 + 1] += (comY - y) * w
        }
      } else {
        const mx = (minX + maxX) / 2
        const my = (minY + maxY) / 2
        this.accumulateManyBodyForce(4 * quadId + 1, minX, mx, my, maxY, elementId, x, y)
        this.accumulateManyBodyForce(4 * quadId + 2, mx, maxX, my, maxY, elementId, x, y)
        this.accumulateManyBodyForce(4 * quadId + 3, minX, mx, minY, my, elementId, x, y)
        this.accumulateManyBodyForce(4 * quadId + 4, mx, maxX, minY, my, elementId, x, y)
      }
    } else {
      const elementInside = x >= minX && x < maxX && y >= minY && y < maxY
      if (!elementInside) {
        const comX = this.quadMasses[quadMassesPtr + 1] / aggregateMass
        const comY = this.quadMasses[quadMassesPtr + 2] / aggregateMass
        const distance2 = (x - comX) ** 2 + (y - comY) ** 2
        if ((maxX - minX) ** 2 < this.forceThetaSq * distance2) {
          if (distance2 > 0 && distance2 < this.forceDistanceMaxSq) {
            const d2 = distance2 < this.forceDistanceMin2 ? Math.sqrt(this.forceDistanceMin2 * distance2) : distance2
            const w = (this.forceStrength * aggregateMass) / d2
            this.forceAccumulator[elementId * 2] += (comX - x) * w
            this.forceAccumulator[elementId * 2 + 1] += (comY - y) * w
          }
          return
        }
      }

      // Accumulate individual bodies, skipping replicated straddlers.
      let ptr = quadElementPtr
      while (ptr !== Quadtree.NULL_POINTER) {
        const elementBId = this.quadElements[ptr]
        if (elementId !== elementBId) {
          const elementBPtr = elementBId * this.elementStride
          const bodyX = this.elements[elementBPtr + this.elementXOffset]
          const bodyY = this.elements[elementBPtr + this.elementYOffset]
          if (bodyX >= minX && bodyX < maxX && bodyY >= minY && bodyY < maxY) {
            const distance2 = (x - bodyX) ** 2 + (y - bodyY) ** 2
            if (distance2 > 0 && distance2 < this.forceDistanceMaxSq) {
              const bodyMass = this.massIsConstant ? this.massConstant : this.elements[elementBPtr + this.massOffset]
              const d2 = distance2 < this.forceDistanceMin2 ? Math.sqrt(this.forceDistanceMin2 * distance2) : distance2
              const w = (this.forceStrength * bodyMass) / d2
              this.forceAccumulator[elementId * 2] += (bodyX - x) * w
              this.forceAccumulator[elementId * 2 + 1] += (bodyY - y) * w
            }
          }
        }
        ptr = this.quadElements[ptr + 1]
      }
    }
  }

  private allocateQuadElement(): number {
    const quadElementPtr = this.nextQuadElementPtr
    this.nextQuadElementPtr += Quadtree.QUAD_ELEMENTS_STRIDE

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
    const ArrayBufferCtor = ArrayBuffer as unknown as ResizableArrayBufferConstructor
    return typeof (ArrayBuffer.prototype as Partial<ResizableArrayBuffer>).resize === 'function'
      ? new ArrayBufferCtor(byteLength, { maxByteLength })
      : new ArrayBuffer(maxByteLength)
  }

  private resizeBuffer = (buffer: ArrayBuffer, byteLength: number): ArrayBuffer => {
    const resizable = buffer as ResizableArrayBuffer
    const ArrayBufferCtor = ArrayBuffer as unknown as ResizableArrayBufferConstructor
    if ('resizable' in buffer && resizable.resizable) {
      if (byteLength <= resizable.maxByteLength) {
        resizable.resize(byteLength)
        return buffer
      } else {
        const newBuffer = new ArrayBufferCtor(byteLength, { maxByteLength: byteLength * 1.5 })
        new Uint8Array(newBuffer).set(new Uint8Array(buffer).subarray(0, byteLength))
        return newBuffer
      }
    } else {
      const newBuffer = new ArrayBuffer(byteLength)
      new Uint8Array(newBuffer).set(new Uint8Array(buffer).subarray(0, byteLength))
      return newBuffer
    }
  }

  public _debug() {
    this.debug = true
    return {
      rebuild: this.rebuild.bind(this),
      insert: this.insert.bind(this),
      merge: this.merge.bind(this),
      // compact: this.compact.bind(this),
      quads: this.quads,
      quadMasses: this.quadMasses,
      quadElements: this.quadElements
    }
  }
}

/** A value that is either a constant shared by all elements, or read per-element from the element array at `offset`. */
export type Accessor = number | { offset: number }

/**
 * Invoked for each unique colliding pair. dx/dy/distanceSquared give the separation as (id1 - id2):
 * dx = x1 - x2, dy = y1 - y2, distanceSquared = dx*dx + dy*dy.
 */
export type CollisionCallback = (id1: number, id2: number, dx: number, dy: number, distanceSquared: number) => void

export type Options = {
  stride?: number
  xOffset?: number
  yOffset?: number
  radius?: Accessor
  mass?: Accessor
  maxCapacity?: number
  maxDepth?: number
}
