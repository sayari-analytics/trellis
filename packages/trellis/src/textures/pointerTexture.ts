/**
 * Node-index -> style-pointer lookup, as an integer texture. Lets shaders that are instanced over
 * something *other* than nodes (e.g. the arrow program, instanced over edges) read a node's style by
 * index — so an arrowhead can fetch its target node's strokeWidth and sit at the node's true outer edge.
 *
 * Mirrors the per-element style-pointer vertex attribute the node program uses, but addressable by node
 * index from any shader. Re-uploaded whenever the node style pointers change.
 */
import { TextureData } from '.'

export type PointerTexture = TextureData<Uint16Array>

const TEXTURE_WIDTH = 2048

// GLSL: an integer pointer table fetched by element index
export const NODE_STYLE_POINTER_GLSL = /* glsl */ `uniform highp usampler2D u_nodeStylePointers;
uint nodeStylePointer(int index) {
  int w = textureSize(u_nodeStylePointers, 0).x;
  return texelFetch(u_nodeStylePointers, ivec2(index % w, index / w), 0).r;
}`

// GLSL: a node's visible outer radius by index = floored geometry radius + stroke width (matches the
// node program). Include after the Camera block, RADIUS_GLSL, NODE_STYLES_GLSL, NODE_STYLE_POINTER_GLSL.
export const NODE_OUTER_RADIUS_GLSL = /* glsl */ `float nodeOuterRadius(int index) {
  float radius = nodeRadius(index);
  float strokeWidth = nodeStyle(nodeStylePointer(index), 2).x;
  return max(radius, 1.25 * u_pixelRatio / u_zoom) + strokeWidth;
}`

export const createPointerTexture = (gl: WebGL2RenderingContext, unit: number): PointerTexture => {
  const texture = gl.createTexture()
  if (texture === null) throw new Error('Failed to create pointer texture')

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, 1, 1, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, new Uint16Array(1))

  let scratch = new Uint16Array(0)

  return {
    set: (pointers) => {
      const count = pointers.length
      if (count === 0) return
      const width = Math.min(count, TEXTURE_WIDTH)
      const height = Math.ceil(count / width)
      const texels = width * height
      let data: Uint16Array
      if (count === texels) {
        data = pointers
      } else {
        if (scratch.length < texels) scratch = new Uint16Array(texels)
        scratch.set(pointers)
        data = scratch.subarray(0, texels)
      }
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, width, height, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, data)
    },
    bind: () => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    },
    destroy: () => gl.deleteTexture(texture)
  }
}
