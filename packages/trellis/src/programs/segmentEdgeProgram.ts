import { createProgram, Program } from '.'
import { EDGE_STYLE_UNIT } from '../textures'
import { EDGE_STYLES_GLSL } from '../textures/styleTable'
import { CAMERA_BLOCK } from '../camera'
import { SEGMENT_SDF_GLSL } from '../path'

/**
 * Strokes explicit edge paths analytically: one instance per line or quadratic segment.
 */

export type SegmentEdgeProgram = Program & {
  setSegments: (geometry: Float32Array, widths: Float32Array, styles: Uint16Array) => void
}

const FLOATS_PER_SEGMENT = 7

// prettier-ignore
const UNIT_QUAD = new Float32Array([
  0, 0,
  1, 0,
  0, 1,
  0, 1,
  1, 0,
  1, 1
])

const VERTEX_SHADER = /* glsl */ `#version 300 es
${CAMERA_BLOCK}
${EDGE_STYLES_GLSL}
in vec2 a_quad;    // unit-quad corner in [0,1] — per vertex
in vec2 a_p0;      // segment start (per instance)
in vec2 a_ctrl;    // quad control point (per instance; ignored for lines)
in vec2 a_p1;      // segment end (per instance)
in float a_kind;   // 0 = line, 1 = quad (per instance)
in float a_width;  // edge width, world units (per instance)
in uint a_style;   // edge style pointer (per instance)
flat out vec2 v_p0;
flat out vec2 v_ctrl;
flat out vec2 v_p1;
flat out float v_kind;
flat out float v_halfWidth;
flat out vec4 v_color;
out vec2 v_world;
void main() {
  vec4 color = edgeStyle(a_style, 0); // fill rgba
  float minHalfWidth = 0.5 * u_pixelRatio / u_zoom;
  float halfWidth = max(a_width * 0.5, minHalfWidth);
  float pad = halfWidth + 1.0 / u_zoom;

  // Quadratics are bounded by the convex hull of their three control points.
  vec2 lo = a_kind < 0.5 ? min(a_p0, a_p1) : min(min(a_p0, a_ctrl), a_p1);
  vec2 hi = a_kind < 0.5 ? max(a_p0, a_p1) : max(max(a_p0, a_ctrl), a_p1);
  lo -= pad;
  hi += pad;
  vec2 world = mix(lo, hi, a_quad);

  gl_Position = worldToClip(world);
  v_world = world;
  v_p0 = a_p0;
  v_ctrl = a_ctrl;
  v_p1 = a_p1;
  v_kind = a_kind;
  v_halfWidth = halfWidth;
  v_color = color;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
${SEGMENT_SDF_GLSL}
flat in vec2 v_p0;
flat in vec2 v_ctrl;
flat in vec2 v_p1;
flat in float v_kind;
flat in float v_halfWidth;
flat in vec4 v_color;
in vec2 v_world;
out vec4 outColor;
void main() {
  float coverage;
  if (v_kind < 0.5) {
    // Square caps preserve sharp orthogonal corners.
    vec2 ba = v_p1 - v_p0;
    float len = length(ba);
    vec2 dir = len > 0.0 ? ba / len : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    vec2 d = v_world - v_p0;
    vec2 local = vec2(dot(d, dir), dot(d, nrm)); // (along, perpendicular)
    vec2 q = abs(local - vec2(len * 0.5, 0.0)) - vec2(len * 0.5 + v_halfWidth, v_halfWidth);
    float box = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
    float aa = fwidth(box);
    coverage = clamp(0.5 - box / aa, 0.0, 1.0);
  } else {
    float d = sdQuad(v_world, v_p0, v_ctrl, v_p1);
    float aa = fwidth(d);
    coverage = clamp((v_halfWidth - d) / aa + 0.5, 0.0, 1.0);
  }
  if (coverage <= 0.0) discard;
  outColor = vec4(v_color.rgb, v_color.a * coverage);
}`

export const createSegmentEdgeProgram = (gl: WebGL2RenderingContext): SegmentEdgeProgram => {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')
  const quadBuffer = gl.createBuffer()
  const geometryBuffer = gl.createBuffer()
  const widthBuffer = gl.createBuffer()
  const styleBuffer = gl.createBuffer()
  if (quadBuffer === null || geometryBuffer === null || widthBuffer === null || styleBuffer === null)
    throw new Error('Failed to create buffer')

  const quadLocation = gl.getAttribLocation(program, 'a_quad')
  const p0Location = gl.getAttribLocation(program, 'a_p0')
  const ctrlLocation = gl.getAttribLocation(program, 'a_ctrl')
  const p1Location = gl.getAttribLocation(program, 'a_p1')
  const kindLocation = gl.getAttribLocation(program, 'a_kind')
  const widthLocation = gl.getAttribLocation(program, 'a_width')
  const styleLocation = gl.getAttribLocation(program, 'a_style')
  const float = Float32Array.BYTES_PER_ELEMENT
  const stride = FLOATS_PER_SEGMENT * float

  gl.bindVertexArray(vao)

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(quadLocation)
  gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, geometryBuffer)
  gl.enableVertexAttribArray(p0Location)
  gl.vertexAttribPointer(p0Location, 2, gl.FLOAT, false, stride, 0)
  gl.vertexAttribDivisor(p0Location, 1)
  gl.enableVertexAttribArray(ctrlLocation)
  gl.vertexAttribPointer(ctrlLocation, 2, gl.FLOAT, false, stride, 2 * float)
  gl.vertexAttribDivisor(ctrlLocation, 1)
  gl.enableVertexAttribArray(p1Location)
  gl.vertexAttribPointer(p1Location, 2, gl.FLOAT, false, stride, 4 * float)
  gl.vertexAttribDivisor(p1Location, 1)
  gl.enableVertexAttribArray(kindLocation)
  gl.vertexAttribPointer(kindLocation, 1, gl.FLOAT, false, stride, 6 * float)
  gl.vertexAttribDivisor(kindLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, widthBuffer)
  gl.enableVertexAttribArray(widthLocation)
  gl.vertexAttribPointer(widthLocation, 1, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(widthLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, styleBuffer)
  gl.enableVertexAttribArray(styleLocation)
  gl.vertexAttribIPointer(styleLocation, 1, gl.UNSIGNED_SHORT, 0, 0)
  gl.vertexAttribDivisor(styleLocation, 1)

  gl.bindVertexArray(null)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'u_edgeStyles'), EDGE_STYLE_UNIT)

  let instanceCount = 0

  return {
    setSegments: (geometry, widths, styles) => {
      instanceCount = widths.length
      if (instanceCount === 0) return
      gl.bindBuffer(gl.ARRAY_BUFFER, geometryBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, widthBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, widths, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, styleBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, styles, gl.DYNAMIC_DRAW)
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
      gl.deleteBuffer(geometryBuffer)
      gl.deleteBuffer(widthBuffer)
      gl.deleteBuffer(styleBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
