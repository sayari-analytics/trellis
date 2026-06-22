/* eslint-disable no-console */
/**
 * d3-force / d3-quadtree baseline, using the SAME seeded data, density, sizes and theta as perf/index.ts
 * so the numbers are directly comparable. d3 operates on object arrays, so we adapt our Float32Array.
 *
 * Run:  npm run perf:d3
 */
import { quadtree } from 'd3-quadtree'
import { forceCollide, forceManyBody } from 'd3-force'
import { bench, generate, perturb, createRng, table, heading, note, Stats, ELEMENT_STRIDE, X, Y, R } from './bench'

type Node = { index: number; x: number; y: number; vx: number; vy: number; r: number }

const THETA = 0.9
const SPACING = 1.5
const RUNS = 25
const WARMUP = 3
const SIZES = [1_000, 10_000, 100_000, ...(process.env.PERF_1M ? [1_000_000] : [])]

const sizeColumn = { header: 'elements', value: (s: Stats) => Number(s.label).toLocaleString() }

/** Convert our packed Float32Array into the object array d3 expects (sharing the same coordinates). */
const toNodes = (elements: Float32Array): Node[] => {
  const nodes: Node[] = new Array(elements.length / ELEMENT_STRIDE)
  for (let i = 0; i < nodes.length; i++) {
    const o = i * ELEMENT_STRIDE
    nodes[i] = { index: i, x: elements[o + X], y: elements[o + Y], vx: 0, vy: 0, r: elements[o + R] }
  }
  return nodes
}

/** Copy perturbed coordinates from the Float32Array back into the d3 node objects. */
const syncNodes = (elements: Float32Array, nodes: Node[]): void => {
  for (let i = 0; i < nodes.length; i++) {
    const o = i * ELEMENT_STRIDE
    nodes[i].x = elements[o + X]
    nodes[i].y = elements[o + Y]
    nodes[i].vx = 0
    nodes[i].vy = 0
  }
}

// LCG for d3's required random source
const lcg = () => {
  let s = 1
  return () => (s = (1664525 * s + 1013904223) % 4294967296) / 4294967296
}

heading('============ D3 BASELINE (same data/density as perf/index.ts) ============')
note(`theta=${THETA} spacing=${SPACING} runs=${RUNS} (warmup ${WARMUP})`)

heading('--- d3-quadtree build ---')
table(
  SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const nodes = toNodes(elements)
    const rng = createRng(count)
    return bench(
      `${count}`,
      () =>
        void quadtree(
          nodes,
          (d) => d.x,
          (d) => d.y
        ),
      { runs: RUNS, warmup: WARMUP, setup: (run) => run >= 0 && (perturb(elements, rng), syncNodes(elements, nodes)) }
    )
  }),
  [sizeColumn]
)

heading('--- d3 forceCollide (one pass) ---')
table(
  SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const nodes = toNodes(elements)
    const collide = forceCollide<Node>((d) => d.r)
    collide.initialize(nodes, lcg())
    const rng = createRng(count)
    return bench(`${count}`, () => collide(1), {
      runs: RUNS,
      warmup: WARMUP,
      setup: (run) => run >= 0 && (perturb(elements, rng), syncNodes(elements, nodes))
    })
  }),
  [sizeColumn]
)

heading(`--- d3 forceManyBody (one pass, theta=${THETA}) ---`)
table(
  SIZES.map((count) => {
    const elements = generate(count, 'gaussian', { spacing: SPACING })
    const nodes = toNodes(elements)
    const manyBody = forceManyBody<Node>().theta(THETA)
    manyBody.initialize(nodes, lcg())
    const rng = createRng(count)
    return bench(`${count}`, () => manyBody(1), {
      runs: RUNS,
      warmup: WARMUP,
      setup: (run) => run >= 0 && (perturb(elements, rng), syncNodes(elements, nodes))
    })
  }),
  [sizeColumn]
)
