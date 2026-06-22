import { createProgram, Program } from '.'
import { red, green, blue, alpha } from '../textures'
import { CAMERA_BLOCK } from '../camera'
import type { Annotation } from '../state'

export type AnnotationProgram = Program & {
  // replace the whole annotation set (small + transient, so it re-uploads as one instance buffer)
  setAnnotations: (annotations: Annotation[]) => void
}

// per-instance layout (one shape per instance), 32 bytes:
//   f32 centerX | f32 centerY | f32 halfW | f32 halfH | f32 strokeWidth | u32 fill | u32 stroke | u32 type
// fill/stroke are packed 0xRRGGBBAA; type is 0 = circle, 1 = rectangle (2 = text, reserved for the future)
const INSTANCE_BYTES = 32
const FLOATS_PER_INSTANCE = INSTANCE_BYTES / 4

// hex color (0xRRGGBB / 0xAARRGGBB) -> packed 0xRRGGBBAA uint, mirroring the texture-table channel helpers
const packRGBA = (hex: number): number =>
  ((Math.round(red(hex) * 255) << 24) |
    (Math.round(green(hex) * 255) << 16) |
    (Math.round(blue(hex) * 255) << 8) |
    Math.round(alpha(hex) * 255)) >>>
  0

// unit quad in [-1, 1] — the shape's bounding box (scaled to half-size + AA pad), shared by every instance
// prettier-ignore
const UNIT_QUAD = new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1
])

const VERTEX_SHADER = /* glsl */ `#version 300 es
${CAMERA_BLOCK}
in vec2 a_quad;        // unit-quad corner in [-1, 1] (per vertex)
in vec2 a_center;      // shape center, world units (per instance)
in vec2 a_halfSize;    // half-extents, world units; for a circle both = radius (per instance)
in float a_strokeWidth;// stroke width, world units (per instance)
in uint a_fill;        // packed 0xRRGGBBAA (per instance)
in uint a_stroke;      // packed 0xRRGGBBAA (per instance)
in uint a_type;        // 0 = circle, 1 = rectangle (per instance)
out vec2 v_offset;     // world-space offset from the center
out vec2 v_halfSize;
out float v_strokeWidth;
out vec4 v_fill;
out vec4 v_stroke;
flat out uint v_type;
vec4 unpackColor(uint c) {
  return vec4(float((c >> 24) & 0xFFu), float((c >> 16) & 0xFFu), float((c >> 8) & 0xFFu), float(c & 0xFFu)) / 255.0;
}
void main() {
  // pad the quad ~1 device px past the outer edge so the AA falloff isn't clipped
  vec2 extent = a_halfSize + 1.0 / u_zoom;
  v_offset = a_quad * extent;
  gl_Position = worldToClip(a_center + v_offset);
  v_halfSize = a_halfSize;
  v_strokeWidth = a_strokeWidth;
  v_fill = unpackColor(a_fill);
  v_stroke = unpackColor(a_stroke);
  v_type = a_type;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_offset;
in vec2 v_halfSize;
in float v_strokeWidth;
in vec4 v_fill;
in vec4 v_stroke;
flat in uint v_type;
out vec4 outColor;
void main() {
  // signed distance to the shape edge, world units (negative inside)
  float d;
  if (v_type == 0u) {
    d = length(v_offset) - v_halfSize.x; // circle (radius = halfSize.x)
  } else {
    vec2 q = abs(v_offset) - v_halfSize;  // box SDF
    d = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
  }
  // accurate gradient magnitude for ~1px antialiasing at any render scale
  float aa = max(length(vec2(dFdx(d), dFdy(d))), 1e-6);
  float coverage = clamp(-d / aa + 0.5, 0.0, 1.0);
  if (coverage <= 0.0) discard;
  // stroke occupies the inner band [-strokeWidth, 0]; the interior is fill
  float strokeMix = v_strokeWidth > 0.0 ? clamp((d + v_strokeWidth) / aa + 0.5, 0.0, 1.0) : 0.0;
  vec4 c = mix(v_fill, v_stroke, strokeMix);
  outColor = vec4(c.rgb, c.a * coverage);
}`

export const createAnnotationProgram = (gl: WebGL2RenderingContext): AnnotationProgram => {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')
  const quadBuffer = gl.createBuffer()
  const instanceBuffer = gl.createBuffer() // interleaved per-instance data (see INSTANCE_BYTES layout)
  if (quadBuffer === null || instanceBuffer === null) throw new Error('Failed to create buffer')

  const quadLocation = gl.getAttribLocation(program, 'a_quad')
  const centerLocation = gl.getAttribLocation(program, 'a_center')
  const halfSizeLocation = gl.getAttribLocation(program, 'a_halfSize')
  const strokeWidthLocation = gl.getAttribLocation(program, 'a_strokeWidth')
  const fillLocation = gl.getAttribLocation(program, 'a_fill')
  const strokeLocation = gl.getAttribLocation(program, 'a_stroke')
  const typeLocation = gl.getAttribLocation(program, 'a_type')

  gl.bindVertexArray(vao)

  // base geometry: unit quad, shared by every instance (divisor 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(quadLocation)
  gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

  // per-instance attributes, all reading from the one interleaved buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
  gl.enableVertexAttribArray(centerLocation)
  gl.vertexAttribPointer(centerLocation, 2, gl.FLOAT, false, INSTANCE_BYTES, 0)
  gl.vertexAttribDivisor(centerLocation, 1)
  gl.enableVertexAttribArray(halfSizeLocation)
  gl.vertexAttribPointer(halfSizeLocation, 2, gl.FLOAT, false, INSTANCE_BYTES, 8)
  gl.vertexAttribDivisor(halfSizeLocation, 1)
  gl.enableVertexAttribArray(strokeWidthLocation)
  gl.vertexAttribPointer(strokeWidthLocation, 1, gl.FLOAT, false, INSTANCE_BYTES, 16)
  gl.vertexAttribDivisor(strokeWidthLocation, 1)
  gl.enableVertexAttribArray(fillLocation)
  gl.vertexAttribIPointer(fillLocation, 1, gl.UNSIGNED_INT, INSTANCE_BYTES, 20)
  gl.vertexAttribDivisor(fillLocation, 1)
  gl.enableVertexAttribArray(strokeLocation)
  gl.vertexAttribIPointer(strokeLocation, 1, gl.UNSIGNED_INT, INSTANCE_BYTES, 24)
  gl.vertexAttribDivisor(strokeLocation, 1)
  gl.enableVertexAttribArray(typeLocation)
  gl.vertexAttribIPointer(typeLocation, 1, gl.UNSIGNED_INT, INSTANCE_BYTES, 28)
  gl.vertexAttribDivisor(typeLocation, 1)

  gl.bindVertexArray(null)

  let instanceCount = 0

  return {
    setAnnotations: (annotations) => {
      instanceCount = annotations.length
      if (instanceCount === 0) return
      const buffer = new ArrayBuffer(instanceCount * INSTANCE_BYTES)
      const f32 = new Float32Array(buffer)
      const u32 = new Uint32Array(buffer)
      for (let i = 0; i < annotations.length; i++) {
        const a = annotations[i]
        const o = i * FLOATS_PER_INSTANCE
        f32[o] = a.x
        f32[o + 1] = a.y
        if (a.type === 'circle') {
          f32[o + 2] = a.radius
          f32[o + 3] = a.radius
          u32[o + 7] = 0
        } else {
          f32[o + 2] = a.width / 2
          f32[o + 3] = a.height / 2
          u32[o + 7] = 1
        }
        f32[o + 4] = a.style.strokeWidth ?? 0
        u32[o + 5] = a.style.fillColor === undefined ? 0 : packRGBA(a.style.fillColor)
        u32[o + 6] = a.style.strokeColor === undefined ? 0 : packRGBA(a.style.strokeColor)
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW)
    },
    render: () => {
      if (instanceCount === 0) return
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount)
      gl.bindVertexArray(null)
    },
    destroy: () => {
      gl.deleteBuffer(quadBuffer)
      gl.deleteBuffer(instanceBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
