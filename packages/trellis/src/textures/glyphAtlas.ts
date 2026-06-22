/**
 * Monospace glyph atlas for the ASCII fast path, stored as a signed distance field (SDF). Printable
 * ASCII (0x20–0x7E) is rasterized once into a grid of cells; each texel stores distance to the nearest
 * glyph edge rather than coverage. The glyph program reconstructs crisp fill + outline at any size from
 * smoothstep thresholds with analytic (fwidth) antialiasing — so text and its stroke stay smooth when
 * scaled, where a coverage bitmap would alias. Changing label text never re-rasterizes; memory is O(1).
 *
 * SDF generation uses a two-pass Euclidean distance transform (Felzenszwalb & Huttenlocher), the same
 * approach as Mapbox's tiny-sdf.
 */
import { TextureAtlas, createRaster2D, GLYPH_ATLAS_UNIT } from '.'

const FIRST_GLYPH = 0x20 // space
const LAST_GLYPH = 0x7e // tilde
const GLYPH_COUNT = LAST_GLYPH - FIRST_GLYPH + 1 // 95

const FONT_PX = 48 // glyph rasterization size (the SDF interpolates, so this needn't be large)
const BUFFER = 20 // px of SDF padding around each glyph; must cover the largest representable distance
const RADIUS = 20 // SDF spread in px: distance is normalized by this, capping the outline width
const CUTOFF = 0.25 // fraction of the range that sits inside the glyph; edge maps to (1 - CUTOFF)
const COLS = 16 // atlas grid columns (rows derived from GLYPH_COUNT)
const LINE_EM = 1.35 // visible line height / em, for vertical (top/bottom) anchoring of the label
const SDF_SIZE = FONT_PX + BUFFER * 2 // square cell side

export type GlyphMetrics = {
  advanceEm: number // monospace advance width / em (horizontal pen step between glyphs)
  glyphBoxEm: [number, number] // glyph quad size / em (the full padded SDF cell, square)
  lineEm: number // visible line height / em (anchoring offset, ignores SDF padding)
  grid: [number, number] // atlas grid (cols, rows)
  sdfEdge: number // SDF value at the glyph edge (1 - CUTOFF)
  sdfRange: number // FONT_PX / RADIUS: converts an em-fraction outline width into SDF value units
}

export type GlyphAtlas = TextureAtlas & {
  metrics: GlyphMetrics
}

// a printable-ASCII codepoint maps to a contiguous atlas cell index, else -1
export const glyphIndex = (codePoint: number): number =>
  codePoint >= FIRST_GLYPH && codePoint <= LAST_GLYPH ? codePoint - FIRST_GLYPH : -1

const INF = 1e20

// 1D squared-distance transform along a row/column (Felzenszwalb & Huttenlocher)
const edt1d = (grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Int32Array, z: Float64Array) => {
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  f[0] = grid[offset]
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride]
    const q2 = q * q
    do {
      const r = v[k]
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2
    } while (s <= z[k] && --k > -1)
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++
    const r = v[k]
    const dq = q - r
    grid[offset + q * stride] = f[r] + dq * dq
  }
}

const edt = (grid: Float64Array, w: number, h: number, f: Float64Array, v: Int32Array, z: Float64Array) => {
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z)
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z)
}

export const createGlyphAtlas = (gl: WebGL2RenderingContext): GlyphAtlas => {
  const rows = Math.ceil(GLYPH_COUNT / COLS)
  const atlasW = COLS * SDF_SIZE
  const atlasH = rows * SDF_SIZE

  // Rasterize coverage, then transform to an SDF cell.
  const { ctx } = createRaster2D(SDF_SIZE, SDF_SIZE, true)
  ctx.font = `${FONT_PX}px monospace`
  const advance = ctx.measureText('M').width // monospace: every printable glyph shares this advance
  // Alphabetic baseline keeps centered icons visually centered.
  const capHeight = ctx.measureText('H').actualBoundingBoxAscent
  const baselineY = SDF_SIZE / 2 + capHeight / 2

  const atlas = new Uint8Array(atlasW * atlasH * 4)
  const n = SDF_SIZE * SDF_SIZE
  const gridOuter = new Float64Array(n)
  const gridInner = new Float64Array(n)
  const f = new Float64Array(SDF_SIZE)
  const z = new Float64Array(SDF_SIZE + 1)
  const v = new Int32Array(SDF_SIZE + 1)

  for (let i = 0; i < GLYPH_COUNT; i++) {
    ctx.clearRect(0, 0, SDF_SIZE, SDF_SIZE)
    ctx.font = `${FONT_PX}px monospace`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(String.fromCharCode(FIRST_GLYPH + i), SDF_SIZE / 2, baselineY)
    const data = ctx.getImageData(0, 0, SDF_SIZE, SDF_SIZE).data

    // seed the inside/outside distance grids from coverage (alpha), then transform to true distances
    for (let p = 0; p < n; p++) {
      const a = data[p * 4 + 3] / 255
      gridOuter[p] = a === 1 ? 0 : a === 0 ? INF : Math.max(0, 0.5 - a) ** 2
      gridInner[p] = a === 1 ? INF : a === 0 ? 0 : Math.max(0, a - 0.5) ** 2
    }
    edt(gridOuter, SDF_SIZE, SDF_SIZE, f, v, z)
    edt(gridInner, SDF_SIZE, SDF_SIZE, f, v, z)

    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cellX = col * SDF_SIZE
    const cellY = row * SDF_SIZE
    for (let y = 0; y < SDF_SIZE; y++) {
      for (let x = 0; x < SDF_SIZE; x++) {
        const p = y * SDF_SIZE + x
        // signed distance: positive outside, negative inside; pack so the edge sits at (1 - CUTOFF)
        const d = Math.sqrt(gridOuter[p]) - Math.sqrt(gridInner[p])
        const value = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / RADIUS + CUTOFF))))
        const o = ((cellY + y) * atlasW + cellX + x) * 4
        atlas[o] = atlas[o + 1] = atlas[o + 2] = 255
        atlas[o + 3] = value // SDF distance in the alpha channel
      }
    }
  }

  const texture = gl.createTexture()
  if (texture === null) throw new Error('Failed to create glyph atlas texture')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasW, atlasH, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
  // No mipmaps: SDF cell boundaries would bleed across levels.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  return {
    metrics: {
      advanceEm: advance / FONT_PX,
      glyphBoxEm: [SDF_SIZE / FONT_PX, SDF_SIZE / FONT_PX],
      lineEm: LINE_EM,
      grid: [COLS, rows],
      sdfEdge: 1 - CUTOFF,
      sdfRange: FONT_PX / RADIUS
    },
    bind: () => {
      gl.activeTexture(gl.TEXTURE0 + GLYPH_ATLAS_UNIT)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },
    destroy: () => gl.deleteTexture(texture)
  }
}
