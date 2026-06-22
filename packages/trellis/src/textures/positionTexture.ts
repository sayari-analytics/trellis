/**
 * Node geometry tables, addressed by element index. Split by update frequency:
 *   - positions (x, y) are HOT — re-uploaded on drag / force-layout — so they live alone in an RG32F
 *     texture and support partial (row-range) re-upload via setRange().
 *   - radii (r) are COLD — a separate R32F texture, fully re-uploaded only when a radius changes — so
 *     moving nodes never re-uploads radius.
 *   - edge-label anchors (midX, midY, angle) reuse the same builder as a 3-component RGB32F texture.
 *
 * Programs include POSITIONS_GLSL / RADIUS_GLSL / ANCHORS_GLSL and point the matching sampler at the unit.
 */
import { TextureData, POSITION_TEXTURE_UNIT, NODE_RADIUS_UNIT, EDGE_ANCHOR_TEXTURE_UNIT } from '.'

export type PositionTexture = TextureData<Float32Array> & {
  setRange: (data: Float32Array, fromNode: number, toNode: number) => void
  setSlots: (data: Float32Array, slots: Iterable<number>) => void
}

const TEXTURE_WIDTH = 2048

// GLSL: x, y per node (RG32F)
export const POSITIONS_GLSL = /* glsl */ `uniform sampler2D u_positions;
vec2 nodePosition(int index) {
  int w = textureSize(u_positions, 0).x;
  return texelFetch(u_positions, ivec2(index % w, index / w), 0).xy;
}`

// GLSL: radius per node (R32F)
export const RADIUS_GLSL = /* glsl */ `uniform sampler2D u_radii;
float nodeRadius(int index) {
  int w = textureSize(u_radii, 0).x;
  return texelFetch(u_radii, ivec2(index % w, index / w), 0).r;
}`

// GLSL: a generic [x, y, z] anchor accessor. z is 0 for node positions (RG32F) or the edge angle for
// edge-midpoint anchors (RGB32F), depending on which texture u_anchors points at.
export const ANCHORS_GLSL = /* glsl */ `uniform sampler2D u_anchors;
vec3 anchorPosition(int index) {
  int w = textureSize(u_anchors, 0).x;
  return texelFetch(u_anchors, ivec2(index % w, index / w), 0).xyz;
}`

const formats = (gl: WebGL2RenderingContext, components: number) =>
  components === 1
    ? { internal: gl.R32F, format: gl.RED }
    : components === 2
    ? { internal: gl.RG32F, format: gl.RG }
    : { internal: gl.RGB32F, format: gl.RGB }

const createFloatTexture = (gl: WebGL2RenderingContext, unit: number, components: number): PositionTexture => {
  const { internal, format } = formats(gl, components)
  const texture = gl.createTexture()
  if (texture === null) throw new Error('Failed to create float texture')

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, 1, 1, 0, format, gl.FLOAT, new Float32Array(components))

  let texWidth = 1
  let texHeight = 1
  let scratch = new Float32Array(0)

  const set = (data: Float32Array) => {
    const count = Math.floor(data.length / components)
    const width = Math.max(1, Math.min(count, TEXTURE_WIDTH))
    const height = Math.max(1, Math.ceil(count / width))
    const floats = width * height * components
    let padded: Float32Array
    if (data.length === floats) {
      padded = data
    } else {
      if (scratch.length < floats) scratch = new Float32Array(floats)
      scratch.set(data)
      padded = scratch.subarray(0, floats)
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, gl.FLOAT, padded)
    texWidth = width
    texHeight = height
  }

  const setRange = (data: Float32Array, fromNode: number, toNode: number) => {
    const width = texWidth
    const count = Math.floor(data.length / components)
    const rowFrom = Math.floor(fromNode / width)
    const rowToIncl = Math.min(Math.floor(toNode / width), texHeight - 1)
    const fullRows = Math.floor(count / width)
    gl.bindTexture(gl.TEXTURE_2D, texture)

    // Complete rows upload directly from a view of `data`.
    const completeTo = Math.min(rowToIncl + 1, fullRows)
    if (completeTo > rowFrom) {
      const view = data.subarray(rowFrom * width * components, completeTo * width * components)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, rowFrom, width, completeTo - rowFrom, format, gl.FLOAT, view)
    }
    // Final partial rows need padding to the texture width.
    if (rowToIncl >= fullRows && count % width !== 0) {
      const rowFloats = width * components
      if (scratch.length < rowFloats) scratch = new Float32Array(rowFloats)
      scratch.set(data.subarray(fullRows * width * components))
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, fullRows, width, 1, format, gl.FLOAT, scratch.subarray(0, rowFloats))
    }
  }

  const setSlots = (data: Float32Array, slots: Iterable<number>) => {
    const width = texWidth
    const rows = new Set<number>()
    for (const slot of slots) rows.add(Math.floor(slot / width))
    for (const row of rows) setRange(data, row * width, row * width)
  }

  return {
    set,
    setRange,
    setSlots,
    bind: () => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },
    destroy: () => gl.deleteTexture(texture)
  }
}

export const createPositionTexture = (gl: WebGL2RenderingContext): PositionTexture => createFloatTexture(gl, POSITION_TEXTURE_UNIT, 2)
export const createRadiusTexture = (gl: WebGL2RenderingContext): TextureData<Float32Array> => createFloatTexture(gl, NODE_RADIUS_UNIT, 1)
export const createEdgeAnchorTexture = (gl: WebGL2RenderingContext): TextureData<Float32Array> =>
  createFloatTexture(gl, EDGE_ANCHOR_TEXTURE_UNIT, 3)
