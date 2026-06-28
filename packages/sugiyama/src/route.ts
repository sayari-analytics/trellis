import type { Edge, EdgeRef, PathPoint, PathSegment } from '@sayari/trellis'
import { orthogonalPath, routeOrthogonal, smoothPath } from '@sayari/trellis'
import type { LayeredGraph } from './layered'
import type { Orientation } from './coordinate'
import { edgeSource, edgeTarget, type SugiyamaState } from './state'

export type BackEdgeRouting = 'loop' | 'route' | 'hide'
export type FanRoutingOptions = {
  minDegree?: number
  trunkOffset?: number
  stubSpacing?: number
  maxTrunksPerNode?: number
}
export type CorridorOptions = {
  enabled?: boolean
  padding?: number
  trackSpacing?: number
}
export type Route =
  | { type: 'straight'; backEdges?: BackEdgeRouting }
  | { type: 'spline'; smoothing?: number; backEdges?: BackEdgeRouting }
  | {
      type: 'orthogonal'
      mode?: 'bus' | 'control-points'
      radius?: number
      spacing?: number
      fanRouting?: false | FanRoutingOptions
      corridors?: false | CorridorOptions
      backEdges?: BackEdgeRouting
    }

export type EdgeRouteLayout = {
  reversed: boolean
  back: boolean
  hidden: boolean
  loop: boolean
  points: PathPoint[]
  path?: PathSegment[]
  source: PathPoint
  target: PathPoint
}

export type EdgeDecoration = Partial<Pick<Edge, 'label' | 'style' | 'width'>>

export type RouteOptions = {
  route: Route
  orientation: Orientation
  decorateEdge?: (edge: Readonly<Edge>, layout: EdgeRouteLayout) => EdgeDecoration | undefined
}

export type RouteMetrics = {
  segmentCount: number
  controlPointCount: number
  edgeInk: number
  fanTrunkCount: number
  fanRoutedEdgeCount: number
  corridorTrackCount: number
}

export type RoutedEdge = {
  ref: EdgeRef
  width: number
  style: number
  label?: string
  path?: PathSegment[]
}

const BACK_EDGE_LOOP_MARGIN = 12

type FanGroup = {
  node: number
  direction: 'incoming' | 'outgoing'
  edgeRefs: EdgeRef[]
  neighborRefs: number[]
  ranks: [number, number]
}

const pathLength = (source: PathPoint, target: PathPoint, path?: PathSegment[]) => {
  if (path === undefined) return Math.hypot(target.x - source.x, target.y - source.y)
  let total = 0
  for (const segment of path) {
    if (segment.type === 'line') {
      total += Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y)
      continue
    }
    let previous = segment.from
    for (let step = 1; step <= 8; step++) {
      const t = step / 8
      const u = 1 - t
      const point = {
        x: u * u * segment.from.x + 2 * u * t * segment.control.x + t * t * segment.to.x,
        y: u * u * segment.from.y + 2 * u * t * segment.control.y + t * t * segment.to.y
      }
      total += Math.hypot(point.x - previous.x, point.y - previous.y)
      previous = point
    }
  }
  return total
}

const detectFanGroups = (
  layered: LayeredGraph,
  state: SugiyamaState,
  edgeLayouts: (EdgeRouteLayout | undefined)[],
  options: FanRoutingOptions
): FanGroup[] => {
  const minDegree = options.minDegree ?? 8
  const maxTrunksPerNode = options.maxTrunksPerNode ?? 2
  const outgoing: { edgeRefs: EdgeRef[]; neighborRefs: number[]; ranks: [number, number] }[] = []
  const incoming: { edgeRefs: EdgeRef[]; neighborRefs: number[]; ranks: [number, number] }[] = []

  for (const edgeRef of state.graphState.edges()) {
    const layout = edgeLayouts[edgeRef]
    if (layout === undefined || layout.hidden || layout.loop) continue
    const chain = state.routeNodeRefs[edgeRef]
    if (chain === undefined || chain.length !== 2) continue
    const sourceRef = state.reversed[edgeRef] ? chain[1] : chain[0]
    const targetRef = state.reversed[edgeRef] ? chain[0] : chain[1]
    const source = layered.nodeByRef[sourceRef]
    const target = layered.nodeByRef[targetRef]
    if (source === undefined || target === undefined || source.dummy || target.dummy) continue
    if (Math.abs(target.rank - source.rank) !== 1) continue

    const out = outgoing[sourceRef]
    if (out === undefined) outgoing[sourceRef] = { edgeRefs: [edgeRef], neighborRefs: [targetRef], ranks: [source.rank, target.rank] }
    else {
      out.edgeRefs.push(edgeRef)
      out.neighborRefs.push(targetRef)
    }

    const inc = incoming[targetRef]
    if (inc === undefined) incoming[targetRef] = { edgeRefs: [edgeRef], neighborRefs: [sourceRef], ranks: [source.rank, target.rank] }
    else {
      inc.edgeRefs.push(edgeRef)
      inc.neighborRefs.push(sourceRef)
    }
  }

  const candidates: FanGroup[] = []
  for (let node = 0; node < outgoing.length; node++) {
    const group = outgoing[node]
    if (group !== undefined && group.edgeRefs.length >= minDegree)
      candidates.push({ node, direction: 'outgoing', edgeRefs: group.edgeRefs, neighborRefs: group.neighborRefs, ranks: group.ranks })
  }
  for (let node = 0; node < incoming.length; node++) {
    const group = incoming[node]
    if (group !== undefined && group.edgeRefs.length >= minDegree)
      candidates.push({ node, direction: 'incoming', edgeRefs: group.edgeRefs, neighborRefs: group.neighborRefs, ranks: group.ranks })
  }

  candidates.sort((a, b) => b.edgeRefs.length - a.edgeRefs.length || a.node - b.node || a.direction.localeCompare(b.direction))
  const selectedEdges: boolean[] = []
  const trunksByNode: number[] = []
  const selected: FanGroup[] = []
  for (const candidate of candidates) {
    if ((trunksByNode[candidate.node] ?? 0) >= maxTrunksPerNode) continue
    let overlaps = false
    for (const edgeRef of candidate.edgeRefs) {
      if (selectedEdges[edgeRef]) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue
    for (const edgeRef of candidate.edgeRefs) selectedEdges[edgeRef] = true
    trunksByNode[candidate.node] = (trunksByNode[candidate.node] ?? 0) + 1
    selected.push(candidate)
  }
  return selected
}

const fanPath = (
  source: PathPoint,
  target: PathPoint,
  trunk: number,
  orientation: Orientation,
  radius: number
): PathSegment[] | undefined => {
  const verticalFlow = orientation === 'top' || orientation === 'bottom'
  const points = verticalFlow
    ? [source, { x: source.x, y: trunk }, { x: target.x, y: trunk }, target]
    : [source, { x: trunk, y: source.y }, { x: trunk, y: target.y }, target]
  return orthogonalPath(points, radius)
}

const laneOffset = (index: number, count: number, spacing: number, maxSpread = 24) => {
  if (count <= 1 || spacing <= 0) return 0
  const spread = (count - 1) * spacing
  const scale = spread > maxSpread ? maxSpread / spread : 1
  return (index - (count - 1) / 2) * spacing * scale
}

const portPoint = (point: PathPoint, offset: number, verticalFlow: boolean): PathPoint =>
  verticalFlow ? { x: point.x + offset, y: point.y } : { x: point.x, y: point.y + offset }

const routeFanGroups = (
  layered: LayeredGraph,
  groups: FanGroup[],
  edgeLayouts: (EdgeRouteLayout | undefined)[],
  options: FanRoutingOptions,
  corridors: false | CorridorOptions | undefined,
  orientation: Orientation,
  radius: number
) => {
  const routed: boolean[] = []
  const trunkOffset = options.trunkOffset ?? 32
  const laneSpacing = options.stubSpacing ?? 1.5
  const verticalFlow = orientation === 'top' || orientation === 'bottom'
  const corridorEnabled = corridors !== false && corridors?.enabled !== false
  const corridorTrackSpacing = corridors === false ? 12 : corridors?.trackSpacing ?? 12
  const corridorPadding = corridors === false ? 8 : corridors?.padding ?? 8
  const corridorTrunks = new Map<FanGroup, number>()
  let corridorTrackCount = 0

  if (corridorEnabled) {
    const rankBounds: ({ min: number; max: number; center: number } | undefined)[] = []
    for (let rank = 0; rank < layered.layers.length; rank++) {
      let min = Infinity
      let max = -Infinity
      let count = 0
      for (const node of layered.layers[rank]) {
        const axis = verticalFlow ? node.y : node.x
        const half = Math.max(1, node.breadth / 2)
        min = Math.min(min, axis - half)
        max = Math.max(max, axis + half)
        count += 1
      }
      if (count > 0) rankBounds[rank] = { min, max, center: (min + max) / 2 }
    }

    const groupsByRankPair = new Map<string, FanGroup[]>()
    for (const group of groups) {
      const key = `${Math.min(group.ranks[0], group.ranks[1])}:${Math.max(group.ranks[0], group.ranks[1])}`
      const existing = groupsByRankPair.get(key)
      if (existing === undefined) groupsByRankPair.set(key, [group])
      else existing.push(group)
    }
    for (const groupList of groupsByRankPair.values()) {
      const runs: { group: FanGroup; lo: number; hi: number; base: number }[] = []
      for (const group of groupList) {
        const sourceBounds = rankBounds[group.ranks[0]]
        const targetBounds = rankBounds[group.ranks[1]]
        if (sourceBounds === undefined || targetBounds === undefined) continue
        const sourceBeforeTarget = sourceBounds.center < targetBounds.center
        const from = sourceBeforeTarget ? sourceBounds.max + corridorPadding : targetBounds.max + corridorPadding
        const to = sourceBeforeTarget ? targetBounds.min - corridorPadding : sourceBounds.min - corridorPadding
        const base = from < to ? (from + to) / 2 : (sourceBounds.center + targetBounds.center) / 2
        let lo = Infinity
        let hi = -Infinity
        for (const edgeRef of group.edgeRefs) {
          const layout = edgeLayouts[edgeRef]
          if (layout === undefined) continue
          const a = verticalFlow ? layout.source.x : layout.source.y
          const b = verticalFlow ? layout.target.x : layout.target.y
          lo = Math.min(lo, a, b)
          hi = Math.max(hi, a, b)
        }
        if (lo !== Infinity) runs.push({ group, lo, hi, base })
      }
      runs.sort((a, b) => a.lo - b.lo || a.hi - b.hi)
      const trackEnd: number[] = []
      const trackOf = new Map<FanGroup, number>()
      for (const run of runs) {
        let track = -1
        for (let index = 0; index < trackEnd.length; index++) {
          if (trackEnd[index] <= run.lo) {
            track = index
            break
          }
        }
        if (track === -1) {
          track = trackEnd.length
          trackEnd.push(run.hi)
        } else {
          trackEnd[track] = run.hi
        }
        trackOf.set(run.group, track)
      }
      corridorTrackCount += trackEnd.length
      for (const run of runs) {
        const track = trackOf.get(run.group) ?? 0
        corridorTrunks.set(run.group, run.base + (track - (trackEnd.length - 1) / 2) * corridorTrackSpacing)
      }
    }
  }

  for (const group of groups) {
    const node = layered.nodeByRef[group.node]
    if (node === undefined) continue
    let neighborAxisSum = 0
    let neighborCount = 0
    for (const neighborRef of group.neighborRefs) {
      const neighbor = layered.nodeByRef[neighborRef]
      if (neighbor === undefined) continue
      neighborAxisSum += verticalFlow ? neighbor.y : neighbor.x
      neighborCount += 1
    }
    if (neighborCount === 0) continue
    const nodeAxis = verticalFlow ? node.y : node.x
    const neighborAxis = neighborAxisSum / neighborCount
    const sign = Math.sign(neighborAxis - nodeAxis) || 1
    const trunk = corridorTrunks.get(group) ?? nodeAxis + sign * trunkOffset

    const indexes = group.edgeRefs.map((edgeRef, index) => ({ edgeRef, neighborRef: group.neighborRefs[index] }))
    indexes.sort((a, b) => (layered.nodeByRef[a.neighborRef]?.order ?? 0) - (layered.nodeByRef[b.neighborRef]?.order ?? 0))
    for (let index = 0; index < indexes.length; index++) {
      const { edgeRef } = indexes[index]
      const layout = edgeLayouts[edgeRef]
      if (layout === undefined) continue
      const lane = trunk + laneOffset(index, indexes.length, laneSpacing)
      const offset = laneOffset(index, indexes.length, laneSpacing, 16)
      const source = portPoint(layout.source, offset, verticalFlow)
      const target = portPoint(layout.target, offset, verticalFlow)
      const path = fanPath(source, target, lane, orientation, radius)
      if (path === undefined) continue
      layout.path = path
      layout.points = verticalFlow
        ? [source, { x: source.x, y: lane }, { x: target.x, y: lane }, target]
        : [source, { x: lane, y: source.y }, { x: lane, y: target.y }, target]
      layout.source = source
      layout.target = target
      routed[edgeRef] = true
    }
  }
  return { routed, corridorTrackCount }
}

// Phase 5: route dummy chains as Chaikin-smoothed splines or bus-style orthogonal paths.
export const routeEdges = (layered: LayeredGraph, state: SugiyamaState, options: RouteOptions): { edges: RoutedEdge[] } & RouteMetrics => {
  const edgeLayouts: (EdgeRouteLayout | undefined)[] = []
  const backEdges = options.route.backEdges ?? 'loop'
  const graphState = state.graphState

  for (const bundle of layered.confluentBundles) {
    let x = 0
    let y = 0
    let count = 0
    for (const ref of bundle.sourceRefs) {
      const node = layered.nodeByRef[ref]
      if (node === undefined) continue
      x += node.x
      y += node.y
      count += 1
    }
    for (const ref of bundle.targetRefs) {
      const node = layered.nodeByRef[ref]
      if (node === undefined) continue
      x += node.x
      y += node.y
      count += 1
    }
    bundle.center = count === 0 ? undefined : { x: x / count, y: y / count }
  }

  for (const edgeRef of graphState.edges()) {
    const sourceRef = state.reversed[edgeRef] ? edgeTarget(state, edgeRef) : edgeSource(state, edgeRef)
    const targetRef = state.reversed[edgeRef] ? edgeSource(state, edgeRef) : edgeTarget(state, edgeRef)
    const source = layered.nodeByRef[sourceRef]
    const target = layered.nodeByRef[targetRef]
    if (source === undefined || target === undefined) continue
    const hidden = state.feedback[edgeRef] && backEdges === 'hide'
    let points: PathPoint[]

    if (hidden) {
      points = [
        { x: source.x, y: source.y },
        { x: target.x, y: target.y }
      ]
    } else if (state.feedback[edgeRef]) {
      if (backEdges === 'loop') {
        const sourceStrokeWidth = graphState.nodeStyleDefs[graphState.nodeStyle(sourceRef)]?.strokeWidth ?? 0
        const loopOffset = graphState.nodeRadius(sourceRef) + sourceStrokeWidth + BACK_EDGE_LOOP_MARGIN
        switch (options.orientation) {
          case 'left':
            points = [
              { x: source.x, y: source.y },
              { x: source.x + loopOffset, y: source.y },
              { x: source.x + loopOffset, y: target.y },
              { x: target.x, y: target.y }
            ]
            break
          case 'right':
            points = [
              { x: source.x, y: source.y },
              { x: source.x - loopOffset, y: source.y },
              { x: source.x - loopOffset, y: target.y },
              { x: target.x, y: target.y }
            ]
            break
          case 'bottom':
            points = [
              { x: source.x, y: source.y },
              { x: source.x, y: source.y + loopOffset },
              { x: target.x, y: source.y + loopOffset },
              { x: target.x, y: target.y }
            ]
            break
          case 'top':
          default:
            points = [
              { x: source.x, y: source.y },
              { x: source.x, y: source.y - loopOffset },
              { x: target.x, y: source.y - loopOffset },
              { x: target.x, y: target.y }
            ]
            break
        }
      } else {
        points = [
          { x: source.x, y: source.y },
          { x: target.x, y: target.y }
        ]
      }
    } else {
      const routeNodes = state.routeNodeRefs[edgeRef]
      const chain = routeNodes?.length > 0 ? routeNodes : [edgeSource(state, edgeRef), edgeTarget(state, edgeRef)]
      const forwardPoints: PathPoint[] = []
      const routeBundles = layered.confluentRouteBundles[edgeRef]
      for (let index = 0; index < chain.length; index++) {
        const node = layered.nodeByRef[chain[index]]!
        forwardPoints.push({ x: node.x, y: node.y })
        const center = routeBundles?.[index]?.center
        if (center !== undefined && index < chain.length - 1) forwardPoints.push(center)
      }
      points = []
      if (state.reversed[edgeRef]) {
        for (let index = forwardPoints.length - 1; index >= 0; index--) points.push(forwardPoints[index])
      } else {
        points = forwardPoints
      }
    }

    const uniquePoints: PathPoint[] = []
    for (const point of points) {
      const last = uniquePoints[uniquePoints.length - 1]
      if (last === undefined || Math.abs(last.x - point.x) > 1e-6 || Math.abs(last.y - point.y) > 1e-6) uniquePoints.push(point)
    }
    points = uniquePoints

    if (!hidden && options.route.type === 'spline') {
      for (let round = 0; round < (options.route.smoothing ?? 0) && points.length >= 3; round++) {
        const smoothed: PathPoint[] = [points[0]]
        for (let index = 0; index < points.length - 1; index++) {
          const a = points[index]
          const b = points[index + 1]
          smoothed.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
          smoothed.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
        }
        smoothed.push(points[points.length - 1])
        points = smoothed
      }
    }

    const loop = state.feedback[edgeRef] && backEdges === 'loop'
    let path: PathSegment[] | undefined

    if (!hidden) {
      switch (options.route.type) {
        case 'straight':
          path = loop ? orthogonalPath(points, 0) : undefined
          break
        case 'spline':
          path = smoothPath(points)
          break
        case 'orthogonal':
          if (points.length > 2) path = orthogonalPath(points, options.route.radius ?? 12)
          break
        default:
          break
      }
    }
    edgeLayouts[edgeRef] = {
      reversed: state.reversed[edgeRef],
      back: state.reversed[edgeRef] || state.feedback[edgeRef],
      hidden,
      loop,
      points,
      path,
      source: points[0],
      target: points[points.length - 1]
    }
  }

  const fanGroups =
    options.route.type === 'orthogonal' && options.route.fanRouting !== false && options.route.fanRouting !== undefined
      ? detectFanGroups(layered, state, edgeLayouts, options.route.fanRouting)
      : []
  const fanRouteResult =
    options.route.type === 'orthogonal'
      ? routeFanGroups(
          layered,
          fanGroups,
          edgeLayouts,
          options.route.fanRouting || {},
          options.route.corridors,
          options.orientation,
          options.route.radius ?? 12
        )
      : { routed: [], corridorTrackCount: 0 }

  if (options.route.type === 'orthogonal' && (options.route.mode ?? 'bus') === 'bus') {
    let spacing = options.route.spacing
    if (spacing === undefined) {
      let maxWidth = 0
      for (const edgeRef of graphState.edges()) maxWidth = Math.max(maxWidth, graphState.edgeWidth(edgeRef))
      spacing = maxWidth + 2
    }

    const routeInput: { id: EdgeRef; source: PathPoint; target: PathPoint }[] = []
    for (const edgeRef of graphState.edges()) {
      const layout = edgeLayouts[edgeRef]
      if (
        layout !== undefined &&
        !layout.hidden &&
        !layout.loop &&
        !fanRouteResult.routed[edgeRef] &&
        (layered.confluentRouteBundles[edgeRef] === undefined || layered.confluentRouteBundles[edgeRef].length === 0)
      )
        routeInput.push({ id: edgeRef, source: layout.source, target: layout.target })
    }
    const routed = routeOrthogonal(routeInput, {
      flow: options.orientation === 'top' || options.orientation === 'bottom' ? 'vertical' : 'horizontal',
      radius: options.route.radius ?? 12,
      spacing
    })
    for (const [id, path] of routed) {
      const layout = edgeLayouts[id as EdgeRef]
      if (layout !== undefined && path !== undefined) layout.path = path
    }
  }

  let segmentCount = 0
  let controlPointCount = 0
  let edgeInk = 0
  const fanTrunkCount = fanGroups.length
  let fanRoutedEdgeCount = 0
  for (const group of fanGroups) fanRoutedEdgeCount += group.edgeRefs.length
  const corridorTrackCount = fanRouteResult.corridorTrackCount
  const edges: RoutedEdge[] = []
  for (const edgeRef of graphState.edges()) {
    const layout = edgeLayouts[edgeRef]
    if (layout === undefined) continue
    const base = {
      id: graphState.edgeId(edgeRef),
      source: graphState.nodeId(graphState.edgeSource(edgeRef)),
      target: graphState.nodeId(graphState.edgeTarget(edgeRef)),
      label: graphState.edgeLabel(edgeRef),
      style: graphState.edgeStyle(edgeRef),
      width: layout.hidden ? 0 : graphState.edgeWidth(edgeRef),
      path: layout.path
    } satisfies Edge
    if (layout?.path !== undefined) {
      segmentCount += layout.path.length
      for (const segment of layout.path) {
        if (segment.type === 'quad') controlPointCount += 1
      }
    }
    edgeInk += pathLength(layout.source, layout.target, layout.path)
    const decoration = options.decorateEdge?.(base, layout)
    if (decoration === undefined) {
      edges.push({ ref: edgeRef, width: base.width, style: base.style, label: base.label, path: base.path })
      continue
    }
    edges.push({
      ref: edgeRef,
      label: 'label' in decoration ? decoration.label : base.label,
      style: decoration.style ?? base.style,
      width: decoration.width ?? base.width,
      path: base.path
    })
  }

  return { edges, segmentCount, controlPointCount, edgeInk, fanTrunkCount, fanRoutedEdgeCount, corridorTrackCount }
}
