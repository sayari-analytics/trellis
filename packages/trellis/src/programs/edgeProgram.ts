import { createProgram, Program, ARROW_GLSL } from '.'
import { NODE_STYLE_UNIT, EDGE_STYLE_UNIT, POSITION_TEXTURE_UNIT, NODE_RADIUS_UNIT, NODE_STYLE_POINTER_UNIT } from '../textures'
import { EDGE_STYLES_GLSL, NODE_STYLES_GLSL } from '../textures/styleTable'
import { POSITIONS_GLSL, RADIUS_GLSL } from '../textures/positionTexture'
import { NODE_STYLE_POINTER_GLSL, NODE_OUTER_RADIUS_GLSL } from '../textures/pointerTexture'
import { CAMERA_BLOCK } from '../camera'

export type EdgeProgram = Program & {
  setEdges: (edges: Uint32Array) => void
  setWidths: (widths: Float32Array) => void
  setStyles: (styles: Uint16Array) => void
  edgeBuffer: WebGLBuffer
  widthBuffer: WebGLBuffer
  styleBuffer: WebGLBuffer
}

// unit quad spanning the segment: x = t along the edge (0=source, 1=target), y = side in [-1, 1]
// prettier-ignore
const UNIT_QUAD = new Float32Array([
  0, -1,
  1, -1,
  0,  1,
  0,  1,
  1, -1,
  1,  1
])

const VERTEX_SHADER = /* glsl */ `#version 300 es
${CAMERA_BLOCK}
${EDGE_STYLES_GLSL}
${NODE_STYLES_GLSL}
${POSITIONS_GLSL}
${RADIUS_GLSL}
${NODE_STYLE_POINTER_GLSL}
${NODE_OUTER_RADIUS_GLSL}
${ARROW_GLSL}
in vec2 a_quad;    // (t along edge, side) — per vertex
in uint a_source;  // source node index (per instance)
in uint a_target;  // target node index (per instance)
in float a_width;  // edge width, world units (per instance)
in uint a_style;   // edge style pointer (per instance)
out float v_dist;    // signed world distance from the centerline
out float v_halfWidth;
out vec4 v_color;
void main() {
  // resolve endpoints from the shared position table by node index
  vec2 source = nodePosition(int(a_source));
  vec2 target = nodePosition(int(a_target));
  vec4 color = edgeStyle(a_style, 0); // fill rgba
  int arrowCode = int(edgeStyle(a_style, 1).x + 0.5); // bit0 = head@target, bit1 = head@source
  float minHalfWidth = 0.5 * u_pixelRatio / u_zoom;
  float halfWidth = max(a_width * 0.5, minHalfWidth);
  float quadHalfWidth = halfWidth + 1.0 / u_zoom;

  vec2 dir = target - source;
  float len = length(dir);
  vec2 unit = len > 0.0 ? dir / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-unit.y, unit.x);

  float rawHead = arrowLength(a_width);
  float orSource = nodeOuterRadius(int(a_source));
  float orTarget = nodeOuterRadius(int(a_target));
  float trimSource = orSource + ((arrowCode == 2 || arrowCode == 3) ? min(rawHead, max(0.0, len - orSource)) : 0.0);
  float trimTarget = orTarget + ((arrowCode == 1 || arrowCode == 3) ? min(rawHead, max(0.0, len - orTarget)) : 0.0);
  if (trimSource + trimTarget >= len) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // trims overlap (nodes too close / collapsed edge) → drop it
    return;
  }
  vec2 a = source + unit * trimSource;
  vec2 b = target - unit * trimTarget;

  vec2 world = mix(a, b, a_quad.x) + normal * (a_quad.y * quadHalfWidth);
  gl_Position = worldToClip(world);
  v_dist = a_quad.y * quadHalfWidth;
  v_halfWidth = halfWidth;
  v_color = color;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in float v_dist;
in float v_halfWidth;
in vec4 v_color;
out vec4 outColor;
void main() {
  float aa = fwidth(v_dist);
  float coverage = clamp((v_halfWidth - abs(v_dist)) / aa + 0.5, 0.0, 1.0);
  if (coverage <= 0.0) discard;
  outColor = vec4(v_color.rgb, v_color.a * coverage);
}`

export const createEdgeProgram = (gl: WebGL2RenderingContext): EdgeProgram => {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')
  const quadBuffer = gl.createBuffer()
  const edgeBuffer = gl.createBuffer() // interleaved [src, dst] Uint32 per edge
  const widthBuffer = gl.createBuffer() // width Float32 per edge
  const styleBuffer = gl.createBuffer()
  if (quadBuffer === null || edgeBuffer === null || widthBuffer === null || styleBuffer === null) throw new Error('Failed to create buffer')

  const quadLocation = gl.getAttribLocation(program, 'a_quad')
  const sourceLocation = gl.getAttribLocation(program, 'a_source')
  const targetLocation = gl.getAttribLocation(program, 'a_target')
  const widthLocation = gl.getAttribLocation(program, 'a_width')
  const styleLocation = gl.getAttribLocation(program, 'a_style')
  const uint = Uint32Array.BYTES_PER_ELEMENT
  const edgeStride = 2 * uint // [src, dst]

  gl.bindVertexArray(vao)

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(quadLocation)
  gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer)
  gl.enableVertexAttribArray(sourceLocation)
  gl.vertexAttribIPointer(sourceLocation, 1, gl.UNSIGNED_INT, edgeStride, 0)
  gl.vertexAttribDivisor(sourceLocation, 1)
  gl.enableVertexAttribArray(targetLocation)
  gl.vertexAttribIPointer(targetLocation, 1, gl.UNSIGNED_INT, edgeStride, uint)
  gl.vertexAttribDivisor(targetLocation, 1)

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
  gl.uniform1i(gl.getUniformLocation(program, 'u_nodeStyles'), NODE_STYLE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_positions'), POSITION_TEXTURE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_radii'), NODE_RADIUS_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_nodeStylePointers'), NODE_STYLE_POINTER_UNIT)

  let instanceCount = 0

  return {
    edgeBuffer,
    widthBuffer,
    styleBuffer,
    setEdges: (edges) => {
      instanceCount = edges.length / 2
      if (instanceCount === 0) return
      gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, edges, gl.STATIC_DRAW)
    },
    setWidths: (widths) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, widthBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, widths, gl.DYNAMIC_DRAW)
    },
    setStyles: (styles) => {
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
      gl.deleteBuffer(edgeBuffer)
      gl.deleteBuffer(widthBuffer)
      gl.deleteBuffer(styleBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
