import type { Id, Viewport } from '@sayari/trellis'

/**
 * Animation: the clock, easing, and the pure interpolators that pair with them.
 *
 * Following d3's interpolator contract, an interpolator is a *pure sampler*: `interpolateX(from, to)`
 * returns a function `(t) => value` mapping a progress fraction in [0, 1] to the value at that fraction
 * (`0` is `from`, `1` is `to`). It carries no clock and no side effects, which makes it trivially testable
 * and lets a single loop drive many interpolators at once. `animate` is the time-driven half — it owns the
 * requestAnimationFrame contract and feeds `t` to a tick callback. Samplers are **linear in `t`** (easing
 * is applied to `t` at the call site, e.g. `at(smootherstep(t))`) so one interpolator can be reused with
 * any easing or sampled uniformly — the one deliberate exception is viewport zoom (see below).
 */

/**
 * Drive a transition over `duration` ms. Each frame calls `tick(t)` with a progress fraction in [0, 1]
 * (raw/linear — apply easing yourself, e.g. `tick: (t) => at(smootherstep(t))`), guaranteeing a final
 * `tick(1)` before `onComplete`. Returns an idempotent `stop()` that cancels the in-flight animation.
 *
 * Generic on purpose: it knows nothing about positions, so it can drive any interpolator. To run several
 * transitions on a single rAF loop, share one driver and sample each interpolator inside its `tick`.
 */
export const animate = (duration: number, tick: (t: number) => void, onComplete?: () => void): (() => void) => {
  if (duration <= 0) {
    tick(1)
    onComplete?.()
    return () => {}
  }

  let rafHandle = 0
  let start: number | undefined

  const frame = (now: number) => {
    if (start === undefined) start = now
    const t = Math.min(1, (now - start) / duration)
    tick(t)
    if (t >= 1) {
      rafHandle = 0
      onComplete?.()
      return
    }
    rafHandle = requestAnimationFrame(frame)
  }

  rafHandle = requestAnimationFrame(frame)

  return () => {
    if (rafHandle !== 0) {
      cancelAnimationFrame(rafHandle)
      rafHandle = 0
    }
  }
}

// Perlin's smootherstep: an S-curve that eases in and out with zero first/second derivatives at the
// endpoints, so motion starts and stops without a visible velocity jump.
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/**
 * Interpolate node positions from one layout to another.
 *
 * Nodes are matched by id. Only nodes whose target differs from their current position are tweened; a node
 * present in `to` but missing from `from` (newly added) is emitted at its target. Unchanged nodes are
 * dropped entirely, so transitioning a small subgraph within a large graph costs work proportional to what
 * actually moves, not the whole graph.
 *
 * NOTE: the returned array (and its objects) is reused across calls — read it synchronously (e.g. pass to
 * GraphState.updateNodePositions); don't retain it.
 */

export type Position = { id: Id; x: number; y: number }

export const interpolatePosition = (from: Iterable<Position>, to: Iterable<Position>): ((t: number) => Position[]) => {
  const fromById = new Map<Id, Position>()
  for (const position of from) fromById.set(position.id, position)

  // precompute each moving node's start + delta so the sampler is one lerp per node. a node with no prior
  // position (newly added) gets a zero delta, so it's emitted at its target for any t.
  const x0: number[] = []
  const y0: number[] = []
  const dx: number[] = []
  const dy: number[] = []
  const out: Position[] = []

  for (const target of to) {
    const start = fromById.get(target.id)
    const sx = start?.x ?? target.x
    const sy = start?.y ?? target.y
    if (start !== undefined && sx === target.x && sy === target.y) continue // unchanged — skip
    x0.push(sx)
    y0.push(sy)
    dx.push(target.x - sx)
    dy.push(target.y - sy)
    out.push({ id: target.id, x: sx, y: sy })
  }

  return (t: number) => {
    for (let i = 0; i < out.length; i++) {
      out[i].x = x0[i] + dx[i] * t
      out[i].y = y0[i] + dy[i] * t
    }
    return out
  }
}

/**
 * Interpolate the camera viewport (pan + zoom) from one view to another — feed the result to
 * GraphState.updateViewport to animate "fit to selection", "zoom to node", recenter, etc.
 *
 * x/y pan linearly. Zoom interpolates **geometrically** (`from.zoom * (to.zoom / from.zoom) ** t`) rather
 * than linearly: zoom is a multiplicative scale, so equal-ratio steps read as uniform speed — a linear
 * ramp would feel like it races at low zoom and crawls at high zoom. This is the one channel that isn't
 * linear in `t`; easing still composes (it just reshapes `t`). The mapping is monotonic, so 0 -> from and
 * 1 -> to exactly.
 *
 * The returned object is reused across calls — read it synchronously; don't retain it.
 */
export const interpolateViewport = (from: Viewport, to: Viewport): ((t: number) => Viewport) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  // Geometric zoom; non-positive starts fall back to linear.
  const logZoomRatio = from.zoom > 0 && to.zoom > 0 ? Math.log(to.zoom / from.zoom) : 0
  const dZoom = to.zoom - from.zoom
  const out: Viewport = { x: from.x, y: from.y, zoom: from.zoom }

  return (t: number) => {
    out.x = from.x + dx * t
    out.y = from.y + dy * t
    out.zoom = logZoomRatio !== 0 ? from.zoom * Math.exp(logZoomRatio * t) : from.zoom + dZoom * t
    return out
  }
}
