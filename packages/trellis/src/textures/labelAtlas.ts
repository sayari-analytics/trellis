/**
 * Dynamic label atlas for the Unicode fallback path. Any label that isn't pure printable ASCII is
 * rasterized whole by the browser's Canvas2D text engine, which handles non-Latin scripts, diacritics,
 * CJK, bidi/RTL, and shaping. Each such label renders as a single
 * textured quad (see labelProgram + packLabels).
 *
 * Color and font size are baked into the raster, so the cache key includes them; a label restyled to a
 * new size/color simply rasterizes into a fresh cell. The Renderer resets + repacks the atlas whenever
 * label data changes, which also reclaims cells for removed labels.
 */
import { TextureAtlas, createRaster2D, LABEL_ATLAS_UNIT } from '.'

const LABEL_ATLAS_SIZE = 2048 // px; device-resolution glyphs (fontSize * pixelRatio) pack in here
// Bitmap labels are rasterized above zoom-1 size, then scaled back down in the label program.
export const LABEL_RASTER_OVERSAMPLE = 4
const GAP = LABEL_RASTER_OVERSAMPLE // gap between cells so mip levels (down to the oversample) don't bleed

type AtlasRect = { x: number; y: number; w: number; h: number } // device px within the atlas

type LabelStroke = { width: number; color: number; opacity: number } // device-px outline baked into the raster

export type LabelAtlas = TextureAtlas & {
  size: number
  // rasterize (or look up) a string at a device-px font size + color (with an optional baked outline);
  // returns its atlas rect, or null if the atlas is full. `font` is a CSS font suffix (e.g. "sans-serif").
  getRect: (text: string, fontSizePx: number, color: number, opacity: number, font: string, stroke: LabelStroke) => AtlasRect | null
  reset: () => void // clear the packer + canvas (called before a full repack)
  upload: () => void // push the canvas to the GPU texture if it changed since the last upload
}

const cssColor = (hex: number, opacity: number) => {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export const createLabelAtlas = (gl: WebGL2RenderingContext): LabelAtlas => {
  const { canvas, ctx } = createRaster2D(LABEL_ATLAS_SIZE, LABEL_ATLAS_SIZE)

  const texture = gl.createTexture()
  if (texture === null) throw new Error('Failed to create label atlas texture')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LABEL_ATLAS_SIZE, LABEL_ATLAS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

  const cache = new Map<string, AtlasRect>()
  let penX = 0 // current shelf cursor
  let shelfY = 0
  let shelfH = 0
  let dirty = false

  const reset = () => {
    ctx.clearRect(0, 0, LABEL_ATLAS_SIZE, LABEL_ATLAS_SIZE)
    cache.clear()
    penX = shelfY = shelfH = 0
    dirty = true
  }

  const getRect = (
    text: string,
    fontSizePx: number,
    color: number,
    opacity: number,
    font: string,
    stroke: LabelStroke
  ): AtlasRect | null => {
    const key = `${fontSizePx}|${color}|${opacity}|${font}|${stroke.width}|${stroke.color}|${stroke.opacity}|${text}`
    const cached = cache.get(key)
    if (cached !== undefined) return cached

    ctx.font = `${fontSizePx}px ${font}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    // pad the cell so the outline (stroke is centered on the glyph contour: ~half outside) isn't clipped
    const pad = Math.ceil(stroke.width)
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2
    const h = Math.ceil(fontSizePx * 1.35) + pad * 2
    if (w === 0 || w > LABEL_ATLAS_SIZE) return null

    // shelf-pack: advance along the row, drop to a new shelf when the row is full
    if (penX + w > LABEL_ATLAS_SIZE) {
      shelfY += shelfH + GAP
      penX = 0
      shelfH = 0
    }
    if (shelfY + h > LABEL_ATLAS_SIZE) return null // atlas full

    const rect: AtlasRect = { x: penX, y: shelfY, w, h }
    const tx = penX + pad
    const ty = shelfY + pad
    if (stroke.width > 0) {
      ctx.lineWidth = stroke.width
      ctx.strokeStyle = cssColor(stroke.color, stroke.opacity)
      ctx.lineJoin = 'round' // round joins keep the outline smooth at sharp corners
      ctx.miterLimit = 2
      ctx.strokeText(text, tx, ty)
    }
    ctx.fillStyle = cssColor(color, opacity)
    ctx.fillText(text, tx, ty)
    penX += w + GAP
    shelfH = Math.max(shelfH, h)
    dirty = true
    cache.set(key, rect)
    return rect
  }

  return {
    size: LABEL_ATLAS_SIZE,
    getRect,
    reset,
    upload: () => {
      if (!dirty) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
      gl.generateMipmap(gl.TEXTURE_2D)
      dirty = false
    },
    bind: () => {
      gl.activeTexture(gl.TEXTURE0 + LABEL_ATLAS_UNIT)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },
    destroy: () => gl.deleteTexture(texture)
  }
}
