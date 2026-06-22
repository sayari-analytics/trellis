/* eslint-disable no-console */
/**
 * Quadtree performance suite.
 *
 * Each section isolates one cost so we can see where a force-layout tick actually spends time:
 *   - build / rebuild   : constructing the index (the cost the user suspects dominates)
 *   - collide           : forEachCollision query (unique overlapping pairs)
 *   - nbody             : forEachBody Barnes-Hut query at a realistic theta
 *   - traversal         : forEachQuad / forEachQuadElement
 *   - tick (end-to-end)  : rebuild + collide + nbody, the real per-tick cost
 *
 * Plus three sensitivity sweeps (count, distribution, maxDepth, density) so the numbers describe a curve,
 * not a single unrepresentative point.
 *
 * Run:  npm run perf            (default sizes)
 *       PERF_1M=1 npm run perf  (also run the 1,000,000-element size — slow)
 */
import { Quadtree } from '../src'
import { bench, generate, perturb, createRng, table, heading, note, Stats, Distribution, ELEMENT_STRIDE, X, Y } from './bench'

const DEFAULT_CAPACITY = 8
const THETA = 1.5
const SPACING = 1.5
const RUNS = 10
const WARMUP = 1

const SIZES = [1_000, 10_000, 100_000, ...(process.env.PERF_1M ? [1_000_000] : [])]

const sizeColumn = { header: 'elements', value: (s: Stats) => Number(s.label).toLocaleString() }

/** Build / rebuild across sizes. rebuild reuses the instance; positions are perturbed (untimed) between runs. */
const benchBuild = () => {
  heading('--- Build (full construction: allocate + insert + merge) ---')
  const buildRows = SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const rng = createRng(count)
    return bench(`${count}`, () => void new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY }), {
      runs: RUNS,
      warmup: WARMUP,
      setup: (run) => run >= 0 && perturb(elements, rng)
    })
  })
  table(buildRows, [sizeColumn])

  heading('--- Rebuild (reuse instance after position changes) ---')
  const rebuildRows = SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    const rng = createRng(count)
    return bench(`${count}`, () => tree.rebuild(), {
      runs: RUNS,
      warmup: WARMUP,
      setup: (run) => run >= 0 && perturb(elements, rng)
    })
  })
  table(rebuildRows, [sizeColumn])
}

/** Collision query across sizes. The tree is rebuilt in setup (untimed); only the query is measured. */
const benchCollide = () => {
  heading('--- Collide (forEachCollision: unique overlapping pairs) ---')
  const rows = SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    const rng = createRng(count)
    let pairs = 0
    return bench(
      `${count}`,
      () => {
        pairs = 0
        tree.forEachCollision(() => pairs++)
        return pairs
      },
      {
        runs: RUNS,
        warmup: WARMUP,
        metricLabel: 'pairs',
        setup: (run) => {
          if (run >= 0) perturb(elements, rng)
          tree.rebuild()
        }
      }
    )
  })
  table(rows, [sizeColumn])
}

/** N-body Barnes-Hut query across sizes at a realistic theta. */
const benchNBody = () => {
  heading(`--- N-Body (forEachBody Barnes-Hut, theta=${THETA}) ---`)
  const rows = SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    const forces = new Float32Array(count * 2)
    const rng = createRng(count)
    let interactions = 0
    return bench(
      `${count}`,
      () => {
        forces.fill(0)
        interactions = 0
        tree.forEachBody((id, bx, by, mass, dist2) => {
          const o = id * ELEMENT_STRIDE
          const dx = bx - elements[o + X]
          const dy = by - elements[o + Y]
          const d2 = dist2 + 10
          const mag = mass / d2
          const inv = 1 / Math.sqrt(d2)
          forces[id * 2] += mag * dx * inv
          forces[id * 2 + 1] += mag * dy * inv
          interactions++
        }, THETA)
        return interactions
      },
      {
        runs: RUNS,
        warmup: WARMUP,
        metricLabel: 'interactions',
        setup: (run) => {
          if (run >= 0) perturb(elements, rng)
          tree.rebuild()
        }
      }
    )
  })
  table(rows, [sizeColumn])
}

/** Traversal primitives. */
const benchTraversal = () => {
  heading('--- Traversal (forEachQuad / forEachQuadElement) ---')
  const rows: Stats[] = []
  for (const count of SIZES) {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    rows.push(bench(`forEachQuad ${count}`, () => tree.forEachQuad(() => true), { runs: RUNS, warmup: WARMUP }))
    rows.push(
      bench(
        `forEachQuadElement ${count}`,
        () => {
          tree.forEachQuad((quadId) => {
            for (const _ of tree.forEachQuadElement(quadId)) {
              /* visit */
            }
            return true
          })
        },
        { runs: RUNS, warmup: WARMUP }
      )
    )
  }
  table(rows)
}

/** End-to-end per-tick cost: rebuild + collide + nbody, the shape a real force layout runs every frame. */
const benchTick = () => {
  heading(`--- Tick (rebuild + collide + nbody, theta=${THETA}) — real per-tick cost ---`)
  const rows = SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    const forces = new Float32Array(count * 2)
    const rng = createRng(count)
    return bench(
      `${count}`,
      () => {
        tree.rebuild()
        tree.forEachCollision(() => {})
        forces.fill(0)
        tree.forEachBody((id, bx, by, mass, dist2) => {
          forces[id * 2] += (mass * (bx - elements[id * ELEMENT_STRIDE + X])) / (dist2 + 10)
        }, THETA)
      },
      { runs: RUNS, warmup: WARMUP, setup: (run) => run >= 0 && perturb(elements, rng) }
    )
  })
  table(rows, [sizeColumn])
}

/** How collision cost changes across spatial distributions (uniform / gaussian / clustered). */
const benchDistribution = (count = 100_000) => {
  heading(`--- Distribution sensitivity (collide, ${count.toLocaleString()} elements) ---`)
  const distributions: Distribution[] = ['uniform', 'gaussian', 'clustered']
  const rows = distributions.map((distribution) => {
    const elements = generate(count, distribution, { spacing: SPACING })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    const rng = createRng(count)
    let pairs = 0
    return bench(
      distribution,
      () => {
        pairs = 0
        tree.forEachCollision(() => pairs++)
        return pairs
      },
      {
        runs: RUNS,
        warmup: WARMUP,
        metricLabel: 'pairs',
        setup: (run) => {
          if (run >= 0) perturb(elements, rng)
          tree.rebuild()
        }
      }
    )
  })
  table(rows, [{ header: 'distribution', value: (s) => s.label }])
}

/** How rebuild + collide cost changes with maxDepth — finds the sweet spot for a given size. */
const benchDepth = (count = 100_000) => {
  heading(`--- maxDepth sensitivity (rebuild + collide, ${count.toLocaleString()} elements) ---`)
  const depths = [5, 6, 7, 8, 9, 10]
  const rows = depths.map((depth) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const tree = new Quadtree(elements, { maxDepth: depth, maxCapacity: DEFAULT_CAPACITY })
    const rng = createRng(count)
    return bench(
      `depth ${depth}`,
      () => {
        tree.rebuild()
        tree.forEachCollision(() => {})
      },
      { runs: RUNS, warmup: WARMUP, setup: (run) => run >= 0 && perturb(elements, rng) }
    )
  })
  table(rows, [{ header: 'maxDepth', value: (s) => s.label.replace('depth ', '') }])
}

/** How collision cost scales with packing density (spacing) — sparse vs tightly packed. */
const benchDensity = (count = 100_000) => {
  heading(`--- Density sensitivity (collide, ${count.toLocaleString()} elements) ---`)
  note('spacing = neighbour distance in mean-diameters; smaller => more overlap/collisions')
  const spacings = [0.75, 1, 1.5, 3, 6]
  const rows = spacings.map((spacing) => {
    const elements = generate(count, 'gaussian', { spacing })
    const tree = new Quadtree(elements, { maxCapacity: DEFAULT_CAPACITY })
    const rng = createRng(count)
    let pairs = 0
    return bench(
      `spacing ${spacing}`,
      () => {
        pairs = 0
        tree.forEachCollision(() => pairs++)
        return pairs
      },
      {
        runs: RUNS,
        warmup: WARMUP,
        metricLabel: 'pairs',
        setup: (run) => {
          if (run >= 0) perturb(elements, rng, spacing * 2)
          tree.rebuild()
        }
      }
    )
  })
  table(rows, [{ header: 'spacing', value: (s) => s.label.replace('spacing ', '') }])
}

heading('============ QUADTREE PERFORMANCE SUITE ============')
note(
  `maxDepth=adaptive (1k=${Quadtree.adaptiveDepth(1_000)} 10k=${Quadtree.adaptiveDepth(10_000)} 100k=${Quadtree.adaptiveDepth(100_000)}) ` +
    `maxCapacity=${DEFAULT_CAPACITY} theta=${THETA} spacing=${SPACING} runs=${RUNS} (warmup ${WARMUP})`
)

benchBuild()
benchCollide()
benchNBody()
benchTraversal()
benchTick()
benchDistribution()
benchDepth()
benchDensity()
