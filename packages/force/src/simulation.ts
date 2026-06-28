import { Quadtree } from '@sayari/trellis-quadtree'

export type SimulationOptions = {
  velocityDecay?: number
  alphaMin?: number
  alphaDecay?: number
  alphaTarget?: number
  chargeStrength?: number
  theta?: number
  distanceMin2?: number
  distanceMax?: number
  linkDistance?: number
  linkIterations?: number
  collideStrength?: number
  centerX?: number
  centerY?: number
  centerStrength?: number
  gravityStrength?: number
  collidePadding?: number
}

export type ForceGraphViews = {
  nodePositions: Float32Array
  nodeRadii: Float32Array
  edgeEndpoints: Uint32Array
  nodeCount: number
  edgeCount: number
  velocities?: Float32Array
  fixed?: Uint8Array
}
export type SimulationConfig = ForceGraphViews & SimulationOptions

/**
 * Deterministic, Float32 force simulation over Trellis' GraphState columns.
 *
 * Node positions and edge endpoints are the same slot-indexed typed arrays the WebGL renderer consumes. The
 * simulation owns only working arrays (velocity, fixed mask, quadtree scratch), so a main-thread run updates
 * renderer memory directly and a worker run can do the same when these views are backed by SharedArrayBuffer.
 *
 * Determinism: positions for unset nodes come from a phyllotaxis spiral, coincident points are separated with a
 * seeded LCG, and every loop iterates in a fixed order — so the same input buffer always produces the same
 * output (within one JS engine; transcendental precision is implementation-defined across engines).
 */
export class Simulation {
  private static readonly POSITION_STRIDE = 2
  private static readonly TREE_STRIDE = 3
  private static readonly EDGE_STRIDE = 2
  private static readonly X = 0
  private static readonly Y = 1
  private static readonly RADIUS = 2
  private static readonly FIXED_X = 1
  private static readonly FIXED_Y = 2
  private static readonly LCG_A = 1664525
  private static readonly LCG_C = 1013904223
  private static readonly LCG_M = 4294967296

  nodePositions: Float32Array
  nodeRadii: Float32Array
  edgeEndpoints: Uint32Array
  velocities: Float32Array
  fixed: Uint8Array
  nodeCount: number
  edgeCount: number

  // alpha cooling
  alpha = 1
  alphaMin: number
  alphaDecay: number
  alphaTarget: number
  velocityDecay: number
  // forces
  chargeStrength: number
  theta: number
  distanceMin2: number
  distanceMax: number
  linkDistance: number
  linkIterations: number
  collideStrength: number
  centerX: number
  centerY: number
  centerStrength: number
  gravityStrength: number
  collidePadding: number

  private edgeStrength: Float32Array
  private edgeBias: Float32Array
  private chargeForces: Float32Array
  private treeElements: Float32Array
  private activeSlots: Uint32Array
  private activeCount = 0
  private seed = 1

  constructor(config: SimulationConfig) {
    const S = Simulation
    this.nodePositions = config.nodePositions
    this.nodeRadii = config.nodeRadii
    this.edgeEndpoints = config.edgeEndpoints
    this.nodeCount = config.nodeCount
    this.edgeCount = config.edgeCount
    this.velocities = config.velocities ?? new Float32Array(this.nodeCount * S.POSITION_STRIDE)
    this.fixed = config.fixed ?? new Uint8Array(this.nodeCount)

    this.alphaMin = 0.001
    this.alphaDecay = 1 - Math.pow(this.alphaMin, 1 / 300)
    this.alphaTarget = 0
    this.velocityDecay = 0.6
    this.chargeStrength = -600
    this.theta = 0.9
    this.distanceMin2 = 1
    this.distanceMax = Infinity
    this.linkDistance = 180
    this.linkIterations = 1
    this.collideStrength = 1
    this.centerX = 0
    this.centerY = 0
    this.centerStrength = 1
    this.gravityStrength = 0.1
    this.collidePadding = 0
    this.configure(config)

    this.initPositions()
    this.edgeStrength = new Float32Array(this.edgeCount)
    this.edgeBias = new Float32Array(this.edgeCount)
    this.chargeForces = new Float32Array(this.nodeCount * 2)
    this.treeElements = new Float32Array(this.nodeCount * S.TREE_STRIDE)
    this.activeSlots = new Uint32Array(this.nodeCount)
    this.initEdges()
  }

  configure(options: SimulationOptions = {}): void {
    if (options.alphaMin !== undefined) this.alphaMin = options.alphaMin
    this.alphaDecay = options.alphaDecay ?? (options.alphaMin === undefined ? this.alphaDecay : 1 - Math.pow(this.alphaMin, 1 / 300))
    if (options.alphaTarget !== undefined) this.alphaTarget = options.alphaTarget
    if (options.velocityDecay !== undefined) this.velocityDecay = options.velocityDecay
    if (options.chargeStrength !== undefined) this.chargeStrength = options.chargeStrength
    if (options.theta !== undefined) this.theta = options.theta
    if (options.distanceMin2 !== undefined) this.distanceMin2 = options.distanceMin2
    if (options.distanceMax !== undefined) this.distanceMax = options.distanceMax
    if (options.linkDistance !== undefined) this.linkDistance = options.linkDistance
    if (options.linkIterations !== undefined) this.linkIterations = options.linkIterations
    if (options.collideStrength !== undefined) this.collideStrength = options.collideStrength
    if (options.centerX !== undefined) this.centerX = options.centerX
    if (options.centerY !== undefined) this.centerY = options.centerY
    if (options.centerStrength !== undefined) this.centerStrength = options.centerStrength
    if (options.gravityStrength !== undefined) this.gravityStrength = options.gravityStrength
    if (options.collidePadding !== undefined) this.collidePadding = options.collidePadding
  }

  tick(count = 1): void {
    for (let i = 0; i < count; i++) {
      this.refreshActiveSlots()
      if (this.activeCount === 0) return
      this.alpha += (this.alphaTarget - this.alpha) * this.alphaDecay
      this.center()
      const tree = this.createTree()
      this.charge(tree)
      this.link()
      this.gravity()
      this.collide(tree)
      this.integrate()
    }
  }

  dirtySlots(): Uint32Array {
    return this.activeSlots.subarray(0, this.activeCount)
  }

  /** Resolve unset coordinates to a deterministic phyllotaxis spiral; pinned coordinates are left as provided. */
  private initPositions(): void {
    const S = Simulation
    for (let i = 0; i < this.nodeCount; i++) {
      const positionOffset = i * S.POSITION_STRIDE
      if (isNaN(this.nodePositions[positionOffset + S.X]) || isNaN(this.nodePositions[positionOffset + S.Y])) {
        if (!Number.isFinite(this.nodeRadii[i])) continue
        const radius = 10 * Math.sqrt(0.5 + i)
        const angle = i * Math.PI * (3 - Math.sqrt(5))
        if (isNaN(this.nodePositions[positionOffset + S.X])) this.nodePositions[positionOffset + S.X] = radius * Math.cos(angle)
        if (isNaN(this.nodePositions[positionOffset + S.Y])) this.nodePositions[positionOffset + S.Y] = radius * Math.sin(angle)
      }
      this.velocities[positionOffset + S.X] = 0
      this.velocities[positionOffset + S.Y] = 0
    }
  }

  /** Precompute per-edge spring strength and bias from node degrees (d3-force conventions). */
  private initEdges(): void {
    const S = Simulation
    const degree = new Uint32Array(this.nodeCount)
    for (let i = 0; i < this.edgeCount; i++) {
      const source = this.edgeEndpoints[i * S.EDGE_STRIDE]
      const target = this.edgeEndpoints[i * S.EDGE_STRIDE + 1]
      if (source === target || source >= this.nodeCount || target >= this.nodeCount) continue
      degree[source]++
      degree[target]++
    }
    for (let i = 0; i < this.edgeCount; i++) {
      const source = this.edgeEndpoints[i * S.EDGE_STRIDE]
      const target = this.edgeEndpoints[i * S.EDGE_STRIDE + 1]
      const sourceDegree = degree[source]
      const targetDegree = degree[target]
      this.edgeStrength[i] = sourceDegree > 0 && targetDegree > 0 ? 1 / Math.min(sourceDegree, targetDegree) : 0
      this.edgeBias[i] = sourceDegree + targetDegree > 0 ? sourceDegree / (sourceDegree + targetDegree) : 0.5
    }
  }

  private refreshActiveSlots(): void {
    const S = Simulation
    this.activeCount = 0
    for (let slot = 0; slot < this.nodeCount; slot++) {
      const positionOffset = slot * S.POSITION_STRIDE
      const x = this.nodePositions[positionOffset + S.X]
      const y = this.nodePositions[positionOffset + S.Y]
      const radius = this.nodeRadii[slot]
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) continue
      const active = this.activeCount++
      const treeOffset = active * S.TREE_STRIDE
      this.activeSlots[active] = slot
      this.treeElements[treeOffset + S.X] = x
      this.treeElements[treeOffset + S.Y] = y
      this.treeElements[treeOffset + S.RADIUS] = radius + this.collidePadding
    }
  }

  private createTree(): Quadtree {
    const S = Simulation
    return new Quadtree(this.treeElements.subarray(0, this.activeCount * S.TREE_STRIDE), {
      stride: S.TREE_STRIDE,
      xOffset: S.X,
      yOffset: S.Y,
      radius: { offset: S.RADIUS },
      mass: 1
    })
  }

  /**
   * Many-body repulsion via Barnes-Hut. Uses the quadtree's inlined force kernel (no per-interaction callback)
   * to accumulate forces, then folds them into velocity. `chargeStrength * alpha` scales the inverse-square law.
   */
  private charge(tree: Quadtree): void {
    const S = Simulation
    const forces = this.chargeForces
    const compactForces = forces.subarray(0, this.activeCount * S.POSITION_STRIDE)
    compactForces.fill(0)
    tree.applyManyBodyForce(compactForces, this.chargeStrength * this.alpha, this.theta, this.distanceMin2, this.distanceMax)
    for (let i = 0; i < this.activeCount; i++) {
      const slotOffset = this.activeSlots[i] * S.POSITION_STRIDE
      this.velocities[slotOffset + S.X] += compactForces[i * S.POSITION_STRIDE + S.X]
      this.velocities[slotOffset + S.Y] += compactForces[i * S.POSITION_STRIDE + S.Y]
    }
  }

  /** Link springs: pull/push each edge's endpoints toward `linkDistance`, split by degree bias (d3-force). */
  private link(): void {
    const S = Simulation
    const alpha = this.alpha
    const linkDistance = this.linkDistance
    for (let iteration = 0; iteration < this.linkIterations; iteration++) {
      for (let i = 0; i < this.edgeCount; i++) {
        const sourceSlot = this.edgeEndpoints[i * S.EDGE_STRIDE]
        const targetSlot = this.edgeEndpoints[i * S.EDGE_STRIDE + 1]
        if (sourceSlot === targetSlot || sourceSlot >= this.nodeCount || targetSlot >= this.nodeCount || this.edgeStrength[i] === 0)
          continue
        const source = sourceSlot * S.POSITION_STRIDE
        const target = targetSlot * S.POSITION_STRIDE
        if (!this.isFinitePosition(source) || !this.isFinitePosition(target)) continue
        let dx =
          this.nodePositions[target + S.X] +
          this.velocities[target + S.X] -
          this.nodePositions[source + S.X] -
          this.velocities[source + S.X]
        let dy =
          this.nodePositions[target + S.Y] +
          this.velocities[target + S.Y] -
          this.nodePositions[source + S.Y] -
          this.velocities[source + S.Y]
        if (dx === 0) dx = this.jiggle()
        if (dy === 0) dy = this.jiggle()
        const distance = Math.sqrt(dx * dx + dy * dy)
        const l = ((distance - linkDistance) / distance) * alpha * this.edgeStrength[i]
        dx *= l
        dy *= l
        const bias = this.edgeBias[i]
        this.velocities[target + S.X] -= dx * bias
        this.velocities[target + S.Y] -= dy * bias
        this.velocities[source + S.X] += dx * (1 - bias)
        this.velocities[source + S.Y] += dy * (1 - bias)
      }
    }
  }

  /** Weak pull toward the center, bounding spread and keeping disconnected components from drifting away. */
  private gravity(): void {
    const S = Simulation
    const k = this.gravityStrength * this.alpha
    if (k === 0) return
    for (let i = 0; i < this.activeCount; i++) {
      const slot = this.activeSlots[i]
      const o = slot * S.POSITION_STRIDE
      const fixed = this.fixed[slot]
      if ((fixed & S.FIXED_X) === 0) this.velocities[o + S.X] += (this.centerX - this.nodePositions[o + S.X]) * k
      if ((fixed & S.FIXED_Y) === 0) this.velocities[o + S.Y] += (this.centerY - this.nodePositions[o + S.Y]) * k
    }
  }

  /** Resolve overlaps from each unique colliding pair, the lighter (smaller) node yielding more. */
  private collide(tree: Quadtree): void {
    const S = Simulation
    const strength = this.collideStrength
    tree.forEachCollision((i, j, dx, dy, distanceSquared) => {
      const slotI = this.activeSlots[i]
      const slotJ = this.activeSlots[j]
      const oi = slotI * S.POSITION_STRIDE
      const oj = slotJ * S.POSITION_STRIDE
      const ri = this.nodeRadii[slotI] + this.collidePadding
      const rj = this.nodeRadii[slotJ] + this.collidePadding
      const combinedRadius = ri + rj
      let ddx = dx
      let ddy = dy
      let d2 = distanceSquared
      if (d2 === 0) {
        ddx = this.jiggle()
        ddy = this.jiggle()
        d2 = ddx * ddx + ddy * ddy
      }
      const distance = Math.sqrt(d2)
      const l = ((combinedRadius - distance) / distance) * strength
      const px = ddx * l
      const py = ddy * l
      // dx/dy point from j to i; i yields in proportion to j's size and vice versa
      const wi = (rj * rj) / (ri * ri + rj * rj)
      const wj = 1 - wi
      const fixedI = this.fixed[slotI]
      const fixedJ = this.fixed[slotJ]
      if ((fixedI & S.FIXED_X) === 0) this.velocities[oi + S.X] += px * wi
      if ((fixedI & S.FIXED_Y) === 0) this.velocities[oi + S.Y] += py * wi
      if ((fixedJ & S.FIXED_X) === 0) this.velocities[oj + S.X] -= px * wj
      if ((fixedJ & S.FIXED_Y) === 0) this.velocities[oj + S.Y] -= py * wj
    })
  }

  /** Translate the layout so its centroid sits at (centerX, centerY) — removes drift, adds no energy. */
  private center(): void {
    const S = Simulation
    if (this.centerStrength === 0) return
    let sumX = 0
    let sumY = 0
    for (let i = 0; i < this.activeCount; i++) {
      const o = this.activeSlots[i] * S.POSITION_STRIDE
      sumX += this.nodePositions[o + S.X]
      sumY += this.nodePositions[o + S.Y]
    }
    const offsetX = (sumX / this.activeCount - this.centerX) * this.centerStrength
    const offsetY = (sumY / this.activeCount - this.centerY) * this.centerStrength
    for (let i = 0; i < this.activeCount; i++) {
      const slot = this.activeSlots[i]
      const o = slot * S.POSITION_STRIDE
      const fixed = this.fixed[slot]
      if ((fixed & S.FIXED_X) === 0) this.nodePositions[o + S.X] -= offsetX
      if ((fixed & S.FIXED_Y) === 0) this.nodePositions[o + S.Y] -= offsetY
    }
  }

  /** Euler integration with velocity decay. Pinned axes hold position and zero their velocity. */
  private integrate(): void {
    const S = Simulation
    const decay = this.velocityDecay
    for (let i = 0; i < this.activeCount; i++) {
      const slot = this.activeSlots[i]
      const o = slot * S.POSITION_STRIDE
      const fixed = this.fixed[slot]
      if ((fixed & S.FIXED_X) === 0) this.nodePositions[o + S.X] += this.velocities[o + S.X] *= decay
      else this.velocities[o + S.X] = 0
      if ((fixed & S.FIXED_Y) === 0) this.nodePositions[o + S.Y] += this.velocities[o + S.Y] *= decay
      else this.velocities[o + S.Y] = 0
    }
  }

  private isFinitePosition(offset: number): boolean {
    return Number.isFinite(this.nodePositions[offset + Simulation.X]) && Number.isFinite(this.nodePositions[offset + Simulation.Y])
  }

  private random(): number {
    return (this.seed = (Simulation.LCG_A * this.seed + Simulation.LCG_C) % Simulation.LCG_M) / Simulation.LCG_M
  }

  /** A tiny deterministic offset used to separate coincident points. */
  private jiggle(): number {
    return (this.random() - 0.5) * 1e-6
  }
}
