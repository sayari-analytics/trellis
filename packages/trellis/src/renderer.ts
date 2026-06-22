import { CAMERA_BINDING, VIEWPORT_X, VIEWPORT_Y, VIEWPORT_ZOOM } from './camera'
import {
  DIRTY_VIEWPORT,
  DIRTY_NODE_POSITIONS,
  DIRTY_NODE_RADII,
  DIRTY_NODE_STYLES,
  DIRTY_NODE_STYLE_TABLE,
  DIRTY_EDGES,
  DIRTY_EDGE_WIDTHS,
  DIRTY_EDGE_STYLES,
  DIRTY_EDGE_STYLE_TABLE,
  DIRTY_EDGE_PATH,
  DIRTY_LABEL_REPACK,
  DIRTY_ANNOTATIONS,
  GraphState,
  type NodeStyle,
  type EdgeStyle
} from './state'
import {
  type TextureTable,
  type TextureData,
  createRaster2D,
  red,
  green,
  blue,
  alpha,
  POSITION_TEXTURE_UNIT,
  EDGE_ANCHOR_TEXTURE_UNIT,
  NODE_STYLE_POINTER_UNIT,
  NODE_LABEL_STYLE_UNIT,
  EDGE_LABEL_STYLE_UNIT,
  ICON_STYLE_UNIT
} from './textures'
import {
  createNodeStyleTable,
  createEdgeStyleTable,
  createLabelStyleTable,
  resolveNodeLabelStyle,
  resolveEdgeLabelStyle,
  resolveIconStyle,
  type ResolvedLabelStyle
} from './textures/styleTable'
import { createPositionTexture, createRadiusTexture, createEdgeAnchorTexture, PositionTexture } from './textures/positionTexture'
import { createPointerTexture, PointerTexture } from './textures/pointerTexture'
import { createGlyphAtlas, glyphIndex, GlyphAtlas } from './textures/glyphAtlas'
import { createLabelAtlas, LABEL_RASTER_OVERSAMPLE, LabelAtlas } from './textures/labelAtlas'
// import { createGridProgram } from './programs/gridProgram'
import { createNodeProgram, NodeProgram } from './programs/nodeProgram'
import { createEdgeProgram, EdgeProgram } from './programs/edgeProgram'
import { createSegmentEdgeProgram, SegmentEdgeProgram } from './programs/segmentEdgeProgram'
import { createArrowProgram, ArrowProgram } from './programs/arrowProgram'
import { createGlyphProgram, GlyphProgram } from './programs/glyphProgram'
import { createLabelProgram, LabelProgram } from './programs/labelProgram'
import { createAnnotationProgram, AnnotationProgram } from './programs/annotationProgram'

export type Options = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  state: GraphState
  pixelRatio?: number
}

export type ExportOptions = {
  width?: number // target pixels (default: the canvas drawing-buffer size — a faithful current-view capture)
  height?: number
  background?: number | 'transparent' // hex 0xRRGGBB / 0xAARRGGBB, or transparent (default: opaque white)
  format?: 'png' | 'jpeg' | 'webp' // default png
  quality?: number // 0..1 for jpeg/webp
}

// the live view clears to opaque white; export defaults to the same
const OPAQUE_WHITE: readonly [number, number, number, number] = [1, 1, 1, 1]
const EMPTY_F32 = new Float32Array(0) // sentinels for "no instances" uploads
const EMPTY_U16 = new Uint16Array(0)

// export background -> normalized RGBA clear color
const resolveBackground = (background: number | 'transparent' | undefined): readonly [number, number, number, number] => {
  if (background === undefined) return OPAQUE_WHITE
  if (background === 'transparent') return [0, 0, 0, 0]
  return [red(background), green(background), blue(background), alpha(background)]
}

const GLYPH_INSTANCE_BYTES = 16
const RASTER_INSTANCE_BYTES = 16
const FALLBACK_FONT = 'sans-serif' // Canvas2D shapes non-ASCII (CJK, RTL, diacritics, ...) in this family

type PackedLabels = {
  glyph: { buffer: ArrayBuffer; count: number }
  raster: { buffer: ArrayBuffer; count: number }
}

const isPrintableAscii = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x20 || code > 0x7e) return false
  }
  return true
}

export class Renderer {
  public readonly canvas: HTMLCanvasElement | OffscreenCanvas
  public readonly pixelRatio: number

  private state: GraphState
  private gl: WebGL2RenderingContext
  private nodeStyleTexture: TextureTable<NodeStyle>
  private edgeStyleTexture: TextureTable<EdgeStyle>
  private positionTexture: PositionTexture // node [x, y] (hot; partial re-upload of the dirty slot set)
  private radiusTexture: TextureData<Float32Array> // node [r] (cold)
  private nodeSlotCount = 0 // node slot count last uploaded, to detect a re-alloc / instance-count change
  private edgeSlotCount = 0 // edge slot count last uploaded
  private nodeStylePointerTexture: PointerTexture // node index -> style pointer, read by node program + arrows
  // private gridProgram: Program
  private annotationProgram: AnnotationProgram // circles/rectangles drawn beneath the graph
  private edgeProgram: EdgeProgram // straight edges (curved edges collapsed out of its instance set)
  private segmentEdgeProgram: SegmentEdgeProgram // edges with an explicit path, stroked per segment (SDF)
  private arrowProgram: ArrowProgram
  private nodeProgram: NodeProgram
  // label subsystem: shared atlases + per-element-type style tables, anchors, and glyph/raster programs
  private glyphAtlas: GlyphAtlas
  private labelAtlas: LabelAtlas
  private nodeLabelStyleTexture: TextureTable<NodeStyle> // built from the node style table's .label
  private edgeLabelStyleTexture: TextureTable<EdgeStyle> // built from the edge style table's .label
  private iconStyleTexture: TextureTable<NodeStyle> // built from the node style table's .icon
  private edgeAnchorTexture: TextureData<Float32Array> // edge-label anchors: [midX, midY, angle] per edge
  private nodeGlyphProgram: GlyphProgram
  private edgeGlyphProgram: GlyphProgram
  private nodeLabelProgram: LabelProgram
  private edgeLabelProgram: LabelProgram
  // node icons: a centered glyph/raster drawn on the node, reusing the label programs (position center)
  private iconGlyphProgram: GlyphProgram
  private iconLabelProgram: LabelProgram
  private edgeLabelCount = 0
  private edgeAnchorScratch = new Float32Array(0)
  private cameraUBO: WebGLBuffer
  private cameraData = new Float32Array(8)
  private renderRAFHandle = 0
  private lastWidth = NaN
  private lastHeight = NaN

  constructor(options: Options) {
    this.canvas = options.canvas
    this.state = options.state
    this.pixelRatio = options.pixelRatio ?? 2

    // cast: getContext's overloads don't resolve to WebGL2 on the HTMLCanvasElement | OffscreenCanvas union
    const gl = options.canvas.getContext('webgl2', { antialias: false }) as WebGL2RenderingContext | null
    if (gl === null) throw new Error('WebGL2 is not supported in this environment')
    this.gl = gl

    if (options.canvas instanceof HTMLCanvasElement) options.canvas.onselectstart = () => false

    const cameraUBO = gl.createBuffer()
    if (cameraUBO === null) throw new Error('Failed to create camera uniform buffer')
    this.cameraUBO = cameraUBO
    gl.bindBuffer(gl.UNIFORM_BUFFER, cameraUBO)
    gl.bufferData(gl.UNIFORM_BUFFER, this.cameraData.byteLength, gl.DYNAMIC_DRAW)
    gl.bindBufferBase(gl.UNIFORM_BUFFER, CAMERA_BINDING, cameraUBO)
    this.cameraData[4] = 1
    this.cameraData[5] = this.pixelRatio
    this.uploadCamera(gl.drawingBufferWidth, gl.drawingBufferHeight)

    this.nodeStyleTexture = createNodeStyleTable(gl)
    this.edgeStyleTexture = createEdgeStyleTable(gl)
    this.positionTexture = createPositionTexture(gl)
    this.radiusTexture = createRadiusTexture(gl)
    this.nodeStylePointerTexture = createPointerTexture(gl, NODE_STYLE_POINTER_UNIT)
    this.glyphAtlas = createGlyphAtlas(gl)
    this.labelAtlas = createLabelAtlas(gl)
    this.nodeLabelStyleTexture = createLabelStyleTable(gl, NODE_LABEL_STYLE_UNIT, (s: NodeStyle | undefined) =>
      resolveNodeLabelStyle(s?.label)
    )
    this.edgeLabelStyleTexture = createLabelStyleTable(gl, EDGE_LABEL_STYLE_UNIT, (s: EdgeStyle | undefined) =>
      resolveEdgeLabelStyle(s?.label)
    )
    this.iconStyleTexture = createLabelStyleTable(gl, ICON_STYLE_UNIT, (s: NodeStyle | undefined) => resolveIconStyle(s?.icon))
    this.edgeAnchorTexture = createEdgeAnchorTexture(gl)

    // this.gridProgram = createGridProgram(gl)
    this.annotationProgram = createAnnotationProgram(gl)
    this.edgeProgram = createEdgeProgram(gl)
    this.segmentEdgeProgram = createSegmentEdgeProgram(gl)
    this.arrowProgram = createArrowProgram(gl, {
      edgeBuffer: this.edgeProgram.edgeBuffer,
      widthBuffer: this.edgeProgram.widthBuffer,
      styleBuffer: this.edgeProgram.styleBuffer
    })
    this.nodeProgram = createNodeProgram(gl)
    const metrics = this.glyphAtlas.metrics
    const atlasSize = this.labelAtlas.size
    this.nodeGlyphProgram = createGlyphProgram(gl, { anchorUnit: POSITION_TEXTURE_UNIT, labelStyleUnit: NODE_LABEL_STYLE_UNIT, metrics })
    this.edgeGlyphProgram = createGlyphProgram(gl, {
      anchorUnit: EDGE_ANCHOR_TEXTURE_UNIT,
      labelStyleUnit: EDGE_LABEL_STYLE_UNIT,
      metrics,
      rotate: true
    })
    this.nodeLabelProgram = createLabelProgram(gl, { anchorUnit: POSITION_TEXTURE_UNIT, labelStyleUnit: NODE_LABEL_STYLE_UNIT, atlasSize })
    this.edgeLabelProgram = createLabelProgram(gl, {
      anchorUnit: EDGE_ANCHOR_TEXTURE_UNIT,
      labelStyleUnit: EDGE_LABEL_STYLE_UNIT,
      atlasSize,
      rotate: true
    })
    // Icons use node depth so nearer node bodies occlude lower icons.
    this.iconGlyphProgram = createGlyphProgram(gl, {
      anchorUnit: POSITION_TEXTURE_UNIT,
      labelStyleUnit: ICON_STYLE_UNIT,
      metrics,
      depth: true
    })
    this.iconLabelProgram = createLabelProgram(gl, {
      anchorUnit: POSITION_TEXTURE_UNIT,
      labelStyleUnit: ICON_STYLE_UNIT,
      atlasSize,
      depth: true
    })

    const tick = (time: number) => {
      this.render(time)
      this.renderRAFHandle = requestAnimationFrame(tick)
    }
    this.renderRAFHandle = requestAnimationFrame(tick)
  }

  destroy() {
    cancelAnimationFrame(this.renderRAFHandle)
    this.gl.deleteBuffer(this.cameraUBO)
    this.nodeStyleTexture.destroy()
    this.edgeStyleTexture.destroy()
    this.positionTexture.destroy()
    this.radiusTexture.destroy()
    this.nodeStylePointerTexture.destroy()
    this.glyphAtlas.destroy()
    this.labelAtlas.destroy()
    this.nodeLabelStyleTexture.destroy()
    this.edgeLabelStyleTexture.destroy()
    this.edgeAnchorTexture.destroy()
    // this.gridProgram.destroy()
    this.annotationProgram.destroy()
    this.edgeProgram.destroy()
    this.segmentEdgeProgram.destroy()
    this.arrowProgram.destroy()
    this.nodeProgram.destroy()
    this.iconStyleTexture.destroy()
    this.nodeGlyphProgram.destroy()
    this.edgeGlyphProgram.destroy()
    this.nodeLabelProgram.destroy()
    this.edgeLabelProgram.destroy()
    this.iconGlyphProgram.destroy()
    this.iconLabelProgram.destroy()
  }

  // Upload the camera UBO for the target framebuffer size.
  private uploadCamera(width: number, height: number) {
    const { gl, cameraData } = this
    cameraData[0] = width
    cameraData[1] = height
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.cameraUBO)
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraData)
  }

  /**
   * Split a column of labels into the two render paths and pack their instance buffers.
   *
   * Glyph (ASCII fast path) — 16 bytes / instance, one per printable, non-space character:
   *   u32 element | u16 glyph + u16 style | f32 penEmX | f32 lenEm
   *   penEmX/lenEm are font-size independent, so the shader derives the final screen position and a
   *   style change never requires repacking the glyph buffer.
   *
   * Raster (Unicode fallback) — 16 bytes / instance, one per non-ASCII label:
   *   u32 element | u16 style + u16 pad | u16 rectX | u16 rectY | u16 rectW | u16 rectH
   *   The rect is the label's cell in the dynamic atlas (device px), allocated here as a side effect.
   */
  private packLabels<S>(
    labels: ReadonlyArray<string | undefined>,
    pointers: Uint16Array,
    styleTable: S[],
    resolve: (style: S | undefined) => ResolvedLabelStyle
  ): PackedLabels {
    const advanceEm = this.glyphAtlas.metrics.advanceEm
    const atlas = this.labelAtlas

    // Count first so dense glyph buffers allocate exactly once.
    let glyphInstances = 0
    let rasterLabels = 0
    for (let i = 0; i < labels.length; i++) {
      const text = labels[i]
      if (text === undefined || text.length === 0) continue
      if (isPrintableAscii(text)) {
        for (let c = 0; c < text.length; c++) if (text.charCodeAt(c) !== 0x20) glyphInstances++ // skip spaces
      } else {
        rasterLabels++
      }
    }

    const glyphBuffer = new ArrayBuffer(glyphInstances * GLYPH_INSTANCE_BYTES)
    const glyphU32 = new Uint32Array(glyphBuffer)
    const glyphF32 = new Float32Array(glyphBuffer)
    const rasterBuffer = new ArrayBuffer(rasterLabels * RASTER_INSTANCE_BYTES)
    const rasterU32 = new Uint32Array(rasterBuffer)
    const rasterU16 = new Uint16Array(rasterBuffer)

    // `gi`/`ri` index 4-element instance slots in the u32 views.
    let gi = 0
    let ri = 0
    for (let i = 0; i < labels.length; i++) {
      const text = labels[i]
      if (text === undefined || text.length === 0) continue
      const pointer = pointers[i] ?? 0

      if (isPrintableAscii(text)) {
        const len = text.length
        const lenEm = len * advanceEm
        for (let c = 0; c < len; c++) {
          const code = text.charCodeAt(c)
          if (code === 0x20) continue
          const index = glyphIndex(code)
          const o = gi * 4
          glyphU32[o] = i // element
          glyphU32[o + 1] = (index & 0xffff) | (pointer << 16) // glyph + style
          glyphF32[o + 2] = (c - (len - 1) / 2) * advanceEm // centered pen offset, em
          glyphF32[o + 3] = lenEm
          gi++
        }
      } else {
        const style = resolve(styleTable[pointer])
        // Rasterize above zoom-1 size; the label program scales the box back down.
        const scale = this.pixelRatio * LABEL_RASTER_OVERSAMPLE
        const stroke = { width: style.strokeWidth * scale, color: style.strokeColor }
        const rect = atlas.getRect(text, style.fontSize * scale, style.color, FALLBACK_FONT, stroke)
        if (rect === null) continue
        const o = ri * 4
        rasterU32[o] = i // element
        rasterU16[o * 2 + 2] = pointer // style (low half of slot 1)
        rasterU16[o * 2 + 4] = rect.x
        rasterU16[o * 2 + 5] = rect.y
        rasterU16[o * 2 + 6] = rect.w
        rasterU16[o * 2 + 7] = rect.h
        ri++
      }
    }

    return {
      glyph: { buffer: glyphBuffer, count: gi },
      raster: { buffer: rasterBuffer, count: ri }
    }
  }

  private render(_time: number) {
    const { gl, state, cameraData } = this
    const flags = state.dirty[0]
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const resized = width !== this.lastWidth || height !== this.lastHeight
    // Static graphs do not redraw.
    if (flags === 0 && !resized) return

    if (flags !== 0) {
      const nodeCount = state.nodeSlotCount
      const nodeResized = nodeCount !== this.nodeSlotCount
      this.nodeSlotCount = nodeCount
      if (nodeResized) {
        this.nodeProgram.setCount(nodeCount)
        this.iconGlyphProgram.setNodeCount(nodeCount)
        this.iconLabelProgram.setNodeCount(nodeCount)
      }
      if (nodeResized) {
        this.positionTexture.set(state.nodePositions.subarray(0, nodeCount * 2))
        state.dirtyNodePositions.clear()
      } else if (flags & DIRTY_NODE_POSITIONS) {
        this.positionTexture.setSlots(state.nodePositions.subarray(0, nodeCount * 2), state.dirtyNodePositions)
        state.dirtyNodePositions.clear()
      }
      if (nodeResized || flags & DIRTY_NODE_RADII) this.radiusTexture.set(state.nodeRadii.subarray(0, nodeCount))
      if (nodeResized || flags & DIRTY_NODE_STYLES) this.nodeStylePointerTexture.set(state.nodeStylePointers.subarray(0, nodeCount))
      if (flags & DIRTY_NODE_STYLE_TABLE) {
        this.nodeStyleTexture.set(state.nodeStyleDefs)
        this.nodeLabelStyleTexture.set(state.nodeStyleDefs)
        this.iconStyleTexture.set(state.nodeStyleDefs)
      }

      const edgeCount = state.edgeSlotCount
      const edgeResized = edgeCount !== this.edgeSlotCount
      this.edgeSlotCount = edgeCount
      if (edgeResized) this.arrowProgram.setCount(edgeCount)
      if (edgeResized || flags & (DIRTY_EDGES | DIRTY_EDGE_WIDTHS | DIRTY_EDGE_STYLES | DIRTY_EDGE_PATH)) {
        this.syncEdges(state, edgeCount)
      }
      if (flags & DIRTY_EDGE_STYLE_TABLE) {
        this.edgeStyleTexture.set(state.edgeStyleDefs)
        this.edgeLabelStyleTexture.set(state.edgeStyleDefs)
      }

      if (flags & DIRTY_ANNOTATIONS) this.annotationProgram.setAnnotations(state.annotations)

      if (flags & DIRTY_LABEL_REPACK) {
        this.labelAtlas.reset()
        const node = this.packLabels(state.nodeLabels, state.nodeStylePointers, state.nodeStyleDefs, (s) => resolveNodeLabelStyle(s?.label))
        this.nodeGlyphProgram.setInstances(node.glyph.buffer, node.glyph.count)
        this.nodeLabelProgram.setInstances(node.raster.buffer, node.raster.count)
        const edge = this.packLabels(state.edgeLabels, state.edgeStylePointers, state.edgeStyleDefs, (s) => resolveEdgeLabelStyle(s?.label))
        this.edgeGlyphProgram.setInstances(edge.glyph.buffer, edge.glyph.count)
        this.edgeLabelProgram.setInstances(edge.raster.buffer, edge.raster.count)
        const iconContent = new Array<string | undefined>(state.nodeSlotCount)
        for (let i = 0; i < iconContent.length; i++) iconContent[i] = state.nodeStyleDefs[state.nodeStylePointers[i]]?.icon?.content
        const icon = this.packLabels(iconContent, state.nodeStylePointers, state.nodeStyleDefs, (s) => resolveIconStyle(s?.icon))
        this.iconGlyphProgram.setInstances(icon.glyph.buffer, icon.glyph.count)
        this.iconLabelProgram.setInstances(icon.raster.buffer, icon.raster.count)
        this.labelAtlas.upload()
        this.edgeLabelCount = edge.glyph.count + edge.raster.count
      }

      // Edge-label anchors follow node positions and connectivity.
      if (this.edgeLabelCount > 0 && flags & (DIRTY_NODE_POSITIONS | DIRTY_EDGES | DIRTY_LABEL_REPACK)) {
        const { nodePositions, edgeEndpoints, edgeSlotCount } = state
        if (this.edgeAnchorScratch.length < edgeSlotCount * 3) this.edgeAnchorScratch = new Float32Array(edgeSlotCount * 3)
        const anchors = this.edgeAnchorScratch
        for (let e = 0; e < edgeSlotCount; e++) {
          const source = edgeEndpoints[e * 2] * 2
          const target = edgeEndpoints[e * 2 + 1] * 2
          const dx = nodePositions[target] - nodePositions[source]
          const dy = nodePositions[target + 1] - nodePositions[source + 1]
          anchors[e * 3] = (nodePositions[source] + nodePositions[target]) / 2
          anchors[e * 3 + 1] = (nodePositions[source + 1] + nodePositions[target + 1]) / 2
          let angle = Math.atan2(dy, dx)
          if (angle > Math.PI / 2) angle -= Math.PI
          else if (angle < -Math.PI / 2) angle += Math.PI
          anchors[e * 3 + 2] = angle
        }
        this.edgeAnchorTexture.set(anchors.subarray(0, edgeSlotCount * 3))
      }

      if (flags & DIRTY_VIEWPORT) {
        cameraData[2] = state.viewport[VIEWPORT_X]
        cameraData[3] = state.viewport[VIEWPORT_Y]
        cameraData[4] = state.viewport[VIEWPORT_ZOOM]
      }
      state.dirty[0] &= ~flags
    }

    if (flags & DIRTY_VIEWPORT || resized) {
      this.lastWidth = width
      this.lastHeight = height
      this.uploadCamera(width, height)
    }

    this.draw(width, height, OPAQUE_WHITE)
  }

  /**
   * Partition straight edges from explicit edge paths.
   */
  private syncEdges(state: GraphState, edgeCount: number) {
    const edgePath = state.edgePath
    const shaped: number[] = []
    let segmentCount = 0
    for (let slot = 0; slot < edgeCount; slot++) {
      const path = edgePath[slot]
      if (path !== undefined && path.length > 0) {
        shaped.push(slot)
        segmentCount += path.length
      }
    }

    if (shaped.length === 0) {
      this.edgeProgram.setEdges(state.edgeEndpoints.subarray(0, edgeCount * 2))
      this.edgeProgram.setWidths(state.edgeWidths.subarray(0, edgeCount))
      this.edgeProgram.setStyles(state.edgeStylePointers.subarray(0, edgeCount))
      this.segmentEdgeProgram.setSegments(EMPTY_F32, EMPTY_F32, EMPTY_U16)
      return
    }

    const straightEndpoints = state.edgeEndpoints.slice(0, edgeCount * 2)
    for (const slot of shaped) straightEndpoints[slot * 2 + 1] = straightEndpoints[slot * 2]
    this.edgeProgram.setEdges(straightEndpoints)
    this.edgeProgram.setWidths(state.edgeWidths.subarray(0, edgeCount))
    this.edgeProgram.setStyles(state.edgeStylePointers.subarray(0, edgeCount))

    const geometry = new Float32Array(segmentCount * 7)
    const widths = new Float32Array(segmentCount)
    const styles = new Uint16Array(segmentCount)
    let s = 0
    for (const slot of shaped) {
      const width = state.edgeWidths[slot]
      const style = state.edgeStylePointers[slot]
      for (const seg of edgePath[slot]!) {
        const o = s * 7
        geometry[o] = seg.from.x
        geometry[o + 1] = seg.from.y
        if (seg.type === 'quad') {
          geometry[o + 2] = seg.control.x
          geometry[o + 3] = seg.control.y
          geometry[o + 6] = 1
        } else {
          geometry[o + 2] = seg.from.x
          geometry[o + 3] = seg.from.y
          geometry[o + 6] = 0
        }
        geometry[o + 4] = seg.to.x
        geometry[o + 5] = seg.to.y
        widths[s] = width
        styles[s] = style
        s += 1
      }
    }
    this.segmentEdgeProgram.setSegments(geometry, widths, styles)
  }

  private draw(width: number, height: number, clear: readonly [number, number, number, number]) {
    const { gl } = this
    gl.viewport(0, 0, width, height)
    gl.clearColor(clear[0], clear[1], clear[2], clear[3])
    gl.depthMask(true)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    this.nodeStyleTexture.bind()
    this.edgeStyleTexture.bind()
    this.positionTexture.bind()
    this.radiusTexture.bind()
    this.nodeStylePointerTexture.bind()
    this.glyphAtlas.bind()
    this.labelAtlas.bind()
    this.nodeLabelStyleTexture.bind()
    this.edgeLabelStyleTexture.bind()
    this.iconStyleTexture.bind()
    this.edgeAnchorTexture.bind()

    // Draw order: edges, node bodies, arrows, icons, labels.
    // Node bodies write depth so nearer bodies can occlude lower icons.
    // this.gridProgram.render()
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)
    this.annotationProgram.render()
    this.edgeProgram.render()
    this.segmentEdgeProgram.render()

    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LESS)
    gl.depthMask(true)
    this.nodeProgram.render()

    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)
    this.arrowProgram.render()

    // LEQUAL lets an icon draw over its own node while nearer node bodies occlude it.
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    this.iconGlyphProgram.render()
    this.iconLabelProgram.render()

    gl.disable(gl.DEPTH_TEST)
    this.nodeGlyphProgram.render()
    this.nodeLabelProgram.render()
    this.edgeGlyphProgram.render()
    this.edgeLabelProgram.render()
  }

  /**
   * Export the current view as a raster image. Renders the exact same draw sequence into an offscreen
   * framebuffer at the requested size — the visible canvas and its render loop are left untouched — then
   * reads it back and encodes it. Defaults to the canvas size + current camera (a pixel-faithful capture
   * of what's on screen). Returns the encoded image as a Blob.
   */
  async exportImage(options: ExportOptions = {}): Promise<Blob> {
    const image = this.exportImageData(options)
    const { canvas, ctx } = createRaster2D(image.width, image.height)
    ctx.putImageData(image, 0, 0)
    return canvas.convertToBlob({ type: `image/${options.format ?? 'png'}`, quality: options.quality })
  }

  /** Like {@link exportImage}, but returns the raw pixels (top-down, straight alpha) for compositing/tests. */
  exportImageData(options: ExportOptions = {}): ImageData {
    const { gl } = this
    const width = Math.max(1, Math.round(options.width ?? gl.drawingBufferWidth))
    const height = Math.max(1, Math.round(options.height ?? gl.drawingBufferHeight))
    const limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number
    if (width > limit || height > limit) {
      throw new Error(`Export size ${width}x${height} exceeds this device's limit of ${limit}px (tiling is not yet supported)`)
    }

    // offscreen target: an RGBA8 color renderbuffer + a depth renderbuffer (the icon pass depth-tests)
    const fbo = gl.createFramebuffer()
    const colorRB = gl.createRenderbuffer()
    const depthRB = gl.createRenderbuffer()
    if (fbo === null || colorRB === null || depthRB === null) throw new Error('Failed to allocate export framebuffer')
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.bindRenderbuffer(gl.RENDERBUFFER, colorRB)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRB)
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRB)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB)

    const pixels = new Uint8Array(width * height * 4)
    try {
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Export framebuffer incomplete')
      this.uploadCamera(width, height) // same camera, export resolution
      this.draw(width, height, resolveBackground(options.background))
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(fbo)
      gl.deleteRenderbuffer(colorRB)
      gl.deleteRenderbuffer(depthRB)
      // restore the camera UBO to the live drawing-buffer resolution (its viewport/zoom never changed)
      this.uploadCamera(gl.drawingBufferWidth, gl.drawingBufferHeight)
    }

    // GL reads bottom-up; flip into a top-down ImageData and un-premultiply any blended-transparent pixels
    const out = new Uint8ClampedArray(width * height * 4)
    const rowBytes = width * 4
    for (let y = 0; y < height; y++) {
      const src = (height - 1 - y) * rowBytes
      const dst = y * rowBytes
      for (let x = 0; x < rowBytes; x += 4) {
        const a = pixels[src + x + 3]
        if (a === 0 || a === 255) {
          out[dst + x] = pixels[src + x]
          out[dst + x + 1] = pixels[src + x + 1]
          out[dst + x + 2] = pixels[src + x + 2]
        } else {
          const s = 255 / a // blending left rgb premultiplied by alpha; recover straight alpha for the PNG
          out[dst + x] = pixels[src + x] * s
          out[dst + x + 1] = pixels[src + x + 1] * s
          out[dst + x + 2] = pixels[src + x + 2] * s
        }
        out[dst + x + 3] = a
      }
    }
    return new ImageData(out, width, height)
  }
}
