/**
 * Shared texture infrastructure: texture units, base interfaces, color helpers, raster surface,
 * and generic indexed style palettes.
 */

// --- texture unit allocation ---
export const NODE_STYLE_UNIT = 0
export const POSITION_TEXTURE_UNIT = 1
export const EDGE_STYLE_UNIT = 2
export const GLYPH_ATLAS_UNIT = 3
export const LABEL_ATLAS_UNIT = 4
export const NODE_LABEL_STYLE_UNIT = 5
export const EDGE_LABEL_STYLE_UNIT = 6
export const EDGE_ANCHOR_TEXTURE_UNIT = 7
export const ICON_STYLE_UNIT = 8
export const NODE_STYLE_POINTER_UNIT = 9
export const NODE_RADIUS_UNIT = 10

// bind() makes the texture active on its unit (called once per frame); destroy() releases it.
export type TextureData<T> = { set: (data: T) => void; bind: () => void; destroy: () => void } // direct per-element data
export type TextureTable<T> = TextureData<(T | undefined)[]> // an indexed palette: one row per element of T (undefined rows pack the default — tombstoned style slots)
export type TextureAtlas = { bind: () => void; destroy: () => void } // a packed image, sampled by UV (no uniform set)

// Style colors use the low 24 bits as RGB (0xRRGGBB). `alpha` remains for non-style packed colors such
// as export backgrounds, where callers may pass 0xAARRGGBB.
export const red = (hex: number) => ((hex >> 16) & 0xff) / 255
export const green = (hex: number) => ((hex >> 8) & 0xff) / 255
export const blue = (hex: number) => (hex & 0xff) / 255
export const alpha = (hex: number) => (hex > 0xffffff ? ((hex >>> 24) & 0xff) / 255 : 1)

/**
 * A 2D rasterization surface for text (glyph SDF generation + the dynamic label atlas).
 */
export const createRaster2D = (width: number, height: number, willReadFrequently = false) => {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently })
  if (ctx === null) throw new Error('Failed to get a 2D rasterization context')
  return { canvas, ctx }
}

/**
 * Build a TextureTable: an index-addressable RGBA32F palette, one row per element, `texels` texels wide,
 * fetched in shaders by a uint pointer. The style tables (styleTable.ts) are all built on this — they
 * differ only in how an element packs into its row.
 */

// GLSL: declare a style sampler and a row/texel accessor (style pointer is a uint)
export const stylesGLSL = (sampler: string, accessor: string) => /* glsl */ `uniform sampler2D ${sampler};
vec4 ${accessor}(uint id, int texel) {
  int row = clamp(int(id), 0, textureSize(${sampler}, 0).y - 1);
  return texelFetch(${sampler}, ivec2(texel, row), 0);
}`

// `pack` receives `undefined` for the seeded default row.
export const createTextureTable = <T>(
  gl: WebGL2RenderingContext,
  unit: number,
  texels: number,
  pack: (data: Float32Array, offset: number, element: T | undefined) => void
): TextureTable<T> => {
  const floatsPerRow = texels * 4
  const texture = gl.createTexture()
  if (texture === null) throw new Error('Failed to create texture table')

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const set = (elements: (T | undefined)[]) => {
    const list: (T | undefined)[] = elements.length === 0 ? [undefined] : elements
    const data = new Float32Array(list.length * floatsPerRow)
    for (let i = 0; i < list.length; i++) pack(data, i * floatsPerRow, list[i])
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texels, list.length, 0, gl.RGBA, gl.FLOAT, data)
  }

  set([])

  return {
    set,
    bind: () => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },
    destroy: () => gl.deleteTexture(texture)
  }
}
