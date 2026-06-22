/* eslint-disable no-console */
/**
 * Shared benchmark harness for the quadtree perf suite.
 *
 * Goals that the previous benchmarks missed:
 * - Deterministic, seeded data so runs are comparable across code changes and across implementations (ours vs d3).
 * - Realistic spatial density. Force layouts settle into clouds where neighbours sit ~1-3 diameters apart and
 *   collisions are frequent. The old suite used bounds = count * 10, producing ~0.5 collisions per 100k nodes,
 *   so the "collision" number measured traversal overhead on an empty problem rather than real work.
 * - Multiple distributions (uniform / gaussian / clustered) since real graphs are clustered, not a single blob.
 * - Warmup iterations (let the JIT compile) and percentile stats (min / median / mean / p95) instead of a bare
 *   mean that a single GC pause can skew.
 */

export const ELEMENT_STRIDE = 3
export const X = 0
export const Y = 1
export const R = 2

/** mulberry32 — small, fast, seedable PRNG. Deterministic across machines. */
export const createRng = (seed = 0x9e3779b9): (() => number) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal sample via Box-Muller, driven by a seeded uniform rng. */
const gaussian = (rng: () => number): number => Math.sqrt(-2 * Math.log(rng() || 1e-12)) * Math.cos(2 * Math.PI * rng())

export type Distribution = 'uniform' | 'gaussian' | 'clustered'

export type GenerateOptions = {
  /** Mean element radius. Default 3. */
  meanRadius?: number
  /** Radius is uniformly sampled in [meanRadius - radiusJitter, meanRadius + radiusJitter]. Default 2. */
  radiusJitter?: number
  /**
   * Target spacing between neighbouring elements, as a multiple of mean diameter.
   * ~1 => tightly packed (many collisions), ~3 => sparse settled layout, larger => few collisions.
   * Default 1.5, which yields a realistic mix of contacts for collision benchmarking.
   */
  spacing?: number
  /** Number of clusters for the 'clustered' distribution. Default 12. */
  clusters?: number
  seed?: number
}

/**
 * The bounding box side length that places `count` elements at the requested mean `spacing`.
 * area-per-element = side^2 / count, nearest-neighbour distance ~= side / sqrt(count).
 * We want that distance ~= spacing * meanDiameter.
 */
const boundsForSpacing = (count: number, meanDiameter: number, spacing: number): number => spacing * meanDiameter * Math.sqrt(count)

/**
 * Generate `count` elements as a Float32Array of [x, y, r] triples.
 * Spacing/density is controlled so collisions actually occur (see GenerateOptions.spacing).
 */
export const generate = (count: number, distribution: Distribution, options: GenerateOptions = {}): Float32Array => {
  const meanRadius = options.meanRadius ?? 3
  const radiusJitter = options.radiusJitter ?? 2
  const spacing = options.spacing ?? 1.5
  const clusterCount = options.clusters ?? 12
  const rng = createRng(options.seed ?? 0x9e3779b9)
  const side = boundsForSpacing(count, meanRadius * 2, spacing)

  const elements = new Float32Array(count * ELEMENT_STRIDE)

  if (distribution === 'uniform') {
    for (let i = 0; i < count; i++) {
      const o = i * ELEMENT_STRIDE
      elements[o + X] = rng() * side
      elements[o + Y] = rng() * side
      elements[o + R] = meanRadius + (rng() * 2 - 1) * radiusJitter
    }
  } else if (distribution === 'gaussian') {
    // A single blob whose 1-sigma covers ~1/3 of the side, so ~99% of points fit the bounds.
    const center = side / 2
    const stdDev = side / 6
    for (let i = 0; i < count; i++) {
      const o = i * ELEMENT_STRIDE
      elements[o + X] = center + gaussian(rng) * stdDev
      elements[o + Y] = center + gaussian(rng) * stdDev
      elements[o + R] = meanRadius + (rng() * 2 - 1) * radiusJitter
    }
  } else {
    // Multiple gaussian blobs scattered uniformly — models community structure.
    const clusterStdDev = side / (Math.sqrt(clusterCount) * 6)
    const centers: number[] = []
    for (let c = 0; c < clusterCount; c++) {
      centers.push(rng() * side, rng() * side)
    }
    for (let i = 0; i < count; i++) {
      const o = i * ELEMENT_STRIDE
      const c = (i % clusterCount) * 2
      elements[o + X] = centers[c] + gaussian(rng) * clusterStdDev
      elements[o + Y] = centers[c + 1] + gaussian(rng) * clusterStdDev
      elements[o + R] = meanRadius + (rng() * 2 - 1) * radiusJitter
    }
  }

  return elements
}

/**
 * Perturb every element by a symmetric random jiggle, modelling the small per-tick position change
 * a force layout produces. `amount` is in absolute coordinate units (default 1 diameter-ish).
 * Symmetric (±) so the cloud doesn't drift/spread monotonically the way the old `+= random()*2` did.
 */
export const perturb = (elements: Float32Array, rng: () => number, amount = 4): void => {
  for (let o = 0; o < elements.length; o += ELEMENT_STRIDE) {
    elements[o + X] += (rng() * 2 - 1) * amount
    elements[o + Y] += (rng() * 2 - 1) * amount
  }
}

export type Stats = {
  label: string
  runs: number
  min: number
  mean: number
  median: number
  p95: number
  stddev: number
  /** Optional workload metric returned by the benchmark fn, averaged across runs (e.g. collision pairs found). */
  metric?: number
  metricLabel?: string
}

const summarize = (label: string, durations: number[], metrics: number[], metricLabel?: string): Stats => {
  const sorted = [...durations].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, d) => s + d, 0) / n
  const variance = sorted.reduce((s, d) => s + (d - mean) ** 2, 0) / n
  const metric = metrics.length ? metrics.reduce((s, m) => s + m, 0) / metrics.length : undefined
  return {
    label,
    runs: n,
    min: sorted[0],
    mean,
    median: sorted[Math.floor(n * 0.5)],
    p95: sorted[Math.min(n - 1, Math.floor(n * 0.95))],
    stddev: Math.sqrt(variance),
    metric,
    metricLabel
  }
}

export type BenchOptions = {
  runs?: number
  warmup?: number
  /** Called before each measured run (and each warmup run). Setup cost is NOT included in the timing. */
  setup?: (run: number) => void
  metricLabel?: string
}

/**
 * Run `fn` `runs` times (after `warmup` untimed runs) and return timing stats.
 * `fn` may return a number, which is recorded as a workload metric (averaged and reported).
 */
export const bench = (label: string, fn: (run: number) => number | void, options: BenchOptions = {}): Stats => {
  const runs = options.runs ?? 30
  const warmup = options.warmup ?? 3

  for (let w = 0; w < warmup; w++) {
    options.setup?.(-1)
    fn(-1)
  }

  const durations: number[] = []
  const metrics: number[] = []
  for (let run = 0; run < runs; run++) {
    options.setup?.(run)
    const start = performance.now()
    const metric = fn(run)
    durations.push(performance.now() - start)
    if (typeof metric === 'number') metrics.push(metric)
  }

  return summarize(label, durations, metrics, options.metricLabel)
}

const ORANGE = '\x1b[1m\x1b[38;5;208m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

export const heading = (text: string): void => console.log(`\n${ORANGE}${text}${RESET}`)

export const note = (text: string): void => console.log(`${DIM}${text}${RESET}`)

const pad = (s: string, width: number, align: 'left' | 'right' = 'right'): string =>
  align === 'right' ? s.padStart(width) : s.padEnd(width)

/** Print a set of Stats rows as an aligned table. */
export const table = (rows: Stats[], extraColumns: { header: string; value: (s: Stats) => string }[] = []): void => {
  const fmt = (n: number) => n.toFixed(2)
  const cols: { header: string; value: (s: Stats) => string; align?: 'left' | 'right' }[] = [
    { header: 'benchmark', value: (s) => s.label, align: 'left' },
    ...extraColumns.map((c) => ({ ...c, align: 'right' as const })),
    { header: 'mean ms', value: (s) => fmt(s.mean) },
    { header: 'median', value: (s) => fmt(s.median) },
    { header: 'min', value: (s) => fmt(s.min) },
    { header: 'p95', value: (s) => fmt(s.p95) },
    { header: '±stddev', value: (s) => fmt(s.stddev) }
  ]
  if (rows.some((r) => r.metric !== undefined)) {
    cols.push({
      header: rows.find((r) => r.metricLabel)?.metricLabel ?? 'metric',
      value: (s) => (s.metric === undefined ? '' : Math.round(s.metric).toLocaleString())
    })
  }

  const widths = cols.map((c) => Math.max(c.header.length, ...rows.map((r) => c.value(r).length)))
  console.log(cols.map((c, i) => pad(c.header, widths[i], c.align)).join('  '))
  console.log(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of rows) {
    console.log(cols.map((c, i) => pad(c.value(row), widths[i], c.align)).join('  '))
  }
}
