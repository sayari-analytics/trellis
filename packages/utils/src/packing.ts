/**
 * Geometry primitives for arranging disjoint shapes into a single compact, overlap-free cluster.
 *
 * Graph-agnostic geometry helpers for radii, sizes, and circles.
 *
 *   - `packCircles`    — Wang et al.'s front-chain circle packing (2006), the same algorithm d3-hierarchy's
 *                        `packSiblings` uses. Places circles one at a time tangent to a chain of frontier
 *                        circles, producing a near-circular, gap-minimal arrangement in ~O(n) time. The
 *                        right model when each footprint is roughly round (a force-directed blob, a node).
 *   - `packRectangles` — shelf (strip) packing of axis-aligned boxes. The right model for footprints that
 *                        are far wider than tall or vice versa (a sugiyama/layered ribbon), where a bounding
 *                        circle would leave most of its disk empty.
 *   - `enclose`        — smallest enclosing circle of a set of circles; bounds a cluster or component.
 */

type Circle = { x: number; y: number; r: number }

// ---------------------------------------------------------------------------------------------------------
// smallest enclosing circle (Welzl), generalized to circles — ported from d3-hierarchy/src/pack/enclose.js.
// Used to (a) recenter the front-chain packing on its true center and (b) bound a laid-out component.
// ---------------------------------------------------------------------------------------------------------

const enclosesWeak = (a: Circle, b: Circle): boolean => {
  const dr = a.r - b.r + Math.max(a.r, b.r, 1) * 1e-9
  const dx = b.x - a.x
  const dy = b.y - a.y
  return dr > 0 && dr * dr > dx * dx + dy * dy
}

const enclosesWeakAll = (a: Circle, B: Circle[]): boolean => B.every((b) => enclosesWeak(a, b))

const enclosesNot = (a: Circle, b: Circle): boolean => {
  const dr = a.r - b.r
  const dx = b.x - a.x
  const dy = b.y - a.y
  return dr < 0 || dr * dr < dx * dx + dy * dy
}

const encloseBasis1 = (a: Circle): Circle => ({ x: a.x, y: a.y, r: a.r })

const encloseBasis2 = (a: Circle, b: Circle): Circle => {
  const { x: x1, y: y1, r: r1 } = a
  const { x: x2, y: y2, r: r2 } = b
  const x21 = x2 - x1
  const y21 = y2 - y1
  const r21 = r2 - r1
  const l = Math.sqrt(x21 * x21 + y21 * y21)
  return {
    x: (x1 + x2 + (x21 / l) * r21) / 2,
    y: (y1 + y2 + (y21 / l) * r21) / 2,
    r: (l + r1 + r2) / 2
  }
}

const encloseBasis3 = (a: Circle, b: Circle, c: Circle): Circle => {
  const { x: x1, y: y1, r: r1 } = a
  const { x: x2, y: y2, r: r2 } = b
  const { x: x3, y: y3, r: r3 } = c
  const a2 = x1 - x2
  const a3 = x1 - x3
  const b2 = y1 - y2
  const b3 = y1 - y3
  const c2 = r2 - r1
  const c3 = r3 - r1
  const d1 = x1 * x1 + y1 * y1 - r1 * r1
  const d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2
  const d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3
  const ab = a3 * b2 - a2 * b3
  const xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1
  const xb = (b3 * c2 - b2 * c3) / ab
  const ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1
  const yb = (a2 * c3 - a3 * c2) / ab
  const A = xb * xb + yb * yb - 1
  const B = 2 * (r1 + xa * xb + ya * yb)
  const C = xa * xa + ya * ya - r1 * r1
  const r = -(Math.abs(A) > 1e-6 ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B)
  return { x: x1 + xa + xb * r, y: y1 + ya + yb * r, r }
}

const encloseBasis = (B: Circle[]): Circle =>
  B.length === 1 ? encloseBasis1(B[0]) : B.length === 2 ? encloseBasis2(B[0], B[1]) : encloseBasis3(B[0], B[1], B[2])

const extendBasis = (B: Circle[], p: Circle): Circle[] => {
  if (enclosesWeakAll(p, B)) return [p]

  for (let i = 0; i < B.length; ++i) {
    if (enclosesNot(p, B[i]) && enclosesWeakAll(encloseBasis2(B[i], p), B)) return [B[i], p]
  }

  for (let i = 0; i < B.length - 1; ++i) {
    for (let j = i + 1; j < B.length; ++j) {
      if (
        enclosesNot(encloseBasis2(B[i], B[j]), p) &&
        enclosesNot(encloseBasis2(B[i], p), B[j]) &&
        enclosesNot(encloseBasis2(B[j], p), B[i]) &&
        enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)
      ) {
        return [B[i], B[j], p]
      }
    }
  }

  throw new Error('extendBasis: degenerate input') // unreachable for well-formed input
}

/** Smallest circle enclosing every circle in `circles`. Returns a zero circle for empty input. */
export const enclose = (circles: Circle[]): Circle => {
  let e: Circle | undefined
  let B: Circle[] = []
  let i = 0
  const n = circles.length
  while (i < n) {
    const p = circles[i]
    if (e !== undefined && enclosesWeak(e, p)) {
      ++i
    } else {
      B = extendBasis(B, p)
      e = encloseBasis(B)
      i = 0
    }
  }
  return e ?? { x: 0, y: 0, r: 0 }
}

// ---------------------------------------------------------------------------------------------------------
// front-chain circle packing (Wang et al. 2006) — ported from d3-hierarchy/src/pack/siblings.js
// ---------------------------------------------------------------------------------------------------------

type Chain = { _: Circle; next: Chain; previous: Chain }

// position `c` tangent to already-placed circles `a` and `b`
const place = (a: Circle, b: Circle, c: Circle): void => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d2 = dx * dx + dy * dy
  if (d2) {
    let a2 = a.r + c.r
    a2 *= a2
    let b2 = b.r + c.r
    b2 *= b2
    if (a2 > b2) {
      const x = (d2 + b2 - a2) / (2 * d2)
      const y = Math.sqrt(Math.max(0, b2 / d2 - x * x))
      c.x = b.x - x * dx - y * dy
      c.y = b.y - x * dy + y * dx
    } else {
      const x = (d2 + a2 - b2) / (2 * d2)
      const y = Math.sqrt(Math.max(0, a2 / d2 - x * x))
      c.x = a.x + x * dx - y * dy
      c.y = a.y + x * dy + y * dx
    }
  } else {
    c.x = a.x + c.r
    c.y = a.y
  }
}

const intersects = (a: Circle, b: Circle): boolean => {
  const dr = a.r + b.r - 1e-6
  const dx = b.x - a.x
  const dy = b.y - a.y
  return dr > 0 && dr * dr > dx * dx + dy * dy
}

// squared distance from the origin to the weighted midpoint of a chain node and its successor — used to
// keep the frontier pair closest to the cluster centroid, which makes the packing grow outward evenly
const score = (node: Chain): number => {
  const a = node._
  const b = node.next._
  const ab = a.r + b.r
  const dx = (a.x * b.r + b.x * a.r) / ab
  const dy = (a.y * b.r + b.y * a.r) / ab
  return dx * dx + dy * dy
}

/**
 * Pack circles of the given radii into a compact, overlap-free cluster centered on the origin. Returns one
 * center per input radius, in input order. `padding` is the minimum gap left between neighboring circles
 * (split evenly, so each radius is inflated by padding/2 before packing).
 *
 * The arrangement is deterministic and depends on input order: radii are NOT sorted internally, since the
 * caller may want a stable mapping. Pre-sort descending (largest first) for the tightest, roundest result.
 */
export const packCircles = (radii: number[], padding = 0): { x: number; y: number }[] => {
  const n = radii.length
  if (n === 0) return []

  const inflate = padding / 2
  const circles: Circle[] = radii.map((r) => ({ x: 0, y: 0, r: r + inflate }))

  if (n === 1) {
    // single circle sits at the origin
  } else if (n === 2) {
    const [a, b] = circles
    a.x = -b.r
    b.x = a.r
  } else {
    // place first three, then extend the front chain
    const c0 = circles[0]
    const c1 = circles[1]
    c0.x = -c1.r
    c1.x = c0.r
    place(c1, c0, circles[2])

    let a: Chain = { _: c0, next: null as never, previous: null as never }
    let b: Chain = { _: c1, next: null as never, previous: null as never }
    let c: Chain = { _: circles[2], next: null as never, previous: null as never }
    a.next = c.previous = b
    b.next = a.previous = c
    c.next = b.previous = a

    pack: for (let i = 3; i < n; ++i) {
      place(a._, b._, circles[i])
      c = { _: circles[i], next: null as never, previous: null as never }

      let j = b.next
      let k = a.previous
      let sj = b._.r
      let sk = a._.r
      do {
        if (sj <= sk) {
          if (intersects(j._, c._)) {
            b = j
            a.next = b
            b.previous = a
            --i
            continue pack
          }
          sj += j._.r
          j = j.next
        } else {
          if (intersects(k._, c._)) {
            a = k
            a.next = b
            b.previous = a
            --i
            continue pack
          }
          sk += k._.r
          k = k.previous
        }
      } while (j !== k.next)

      c.previous = a
      c.next = b
      a.next = b.previous = b = c

      let aa = score(a)
      while ((c = c.next) !== b) {
        const ca = score(c)
        if (ca < aa) {
          a = c
          aa = ca
        }
      }
      b = a.next
    }
  }

  const center = enclose(circles)
  return circles.map((circle) => ({ x: circle.x - center.x, y: circle.y - center.y }))
}

// ---------------------------------------------------------------------------------------------------------
// shelf (strip) rectangle packing — for components that are far from round (long sugiyama/sankey ribbons)
// ---------------------------------------------------------------------------------------------------------

/**
 * Pack axis-aligned boxes into a roughly square region with no overlaps, leaving `padding` between them.
 * Returns the min-corner (top-left, +y up) of each box in input order, centered on the origin.
 *
 * Uses next-fit shelf packing: boxes are placed left-to-right on a shelf, tallest-first, wrapping to a new
 * shelf once a target row width is exceeded. The target width is sqrt(total area), which yields an overall
 * footprint close to square. Simple and fast (O(n log n) for the sort); good enough for tens–hundreds of
 * components. Far tighter than circle packing for elongated boxes, at the cost of a less organic look.
 */
export const packRectangles = (sizes: { width: number; height: number }[], padding = 0): { x: number; y: number }[] => {
  const n = sizes.length
  if (n === 0) return []

  const boxes = sizes.map((s, i) => ({ i, w: s.width + padding, h: s.height + padding }))
  const totalArea = boxes.reduce((sum, box) => sum + box.w * box.h, 0)
  const targetWidth = Math.max(Math.sqrt(totalArea), Math.max(...boxes.map((box) => box.w)))

  const order = boxes.slice().sort((p, q) => q.h - p.h)
  const corner: { x: number; y: number }[] = new Array(n)
  let x = 0
  let y = 0
  let shelfHeight = 0
  let usedWidth = 0
  for (const box of order) {
    if (x > 0 && x + box.w > targetWidth) {
      y += shelfHeight
      x = 0
      shelfHeight = 0
    }
    corner[box.i] = { x, y }
    x += box.w
    shelfHeight = Math.max(shelfHeight, box.h)
    usedWidth = Math.max(usedWidth, x)
  }
  const usedHeight = y + shelfHeight

  // shift to recover the true (unpadded) min-corner and center the whole footprint on the origin
  return corner.map((p) => ({ x: p.x + padding / 2 - usedWidth / 2, y: p.y + padding / 2 - usedHeight / 2 }))
}
