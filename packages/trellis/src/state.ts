import type { PathSegment } from './path'

export type Node = {
  id: string | number
  x: number
  y: number
  radius: number
  label?: string
  style: number // NodeStyle index ptr
}
// Style colors are RGB hex numbers: 0xRRGGBB. Use the matching optional opacity field for transparency.
export type NodeStyle = {
  fillColor: number
  fillColorOpacity?: number
  strokeWidth?: number
  strokeColor?: number
  strokeColorOpacity?: number
  label?: NodeLabelStyle
  icon?: NodeIcon
}
export type NodeLabelStyle = {
  fontSize: number
  textColor: number
  textColorOpacity?: number
  textPosition?: 'bottom' | 'left' | 'top' | 'right'
  textAnchor?: 'start' | 'middle' | 'end'
  textAngle?: number // radians; rotates around textAnchor at the textPosition placement point
  textOutlineWidth?: number
  textOutlineColor?: number
  textOutlineColorOpacity?: number
}
export type NodeIcon = {
  type: 'textIcon'
  content: string
  fontSize: number
  color: number
  colorOpacity?: number
  strokeWidth?: number
  strokeColor?: number
  strokeColorOpacity?: number
}

export type Edge = {
  id: string | number
  source: string | number
  target: string | number
  width: number
  label?: string
  style: number // EdgeStyle index ptr
  // optional explicit shape: a chain of line / quadratic segments from source to target (e.g. from the
  // sugiyama layout). When present the renderer strokes it analytically (any zoom); omit it for a straight
  // source->target line. See path.ts (smoothPath / orthogonalPath build these).
  path?: PathSegment[]
}
export type EdgeStyle = {
  fillColor: number
  fillColorOpacity?: number
  arrow?: 'forward' | 'reverse' | 'both' | 'none'
  label?: EdgeLabelStyle
}
export type EdgeLabelStyle = {
  fontSize: number
  textColor: number
  textColorOpacity?: number
  textOutlineWidth?: number
  textOutlineColor?: number
  textOutlineColorOpacity?: number
}

/**
 * Annotations: lightweight shapes drawn beneath the graph (e.g. a bounding box around a multiselect
 * drag). Unlike nodes/edges they aren't slot-allocated — the set is small and transient, so it's
 * replaced wholesale via setAnnotations and re-uploaded as a single instance buffer. Positions are in
 * world units, and x/y is the shape *center* for both types. Stroke is drawn inside the shape edge.
 * A future 'text' annotation type will extend this union.
 */
export type AnnotationStyle = {
  fillColor?: number // 0xRRGGBB; omitted => no fill
  fillColorOpacity?: number
  strokeColor?: number // omitted => no stroke
  strokeColorOpacity?: number
  strokeWidth?: number // world units; defaults to 0
}
export type CircleAnnotation = {
  type: 'circle'
  id?: Id // reserved for future hit-testing / partial updates; ignored by rendering
  x: number
  y: number
  radius: number
  style: AnnotationStyle
}
export type RectangleAnnotation = {
  type: 'rectangle'
  id?: Id
  x: number
  y: number
  width: number
  height: number
  style: AnnotationStyle
}
export type Annotation = CircleAnnotation | RectangleAnnotation

/**
 * Axis-aligned bounding box in world units, expressed as its four edges (+y is up in the renderer, so
 * `minY` is the bottom edge). Unambiguous about corner-vs-center and trivially convertible:
 *   width = maxX - minX, height = maxY - minY, center = ((minX + maxX) / 2, (minY + maxY) / 2).
 *
 * The shared currency for "how much space does this occupy" — the extent of a laid-out (sub)graph, a
 * selection, or the whole scene. Layouts can return it alongside their nodes/edges so consumers (e.g.
 * packing several components together, fitting the camera to content) don't have to recompute it from
 * node positions.
 */
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }
export type Graph = { nodes: Node[]; edges: Edge[] }
export type LayoutResult<Metrics = unknown> = {
  done: boolean
  metrics?: Metrics
}

export type GraphStateOptions = {
  minZoom?: number
  maxZoom?: number
  nodeStyles: NodeStyle[]
  edgeStyles: EdgeStyle[]
  sharedArrayBuffers?: boolean
}

export type Id = string | number
export type NodeRef = number & { readonly __nodeRef: unique symbol }
export type EdgeRef = number & { readonly __edgeRef: unique symbol }
type NodePositionUpdate = { id: Id; x: number; y: number } | { node: NodeRef; x: number; y: number }
type EdgePathUpdate = { id: Id; path?: PathSegment[] } | { edge: EdgeRef; path?: PathSegment[] }
type EdgeWidthUpdate = { id: Id; width: number } | { edge: EdgeRef; width: number }
type EdgeStyleUpdate = { id: Id; style: number } | { edge: EdgeRef; style: number }
type EdgeLabelUpdate = { id: Id; label: string } | { edge: EdgeRef; label: string }

/**
 * Dirty bitmask consumed by the renderer. Two kinds:
 *  - STRUCTURE bits: the slot count / capacity changed, so the GPU storage must be re-sized + fully
 *    re-uploaded (a grow re-allocates the columns).
 *  - value bits: existing slots changed in place, so only those need re-upload. Node positions carry a
 *    precise dirty *set* of slots (scattered drag / select / add / delete); the colder columns re-upload
 *    wholesale. Style-table changes also flag labels, since the raster label path bakes color/size.
 */
export const DIRTY_VIEWPORT = 1 << 0
const DIRTY_NODE_STRUCTURE = 1 << 1 // node capacity grew -> realloc + full node upload
export const DIRTY_NODE_POSITIONS = 1 << 2 // see dirtyNodePositions (precise slot set)
export const DIRTY_NODE_RADII = 1 << 3
export const DIRTY_NODE_STYLES = 1 << 4 // per-node style pointer
const DIRTY_NODE_LABELS = 1 << 5 // node label text / icon -> repack
export const DIRTY_NODE_STYLE_TABLE = 1 << 6 // node style definitions
const DIRTY_EDGE_STRUCTURE = 1 << 7 // edge capacity grew -> realloc + full edge upload
export const DIRTY_EDGES = 1 << 8 // edge endpoints (slots)
export const DIRTY_EDGE_WIDTHS = 1 << 9
export const DIRTY_EDGE_STYLES = 1 << 10 // per-edge style pointer
const DIRTY_EDGE_LABELS = 1 << 11 // edge label text -> repack
export const DIRTY_EDGE_STYLE_TABLE = 1 << 12 // edge style definitions
export const DIRTY_ANNOTATIONS = 1 << 13 // annotation set replaced (drawn from a plain array, not slots)
export const DIRTY_EDGE_PATH = 1 << 14 // per-edge explicit shape (line/quad segments) added/changed/removed

// labels (and node icons) repack when the text changes or the style table changes (the raster path bakes
// color/size). add/delete also flag the relevant *_LABELS bit, so this covers structural changes too.
export const DIRTY_LABEL_REPACK = DIRTY_NODE_LABELS | DIRTY_NODE_STYLE_TABLE | DIRTY_EDGE_LABELS | DIRTY_EDGE_STYLE_TABLE

/**
 * Entity (id-keyed) graph state over dense, GPU-shaped columnar storage. Each node/edge lives in a slot
 * (a fixed index into the columns); an id<->slot map gives the ergonomic id API while the renderer reads
 * the columns by slot. Deletion tombstones a slot (returned to a free list, reused by the next add — no
 * compaction), so slots are stable and edges/labels keep referring to the same indices. Tombstoned nodes
 * are hidden by a NaN position (which also hides anything anchored on them — labels, icon, incident-edge
 * endpoints); tombstoned edges collapse to a degenerate (0,0) endpoint pair.
 */
export class GraphState {
  readonly minZoom: number
  readonly maxZoom: number
  readonly sharedArrayBuffers: boolean
  readonly viewport = new Float32Array([0, 0, 1])
  readonly dirty = new Int32Array(1)
  // precise set of node slots whose position changed since the last frame (scattered-update friendly)
  readonly dirtyNodePositions = new Set<number>()

  // node columns (valid for slots [0, nodeSlotCount); length is the larger capacity)
  nodePositions: Float32Array = new Float32Array(0) // [x, y] per slot (hot)
  nodeRadii: Float32Array = new Float32Array(0) // [r] per slot (cold)
  nodeStylePointers = new Uint16Array(0) // style index per slot
  nodeLabels: (string | undefined)[] = [] // label per slot (undefined => no label / tombstone)
  nodeIds: Id[] = [] // slot -> id, so interaction (which picks by slot) can report node ids to consumers
  nodeSlotCount = 0 // high-water mark of allocated slots (live + tombstoned); the instanced draw count
  private nodeCapacity = 0 // allocated column length in slots
  private readonly nodeIdToSlot = new Map<Id, number>()
  private readonly nodeFreeSlots: number[] = [] // tombstoned slots, reused by the next addNodes
  private readonly nodeEdges: (Set<number> | undefined)[] = [] // slot -> incident edge slots (for cascade delete)

  // edge columns (valid for slots [0, edgeSlotCount))
  edgeEndpoints: Uint32Array = new Uint32Array(0) // [sourceSlot, targetSlot] per slot
  edgeWidths = new Float32Array(0) // width per slot
  edgeStylePointers = new Uint16Array(0) // style index per slot
  edgeLabels: (string | undefined)[] = []
  // slot -> explicit edge shape (line/quad segments), or undefined for a straight edge. Sparse (most edges
  // are straight); the renderer partitions shaped edges out and strokes their segments analytically.
  edgePath: (PathSegment[] | undefined)[] = []
  edgeSlotCount = 0
  private edgeCapacity = 0
  readonly edgeIds: Id[] = [] // slot -> id (cleans edgeIdToSlot on cascade delete; also lets picking report edge ids)
  private readonly edgeIdToSlot = new Map<Id, number>()
  private readonly edgeFreeSlots: number[] = []

  // style definition palettes (index = style pointer); a free list reuses indices freed by delete
  nodeStyleDefs: (NodeStyle | undefined)[]
  edgeStyleDefs: (EdgeStyle | undefined)[]
  private readonly nodeStyleFree: number[] = []
  private readonly edgeStyleFree: number[] = []

  annotations: Annotation[] = []

  constructor(options: GraphStateOptions) {
    if (options.sharedArrayBuffers === true && typeof SharedArrayBuffer === 'undefined') {
      throw new Error('GraphState sharedArrayBuffers requires SharedArrayBuffer support')
    }
    this.minZoom = options.minZoom ?? 0.01
    this.maxZoom = options.maxZoom ?? 4
    this.sharedArrayBuffers = options.sharedArrayBuffers ?? false
    this.nodeStyleDefs = [...options.nodeStyles]
    this.edgeStyleDefs = [...options.edgeStyles]
    this.dirty[0] |= DIRTY_NODE_STYLE_TABLE | DIRTY_EDGE_STYLE_TABLE
  }

  *nodes(): IterableIterator<NodeRef> {
    for (let slot = 0; slot < this.nodeSlotCount; slot++) {
      if (this.nodeIdToSlot.get(this.nodeIds[slot]) === slot) yield slot as NodeRef
    }
  }

  *edges(): IterableIterator<EdgeRef> {
    for (let slot = 0; slot < this.edgeSlotCount; slot++) {
      if (this.edgeIdToSlot.get(this.edgeIds[slot]) === slot) yield slot as EdgeRef
    }
  }

  *incidentEdges(node: NodeRef): IterableIterator<EdgeRef> {
    for (const edge of this.nodeEdges[node] ?? []) {
      if (this.edgeIdToSlot.get(this.edgeIds[edge]) === edge) yield edge as EdgeRef
    }
  }

  nodeId(node: NodeRef): Id {
    return this.nodeIds[node]
  }

  nodeX(node: NodeRef) {
    return this.nodePositions[node * 2]
  }

  nodeY(node: NodeRef) {
    return this.nodePositions[node * 2 + 1]
  }

  nodeRadius(node: NodeRef) {
    return this.nodeRadii[node]
  }

  nodeStyle(node: NodeRef) {
    return this.nodeStylePointers[node]
  }

  nodeLabel(node: NodeRef) {
    return this.nodeLabels[node]
  }

  edgeId(edge: EdgeRef): Id {
    return this.edgeIds[edge]
  }

  edgeSource(edge: EdgeRef): NodeRef {
    return this.edgeEndpoints[edge * 2] as NodeRef
  }

  edgeTarget(edge: EdgeRef): NodeRef {
    return this.edgeEndpoints[edge * 2 + 1] as NodeRef
  }

  edgeWidth(edge: EdgeRef) {
    return this.edgeWidths[edge]
  }

  edgeStyle(edge: EdgeRef) {
    return this.edgeStylePointers[edge]
  }

  edgeLabel(edge: EdgeRef) {
    return this.edgeLabels[edge]
  }

  clone(): GraphState {
    const copyFloat32Array = (source: Float32Array) => {
      const copy = this.createFloat32Array(source.length)
      copy.set(source)
      return copy
    }
    const copyUint32Array = (source: Uint32Array) => {
      const copy = this.createUint32Array(source.length)
      copy.set(source)
      return copy
    }

    const clone = new GraphState({
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      nodeStyles: [],
      edgeStyles: [],
      sharedArrayBuffers: this.sharedArrayBuffers
    })

    clone.viewport.set(this.viewport)
    clone.nodePositions = copyFloat32Array(this.nodePositions)
    clone.nodeRadii = copyFloat32Array(this.nodeRadii)
    clone.nodeStylePointers = new Uint16Array(this.nodeStylePointers)
    clone.nodeLabels = [...this.nodeLabels]
    clone.nodeIds.push(...this.nodeIds)
    clone.nodeSlotCount = this.nodeSlotCount
    clone.nodeCapacity = this.nodeCapacity
    for (const [id, slot] of this.nodeIdToSlot) clone.nodeIdToSlot.set(id, slot)
    clone.nodeFreeSlots.push(...this.nodeFreeSlots)
    for (let slot = 0; slot < this.nodeEdges.length; slot++) {
      const edges = this.nodeEdges[slot]
      clone.nodeEdges[slot] = edges === undefined ? undefined : new Set(edges)
    }

    clone.edgeEndpoints = copyUint32Array(this.edgeEndpoints)
    clone.edgeWidths = new Float32Array(this.edgeWidths)
    clone.edgeStylePointers = new Uint16Array(this.edgeStylePointers)
    clone.edgeLabels = [...this.edgeLabels]
    clone.edgePath = this.edgePath.map((path) => path?.map((segment) => ({ ...segment })))
    clone.edgeSlotCount = this.edgeSlotCount
    clone.edgeCapacity = this.edgeCapacity
    clone.edgeIds.push(...this.edgeIds)
    for (const [id, slot] of this.edgeIdToSlot) clone.edgeIdToSlot.set(id, slot)
    clone.edgeFreeSlots.push(...this.edgeFreeSlots)

    clone.nodeStyleDefs = [...this.nodeStyleDefs]
    clone.edgeStyleDefs = [...this.edgeStyleDefs]
    clone.nodeStyleFree.push(...this.nodeStyleFree)
    clone.edgeStyleFree.push(...this.edgeStyleFree)
    clone.annotations = this.annotations.map((annotation) => ({ ...annotation }))

    clone.dirty[0] |=
      DIRTY_VIEWPORT |
      DIRTY_NODE_STRUCTURE |
      DIRTY_NODE_POSITIONS |
      DIRTY_NODE_RADII |
      DIRTY_NODE_STYLES |
      DIRTY_NODE_LABELS |
      DIRTY_NODE_STYLE_TABLE |
      DIRTY_EDGE_STRUCTURE |
      DIRTY_EDGES |
      DIRTY_EDGE_WIDTHS |
      DIRTY_EDGE_STYLES |
      DIRTY_EDGE_LABELS |
      DIRTY_EDGE_STYLE_TABLE |
      DIRTY_ANNOTATIONS |
      DIRTY_EDGE_PATH
    clone.markNodePositionsDirty()

    return clone
  }

  /**
   * Remove all graph entities and release the slot arrays while keeping style tables and viewport settings.
   * Use this for wholesale graph swaps; individual deletes intentionally leave tombstones for stable slots.
   */
  clearGraph() {
    this.nodePositions = new Float32Array(0)
    this.nodeRadii = new Float32Array(0)
    this.nodeStylePointers = new Uint16Array(0)
    this.nodeLabels = []
    this.nodeIds.length = 0
    this.nodeSlotCount = 0
    this.nodeCapacity = 0
    this.nodeIdToSlot.clear()
    this.nodeFreeSlots.length = 0
    this.nodeEdges.length = 0
    this.dirtyNodePositions.clear()

    this.edgeEndpoints = new Uint32Array(0)
    this.edgeWidths = new Float32Array(0)
    this.edgeStylePointers = new Uint16Array(0)
    this.edgeLabels = []
    this.edgePath = []
    this.edgeSlotCount = 0
    this.edgeCapacity = 0
    this.edgeIds.length = 0
    this.edgeIdToSlot.clear()
    this.edgeFreeSlots.length = 0

    this.annotations = []
    this.dirty[0] |=
      DIRTY_NODE_STRUCTURE |
      DIRTY_NODE_POSITIONS |
      DIRTY_NODE_RADII |
      DIRTY_NODE_STYLES |
      DIRTY_NODE_LABELS |
      DIRTY_EDGE_STRUCTURE |
      DIRTY_EDGES |
      DIRTY_EDGE_WIDTHS |
      DIRTY_EDGE_STYLES |
      DIRTY_EDGE_LABELS |
      DIRTY_EDGE_PATH |
      DIRTY_ANNOTATIONS
  }

  updateViewport({ x, y, zoom }: { x: number; y: number; zoom: number }) {
    this.viewport[0] = x
    this.viewport[1] = y
    this.viewport[2] = zoom
    this.dirty[0] |= DIRTY_VIEWPORT
  }

  /**
   * Node Mutation Methods
   */
  addNodes(nodes: Iterable<Node>) {
    for (const node of nodes) {
      let slot = this.nodeFreeSlots.pop()
      if (slot === undefined) {
        slot = this.nodeSlotCount++
        this.ensureNodeCapacity(this.nodeSlotCount)
      }
      this.nodePositions[slot * 2] = node.x
      this.nodePositions[slot * 2 + 1] = node.y
      this.nodeRadii[slot] = node.radius
      this.nodeStylePointers[slot] = node.style
      this.nodeLabels[slot] = node.label
      this.nodeIds[slot] = node.id
      this.nodeEdges[slot] = undefined
      this.nodeIdToSlot.set(node.id, slot)
      this.dirtyNodePositions.add(slot)
    }
    this.dirty[0] |= DIRTY_NODE_POSITIONS | DIRTY_NODE_RADII | DIRTY_NODE_STYLES | DIRTY_NODE_LABELS
  }

  deleteNodes(ids: Iterable<Id>) {
    for (const id of ids) {
      const slot = this.nodeIdToSlot.get(id)
      if (slot === undefined) continue
      const incident = this.nodeEdges[slot]
      if (incident !== undefined) for (const edgeSlot of [...incident]) this.deleteEdgeBySlot(edgeSlot)
      this.nodeEdges[slot] = undefined
      this.nodeIdToSlot.delete(id)
      this.nodeFreeSlots.push(slot)
      this.nodePositions[slot * 2] = NaN
      this.nodePositions[slot * 2 + 1] = NaN
      this.nodeRadii[slot] = NaN
      this.nodeLabels[slot] = undefined
      this.dirtyNodePositions.add(slot)
    }
    this.dirty[0] |= DIRTY_NODE_POSITIONS | DIRTY_NODE_RADII | DIRTY_NODE_LABELS
  }

  updateNodePositions(positions: Iterable<NodePositionUpdate>) {
    for (const update of positions) {
      const slot = 'node' in update ? update.node : this.nodeIdToSlot.get(update.id)
      if (slot === undefined) continue
      this.nodePositions[slot * 2] = update.x
      this.nodePositions[slot * 2 + 1] = update.y
      this.dirtyNodePositions.add(slot)
    }
    this.dirty[0] |= DIRTY_NODE_POSITIONS
  }

  markNodePositionsDirty(slots?: Iterable<number>) {
    if (slots === undefined) {
      for (let slot = 0; slot < this.nodeSlotCount; slot++) this.dirtyNodePositions.add(slot)
    } else {
      for (const slot of slots) this.dirtyNodePositions.add(slot)
    }
    this.dirty[0] |= DIRTY_NODE_POSITIONS
  }

  updateNodeRadii(radii: Iterable<{ id: Id; radius: number }>) {
    for (const { id, radius } of radii) {
      const slot = this.nodeIdToSlot.get(id)
      if (slot !== undefined) this.nodeRadii[slot] = radius
    }
    this.dirty[0] |= DIRTY_NODE_RADII
  }

  // Label rasterization updates only when labels or style definitions change.
  updateNodeStyles(styles: Iterable<{ id: Id; style: number }>) {
    for (const { id, style } of styles) {
      const slot = this.nodeIdToSlot.get(id)
      if (slot !== undefined) this.nodeStylePointers[slot] = style
    }
    this.dirty[0] |= DIRTY_NODE_STYLES | DIRTY_NODE_LABELS
  }

  updateNodeLabels(labels: Iterable<{ id: Id; label: string }>) {
    for (const { id, label } of labels) {
      const slot = this.nodeIdToSlot.get(id)
      if (slot !== undefined) this.nodeLabels[slot] = label
    }
    this.dirty[0] |= DIRTY_NODE_LABELS
  }

  /**
   * Edge Mutation Methods
   */
  addEdges(edges: Iterable<Edge>) {
    for (const edge of edges) {
      const source = this.nodeIdToSlot.get(edge.source)
      const target = this.nodeIdToSlot.get(edge.target)
      if (source === undefined || target === undefined) continue // endpoints must already exist
      let slot = this.edgeFreeSlots.pop()
      if (slot === undefined) {
        slot = this.edgeSlotCount++
        this.ensureEdgeCapacity(this.edgeSlotCount)
      }
      this.edgeEndpoints[slot * 2] = source
      this.edgeEndpoints[slot * 2 + 1] = target
      this.edgeWidths[slot] = edge.width
      this.edgeStylePointers[slot] = edge.style
      this.edgeLabels[slot] = edge.label
      this.edgePath[slot] = edge.path
      this.edgeIds[slot] = edge.id
      this.edgeIdToSlot.set(edge.id, slot)
      ;(this.nodeEdges[source] ??= new Set()).add(slot)
      ;(this.nodeEdges[target] ??= new Set()).add(slot)
    }
    this.dirty[0] |= DIRTY_EDGES | DIRTY_EDGE_WIDTHS | DIRTY_EDGE_STYLES | DIRTY_EDGE_LABELS | DIRTY_EDGE_PATH
  }

  // set or clear the explicit shape for edges (pass undefined / [] to make an edge a straight line again)
  updateEdgePaths(updates: Iterable<EdgePathUpdate>) {
    for (const update of updates) {
      const slot = 'edge' in update ? update.edge : this.edgeIdToSlot.get(update.id)
      if (slot !== undefined) this.edgePath[slot] = update.path
    }
    this.dirty[0] |= DIRTY_EDGE_PATH
  }

  deleteEdges(ids: Iterable<Id>) {
    for (const id of ids) {
      const slot = this.edgeIdToSlot.get(id)
      if (slot !== undefined) this.deleteEdgeBySlot(slot)
    }
  }

  updateEdgeWidths(widths: Iterable<EdgeWidthUpdate>) {
    for (const update of widths) {
      const slot = 'edge' in update ? update.edge : this.edgeIdToSlot.get(update.id)
      if (slot !== undefined) this.edgeWidths[slot] = update.width
    }
    this.dirty[0] |= DIRTY_EDGE_WIDTHS
  }

  updateEdgeStyles(styles: Iterable<EdgeStyleUpdate>) {
    for (const update of styles) {
      const slot = 'edge' in update ? update.edge : this.edgeIdToSlot.get(update.id)
      if (slot !== undefined) this.edgeStylePointers[slot] = update.style
    }
    this.dirty[0] |= DIRTY_EDGE_STYLES | DIRTY_EDGE_LABELS
  }

  updateEdgeLabels(labels: Iterable<EdgeLabelUpdate>) {
    for (const update of labels) {
      const slot = 'edge' in update ? update.edge : this.edgeIdToSlot.get(update.id)
      if (slot !== undefined) this.edgeLabels[slot] = update.label
    }
    this.dirty[0] |= DIRTY_EDGE_LABELS
  }

  /**
   * Style Mutation Methods (index-keyed palettes). Style-table changes also flag labels because the
   * raster label path bakes color/size into the atlas.
   */
  addNodeStyleDefinitions(nodeStyles: Iterable<NodeStyle>) {
    for (const style of nodeStyles) this.nodeStyleDefs[this.nodeStyleFree.pop() ?? this.nodeStyleDefs.length] = style
    this.dirty[0] |= DIRTY_NODE_STYLE_TABLE | DIRTY_NODE_LABELS
  }

  deleteNodeStyleDefinitions(indices: Iterable<number>) {
    for (const index of indices) {
      this.nodeStyleDefs[index] = undefined
      this.nodeStyleFree.push(index)
    }
    this.dirty[0] |= DIRTY_NODE_STYLE_TABLE | DIRTY_NODE_LABELS
  }

  updateNodeStyleDefinitions(updates: Iterable<{ id: number; style: NodeStyle }>) {
    for (const { id, style } of updates) this.nodeStyleDefs[id] = style
    this.dirty[0] |= DIRTY_NODE_STYLE_TABLE | DIRTY_NODE_LABELS
  }

  addEdgeStyleDefinitions(edgeStyles: Iterable<EdgeStyle>) {
    for (const style of edgeStyles) this.edgeStyleDefs[this.edgeStyleFree.pop() ?? this.edgeStyleDefs.length] = style
    this.dirty[0] |= DIRTY_EDGE_STYLE_TABLE | DIRTY_EDGE_LABELS
  }

  deleteEdgeStyleDefinitions(indices: Iterable<number>) {
    for (const index of indices) {
      this.edgeStyleDefs[index] = undefined
      this.edgeStyleFree.push(index)
    }
    this.dirty[0] |= DIRTY_EDGE_STYLE_TABLE | DIRTY_EDGE_LABELS
  }

  updateEdgeStyleDefinitions(updates: Iterable<{ id: number; style: EdgeStyle }>) {
    for (const { id, style } of updates) this.edgeStyleDefs[id] = style
    this.dirty[0] |= DIRTY_EDGE_STYLE_TABLE | DIRTY_EDGE_LABELS
  }

  /**
   * Annotation Mutation. The whole set is replaced each call (e.g. on every multiselect drag frame,
   * pass the current bounding box; pass [] to clear). The renderer re-packs + re-uploads it wholesale.
   */
  setAnnotations(annotations: Annotation[]) {
    this.annotations = annotations
    this.dirty[0] |= DIRTY_ANNOTATIONS
  }

  // tombstone an edge by slot: free it, drop it from both endpoints' adjacency, and collapse it so it
  // renders nothing (degenerate (0,0) endpoints + cleared label)
  private deleteEdgeBySlot(slot: number) {
    this.edgeIdToSlot.delete(this.edgeIds[slot])
    this.edgeFreeSlots.push(slot)
    this.nodeEdges[this.edgeEndpoints[slot * 2]]?.delete(slot)
    this.nodeEdges[this.edgeEndpoints[slot * 2 + 1]]?.delete(slot)
    this.edgeEndpoints[slot * 2] = 0
    this.edgeEndpoints[slot * 2 + 1] = 0
    this.edgeWidths[slot] = 0
    this.edgeLabels[slot] = undefined
    this.edgePath[slot] = undefined
    this.dirty[0] |= DIRTY_EDGES | DIRTY_EDGE_WIDTHS | DIRTY_EDGE_LABELS | DIRTY_EDGE_PATH
  }

  // grow the node columns (preserving contents) when the slot count exceeds capacity; flags a realloc
  private ensureNodeCapacity(slots: number) {
    if (slots <= this.nodeCapacity) return
    let capacity = Math.max(8, this.nodeCapacity * 2)
    while (capacity < slots) capacity *= 2
    const positions = this.createFloat32Array(capacity * 2)
    positions.set(this.nodePositions)
    const radii = this.createFloat32Array(capacity)
    radii.set(this.nodeRadii)
    const styles = new Uint16Array(capacity)
    styles.set(this.nodeStylePointers)
    this.nodePositions = positions
    this.nodeRadii = radii
    this.nodeStylePointers = styles
    this.nodeCapacity = capacity
    this.dirty[0] |= DIRTY_NODE_STRUCTURE
  }

  private ensureEdgeCapacity(slots: number) {
    if (slots <= this.edgeCapacity) return
    let capacity = Math.max(8, this.edgeCapacity * 2)
    while (capacity < slots) capacity *= 2
    const endpoints = this.createUint32Array(capacity * 2)
    endpoints.set(this.edgeEndpoints)
    const widths = new Float32Array(capacity)
    widths.set(this.edgeWidths)
    const styles = new Uint16Array(capacity)
    styles.set(this.edgeStylePointers)
    this.edgeEndpoints = endpoints
    this.edgeWidths = widths
    this.edgeStylePointers = styles
    this.edgeCapacity = capacity
    this.dirty[0] |= DIRTY_EDGE_STRUCTURE
  }

  private createFloat32Array(length: number): Float32Array {
    if (this.sharedArrayBuffers) return new Float32Array(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT)) as Float32Array
    return new Float32Array(length)
  }

  private createUint32Array(length: number): Uint32Array {
    if (this.sharedArrayBuffers) return new Uint32Array(new SharedArrayBuffer(length * Uint32Array.BYTES_PER_ELEMENT)) as Uint32Array
    return new Uint32Array(length)
  }
}
