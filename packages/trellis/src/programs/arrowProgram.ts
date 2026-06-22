import { createProgram, Program, ARROW_GLSL } from '.'
import { NODE_STYLE_UNIT, EDGE_STYLE_UNIT, POSITION_TEXTURE_UNIT, NODE_RADIUS_UNIT, NODE_STYLE_POINTER_UNIT } from '../textures'
import { EDGE_STYLES_GLSL, NODE_STYLES_GLSL } from '../textures/styleTable'
import { POSITIONS_GLSL, RADIUS_GLSL } from '../textures/positionTexture'
import { NODE_STYLE_POINTER_GLSL, NODE_OUTER_RADIUS_GLSL } from '../textures/pointerTexture'
import { CAMERA_BLOCK } from '../camera'

/**
 * Edge arrowheads share the edge program's endpoint, width, and style buffers.
 * render() draws target-end heads, then source-end heads.
 */
export type ArrowProgram = Program & {
  setCount: (edgeCount: number) => void
}

type ArrowProgramOptions = {
  edgeBuffer: WebGLBuffer
  widthBuffer: WebGLBuffer
  styleBuffer: WebGLBuffer
}

const VERTEX_SHADER = /* glsl */ `#version 300 es
${CAMERA_BLOCK}
${EDGE_STYLES_GLSL}
${NODE_STYLES_GLSL}
${POSITIONS_GLSL}
${RADIUS_GLSL}
${NODE_STYLE_POINTER_GLSL}
${NODE_OUTER_RADIUS_GLSL}
${ARROW_GLSL}
in uint a_source; // source node index (per instance)
in uint a_target; // target node index (per instance)
in float a_width; // edge width, world units (per instance) — sizes the head
in uint a_style;  // edge style pointer (per instance)
uniform bool u_headAtTarget; // this pass draws the head at the target (else the source) end
out vec4 v_color;
void main() {
  vec4 color = edgeStyle(a_style, 0); // fill rgba
  int code = int(edgeStyle(a_style, 1).x + 0.5); // arrowCode: bit0 = head@target, bit1 = head@source
  bool enabled = u_headAtTarget ? (code == 1 || code == 3) : (code == 2 || code == 3);

  vec2 sp = nodePosition(int(a_source));
  vec2 tp = nodePosition(int(a_target));
  uint headIndex = u_headAtTarget ? a_target : a_source;
  vec2 head = u_headAtTarget ? tp : sp;       // the node the arrow points at
  vec2 tail = u_headAtTarget ? sp : tp;       // the node the edge comes from

  vec2 d = head - tail;
  float len = length(d);
  if (!enabled || len < 1e-4) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // off-screen → clipped (degenerate triangle)
    return;
  }
  vec2 dir = d / len;
  vec2 normal = vec2(-dir.y, dir.x);

  float outerRadius = nodeOuterRadius(int(headIndex));
  float halfWidth = arrowHalfWidth(a_width);
  float length_ = arrowLength(a_width);
  length_ = min(length_, max(0.0, len - outerRadius));

  vec2 tip = head - dir * outerRadius;
  vec2 base = tip - dir * length_;
  vec2 pos = gl_VertexID == 0 ? tip : gl_VertexID == 1 ? base + normal * halfWidth : base - normal * halfWidth;
  gl_Position = worldToClip(pos);
  v_color = color;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}`

export const createArrowProgram = (gl: WebGL2RenderingContext, options: ArrowProgramOptions): ArrowProgram => {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')

  const sourceLocation = gl.getAttribLocation(program, 'a_source')
  const targetLocation = gl.getAttribLocation(program, 'a_target')
  const widthLocation = gl.getAttribLocation(program, 'a_width')
  const styleLocation = gl.getAttribLocation(program, 'a_style')
  const uint = Uint32Array.BYTES_PER_ELEMENT
  const edgeStride = 2 * uint // [src, dst]

  gl.bindVertexArray(vao)

  gl.bindBuffer(gl.ARRAY_BUFFER, options.edgeBuffer)
  gl.enableVertexAttribArray(sourceLocation)
  gl.vertexAttribIPointer(sourceLocation, 1, gl.UNSIGNED_INT, edgeStride, 0)
  gl.vertexAttribDivisor(sourceLocation, 1)
  gl.enableVertexAttribArray(targetLocation)
  gl.vertexAttribIPointer(targetLocation, 1, gl.UNSIGNED_INT, edgeStride, uint)
  gl.vertexAttribDivisor(targetLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, options.widthBuffer)
  gl.enableVertexAttribArray(widthLocation)
  gl.vertexAttribPointer(widthLocation, 1, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(widthLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, options.styleBuffer)
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
  const headAtTargetLocation = gl.getUniformLocation(program, 'u_headAtTarget')

  let instanceCount = 0

  return {
    setCount: (edgeCount) => {
      instanceCount = edgeCount
    },
    render: () => {
      if (instanceCount === 0) return
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.uniform1i(headAtTargetLocation, 1)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, instanceCount)
      gl.uniform1i(headAtTargetLocation, 0)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, instanceCount)
      gl.bindVertexArray(null)
    },
    destroy: () => {
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
