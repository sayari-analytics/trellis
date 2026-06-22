/**
 * Edge paths: the expressive, single representation of an edge's shape, shared by the renderer and any
 * layout/consumer. An edge's `path` is a list of segments, each a straight LINE or a QUADRATIC Bézier,
 * chained tip-to-tail from the source to the target. This one representation captures every shape we draw:
 *   - straight        -> `path` omitted (the renderer draws source->target directly)
 *   - smooth curve     -> a chain of `quad` segments (see `smoothPath`)
 *   - orthogonal       -> `line` segments with optional `quad` fillets at the corners (see `orthogonalPath`);
 *                         radius 0 gives true right angles, radius > 0 a minimal rounded transition
 *
 * Quadratics (not cubics) are deliberate: their exact point-distance has a closed form, so the renderer can
 * stroke them analytically in the fragment shader — vector-smooth at any zoom, no pre-flattening / facets.
 *
 * This file is the single source of truth for the distance functions: `distanceToSegment` (CPU, for
 * hit-testing / tests) and `SEGMENT_SDF_GLSL` (GPU, for segmentEdgeProgram) implement the same math.
 */

export type PathPoint = { x: number; y: number }
export type PathSegment =
  | { type: 'line'; from: PathPoint; to: PathPoint }
  | { type: 'quad'; from: PathPoint; control: PathPoint; to: PathPoint }

const mid = (a: PathPoint, b: PathPoint): PathPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

// a point `radius` away from `corner` toward `toward` (clamped so flanks never cross on short segments)
const flank = (corner: PathPoint, toward: PathPoint, radius: number): PathPoint => {
  const dx = toward.x - corner.x
  const dy = toward.y - corner.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return corner
  const r = Math.min(radius, len / 2)
  return { x: corner.x + (dx / len) * r, y: corner.y + (dy / len) * r }
}

/**
 * Smooth quadratic spline through `points` (e.g. [source, ...waypoints, target]). The endpoints are
 * interpolated exactly; interior points become Bézier controls and the curve passes through the midpoints
 * between them, giving a C1 (smooth, tangent-continuous) chain with no overshoot.
 */
export const smoothPath = (points: PathPoint[]): PathSegment[] => {
  if (points.length < 2) return []
  if (points.length === 2) return [{ type: 'line', from: points[0], to: points[1] }]
  const segments: PathSegment[] = []
  let from = points[0]
  for (let i = 1; i < points.length - 1; i++) {
    const to = i === points.length - 2 ? points[points.length - 1] : mid(points[i], points[i + 1])
    segments.push({ type: 'quad', from, control: points[i], to })
    from = to
  }
  return segments
}

/**
 * Orthogonal (axis-aligned) path through `points` (the elbow anchors, e.g. [source, corner, corner, target]).
 * `radius` 0 -> straight `line` segments meeting at true right angles; `radius` > 0 -> straight runs with a
 * short `quad` fillet at each corner (a minimal rounded transition of about that radius).
 */
export const orthogonalPath = (points: PathPoint[], radius = 0): PathSegment[] => {
  if (points.length < 2) return []
  if (radius <= 0) {
    const segments: PathSegment[] = []
    for (let i = 0; i < points.length - 1; i++) segments.push({ type: 'line', from: points[i], to: points[i + 1] })
    return segments
  }
  const segments: PathSegment[] = []
  let from = points[0]
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i]
    const fin = flank(corner, points[i - 1], radius)
    const fout = flank(corner, points[i + 1], radius)
    segments.push({ type: 'line', from, to: fin })
    segments.push({ type: 'quad', from: fin, control: corner, to: fout })
    from = fout
  }
  segments.push({ type: 'line', from, to: points[points.length - 1] })
  return segments
}

export type OrthogonalRouteEdge = { id: string | number; source: PathPoint; target: PathPoint }
export type OrthogonalRouteOptions = {
  flow?: 'vertical' | 'horizontal' // layout flow axis: 'vertical' (top/bottom anchor) puts the channel run horizontal
  radius?: number // corner fillet (0 = right angles)
  spacing?: number // gap between adjacent tracks within a channel
}

/**
 * Batch orthogonal router with channel separation. Builds a mid-channel elbow per edge (source -> down to
 * the channel between the two endpoints -> across -> into target), then separates elbows whose channel runs
 * would otherwise stack on top of each other onto distinct parallel tracks — the de-cluttering dagre / ELK
 * do. Unlike the per-edge `orthogonalPath`, this needs the whole edge set at once: the offset of one run
 * depends on which others share its channel.
 *
 * Only the channel run (the interior, between-corners segment) is offset — it moves freely because both its
 * corners move with it, and the node-anchored stubs just change length. Returns each edge's path, or
 * `undefined` for an edge whose endpoints share a column/row (a straight line, no channel run).
 *
 * The channel axis follows `flow`: 'vertical' (default) -> horizontal runs grouped by their y, offset in y;
 * 'horizontal' -> the transpose. `radius` is the corner fillet. `spacing` is the inter-track gap.
 */
export const routeOrthogonal = (
  edges: OrthogonalRouteEdge[],
  options: OrthogonalRouteOptions = {}
): Map<string | number, PathSegment[] | undefined> => {
  const flow = options.flow ?? 'vertical'
  const radius = options.radius ?? 0
  const spacing = options.spacing ?? 6

  const EPS = 1e-3
  const result = new Map<string | number, PathSegment[] | undefined>()

  // a channel run: fixed on the `channel` axis, spanning [lo, hi] on the other. (vertical flow -> the run is
  // horizontal at y = channel, spanning x in [lo, hi]; horizontal flow is the transpose.)
  type Run = { id: string | number; source: PathPoint; target: PathPoint; channel: number; lo: number; hi: number }
  const channels = new Map<number, Run[]>()

  for (const { id, source, target } of edges) {
    const along = flow === 'vertical' ? Math.abs(source.x - target.x) : Math.abs(source.y - target.y)
    if (along < EPS) {
      result.set(id, undefined) // endpoints share a column/row -> straight, no channel run
      continue
    }
    const channel = flow === 'vertical' ? (source.y + target.y) / 2 : (source.x + target.x) / 2
    const a = flow === 'vertical' ? source.x : source.y
    const b = flow === 'vertical' ? target.x : target.y
    const run: Run = { id, source, target, channel, lo: Math.min(a, b), hi: Math.max(a, b) }
    const key = Math.round(channel * 2) / 2 // quantize to absorb float noise; equal-layer-pair runs collapse
    const group = channels.get(key)
    if (group === undefined) channels.set(key, [run])
    else group.push(run)
  }

  for (const group of channels.values()) {
    // assign tracks by interval overlap (greedy interval-graph coloring): a run reuses the lowest track whose
    // previous run ends (+ a gap) before this one starts, else opens a new track.
    group.sort((a, b) => a.lo - b.lo)
    const trackEnd: number[] = []
    const trackOf = new Map<Run, number>()
    for (const run of group) {
      let track = trackEnd.findIndex((end) => end + spacing <= run.lo)
      if (track === -1) {
        track = trackEnd.length
        trackEnd.push(run.hi)
      } else {
        trackEnd[track] = run.hi
      }
      trackOf.set(run, track)
    }
    const used = trackEnd.length
    for (const run of group) {
      const at = run.channel + (trackOf.get(run)! - (used - 1) / 2) * spacing // centered on the original channel
      const anchors: PathPoint[] =
        flow === 'vertical'
          ? [run.source, { x: run.source.x, y: at }, { x: run.target.x, y: at }, run.target]
          : [run.source, { x: at, y: run.source.y }, { x: at, y: run.target.y }, run.target]
      result.set(run.id, orthogonalPath(anchors, radius))
    }
  }

  return result
}

// --- distance functions (CPU mirror of SEGMENT_SDF_GLSL) ---

const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by

const distanceToLine = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const qx = ax + t * dx
  const qy = ay + t * dy
  return Math.hypot(px - qx, py - qy)
}

// exact distance from a point to a quadratic Bézier (A=from, B=control, C=to). Closed-form via the cubic
// solved per Inigo Quilez; falls back to the chord when the control is collinear (degenerate quadratic).
const distanceToQuad = (px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => {
  const aX = bx - ax
  const aY = by - ay
  const bX = ax - 2 * bx + cx
  const bY = ay - 2 * by + cy
  const bb = bX * bX + bY * bY
  if (bb < 1e-6) return distanceToLine(px, py, ax, ay, cx, cy) // control collinear -> straight
  const cX = aX * 2
  const cY = aY * 2
  const dX = ax - px
  const dY = ay - py
  const kk = 1 / bb
  const kx = kk * dot(aX, aY, bX, bY)
  const ky = (kk * (2 * dot(aX, aY, aX, aY) + dot(dX, dY, bX, bY))) / 3
  const kz = kk * dot(dX, dY, aX, aY)
  const p = ky - kx * kx
  const p3 = p * p * p
  const q = kx * (2 * kx * kx - 3 * ky) + kz
  const h = q * q + 4 * p3
  const at = (t: number) => {
    const ex = dX + (cX + bX * t) * t
    const ey = dY + (cY + bY * t) * t
    return ex * ex + ey * ey
  }
  if (h >= 0) {
    const hs = Math.sqrt(h)
    const x1 = (hs - q) / 2
    const x2 = (-hs - q) / 2
    const u = Math.sign(x1) * Math.cbrt(Math.abs(x1)) + Math.sign(x2) * Math.cbrt(Math.abs(x2))
    const t = Math.max(0, Math.min(1, u - kx))
    return Math.sqrt(at(t))
  }
  const z = Math.sqrt(-p)
  const v = Math.acos(q / (p * z * 2)) / 3
  const m = Math.cos(v)
  const n = Math.sin(v) * 1.732050808
  const t1 = Math.max(0, Math.min(1, (m + m) * z - kx))
  const t2 = Math.max(0, Math.min(1, (-n - m) * z - kx))
  return Math.sqrt(Math.min(at(t1), at(t2)))
}

// distance from a point to a path segment (the function hit-testing uses)
export const distanceToSegment = (point: PathPoint, segment: PathSegment): number =>
  segment.type === 'line'
    ? distanceToLine(point.x, point.y, segment.from.x, segment.from.y, segment.to.x, segment.to.y)
    : distanceToQuad(point.x, point.y, segment.from.x, segment.from.y, segment.control.x, segment.control.y, segment.to.x, segment.to.y)

/**
 * GLSL port. `sdLine(p, a, b)` and `sdQuad(p, a, ctrl, c)` return the exact distance from `p` to the segment,
 * matching the CPU functions above. Used by segmentEdgeProgram to stroke each segment analytically.
 */
export const SEGMENT_SDF_GLSL = /* glsl */ `
float sdLine(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float l2 = dot(ba, ba);
  float t = l2 == 0.0 ? 0.0 : clamp(dot(pa, ba) / l2, 0.0, 1.0);
  return length(pa - ba * t);
}
float sdQuad(vec2 pos, vec2 A, vec2 B, vec2 C) {
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  if (dot(b, b) < 1e-6) return sdLine(pos, A, C); // control collinear -> straight
  vec2 c = a * 2.0;
  vec2 d = A - pos;
  float kk = 1.0 / dot(b, b);
  float kx = kk * dot(a, b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);
  float p = ky - kx * kx;
  float p3 = p * p * p;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float h = q * q + 4.0 * p3;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    vec2 e = d + (c + b * t) * t;
    return length(e);
  }
  float z = sqrt(-p);
  float v = acos(q / (p * z * 2.0)) / 3.0;
  float m = cos(v);
  float n = sin(v) * 1.732050808;
  vec2 t = clamp(vec2(m + m, -n - m) * z - kx, 0.0, 1.0);
  float d1 = dot(d + (c + b * t.x) * t.x, d + (c + b * t.x) * t.x);
  float d2 = dot(d + (c + b * t.y) * t.y, d + (c + b * t.y) * t.y);
  return sqrt(min(d1, d2));
}`
