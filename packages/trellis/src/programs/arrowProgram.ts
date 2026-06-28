import { createProgram, Program, ARROW_GLSL } from '.'
import { NODE_STYLE_UNIT, EDGE_STYLE_UNIT, POSITION_TEXTURE_UNIT, NODE_RADIUS_UNIT, NODE_STYLE_POINTER_UNIT } from '../textures'
import { EDGE_STYLES_GLSL, NODE_STYLES_GLSL } from '../textures/styleTable'
import { POSITIONS_GLSL, RADIUS_GLSL } from '../textures/positionTexture'
import { NODE_STYLE_POINTER_GLSL, NODE_OUTER_RADIUS_GLSL } from '../textures/pointerTexture'
import { CAMERA_BLOCK } from '../camera'

/**
 * Edge arrowheads share the edge program's endpoint, width, and style buffers for straight edges, and can
 * additionally receive explicit path endpoint/tangent geometry for routed edges.
 */
export type ArrowProgram = Program & {
  setCount: (edgeCount: number) => void
  setPathArrows: (geometry: Float32Array, nodes: Uint32Array, widths: Float32Array, styles: Uint16Array) => void
}

type ArrowProgramOptions = {
  edgeBuffer: WebGLBuffer
  widthBuffer: WebGLBuffer
  styleBuffer: WebGLBuffer
}

const FLOATS_PER_PATH_ARROW = 8

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
in vec2 a_sourceHead;
in vec2 a_sourceTail;
in vec2 a_targetHead;
in vec2 a_targetTail;
in float a_pathArrow;
uniform bool u_headAtTarget; // this pass draws the head at the target (else the source) end
out vec4 v_color;
void main() {
  vec4 color = edgeStyle(a_style, 0); // fill rgba
  int code = int(edgeStyle(a_style, 1).x + 0.5); // arrowCode: bit0 = head@target, bit1 = head@source
  bool enabled = u_headAtTarget ? (code == 1 || code == 3) : (code == 2 || code == 3);

  vec2 sp = nodePosition(int(a_source));
  vec2 tp = nodePosition(int(a_target));
  uint headIndex = u_headAtTarget ? a_target : a_source;
  vec2 nodeHead = u_headAtTarget ? tp : sp;
  vec2 nodeTail = u_headAtTarget ? sp : tp;
  vec2 pathHead = u_headAtTarget ? a_targetHead : a_sourceHead;
  vec2 pathTail = u_headAtTarget ? a_targetTail : a_sourceTail;
  bool pathArrow = a_pathArrow > 0.5;
  vec2 head = pathArrow ? pathHead : nodeHead;       // the node the arrow points at
  vec2 tail = pathArrow ? pathTail : nodeTail;       // the edge tangent before the head

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
  const pathGeometryBuffer = gl.createBuffer()
  const pathNodeBuffer = gl.createBuffer()
  const pathWidthBuffer = gl.createBuffer()
  const pathStyleBuffer = gl.createBuffer()
  const pathFlagBuffer = gl.createBuffer()
  if (
    pathGeometryBuffer === null ||
    pathNodeBuffer === null ||
    pathWidthBuffer === null ||
    pathStyleBuffer === null ||
    pathFlagBuffer === null
  )
    throw new Error('Failed to create buffer')

  const sourceLocation = gl.getAttribLocation(program, 'a_source')
  const targetLocation = gl.getAttribLocation(program, 'a_target')
  const widthLocation = gl.getAttribLocation(program, 'a_width')
  const styleLocation = gl.getAttribLocation(program, 'a_style')
  const sourceHeadLocation = gl.getAttribLocation(program, 'a_sourceHead')
  const sourceTailLocation = gl.getAttribLocation(program, 'a_sourceTail')
  const targetHeadLocation = gl.getAttribLocation(program, 'a_targetHead')
  const targetTailLocation = gl.getAttribLocation(program, 'a_targetTail')
  const pathArrowLocation = gl.getAttribLocation(program, 'a_pathArrow')
  const float = Float32Array.BYTES_PER_ELEMENT
  const uint = Uint32Array.BYTES_PER_ELEMENT
  const edgeStride = 2 * uint // [src, dst]
  const pathGeometryStride = FLOATS_PER_PATH_ARROW * float

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

  gl.disableVertexAttribArray(sourceHeadLocation)
  gl.vertexAttrib2f(sourceHeadLocation, 0, 0)
  gl.disableVertexAttribArray(sourceTailLocation)
  gl.vertexAttrib2f(sourceTailLocation, 0, 0)
  gl.disableVertexAttribArray(targetHeadLocation)
  gl.vertexAttrib2f(targetHeadLocation, 0, 0)
  gl.disableVertexAttribArray(targetTailLocation)
  gl.vertexAttrib2f(targetTailLocation, 0, 0)
  gl.disableVertexAttribArray(pathArrowLocation)
  gl.vertexAttrib1f(pathArrowLocation, 0)

  gl.bindVertexArray(null)

  const pathVao = gl.createVertexArray()
  if (pathVao === null) throw new Error('Failed to create vertex array')
  gl.bindVertexArray(pathVao)

  gl.bindBuffer(gl.ARRAY_BUFFER, pathGeometryBuffer)
  gl.enableVertexAttribArray(sourceHeadLocation)
  gl.vertexAttribPointer(sourceHeadLocation, 2, gl.FLOAT, false, pathGeometryStride, 0)
  gl.vertexAttribDivisor(sourceHeadLocation, 1)
  gl.enableVertexAttribArray(sourceTailLocation)
  gl.vertexAttribPointer(sourceTailLocation, 2, gl.FLOAT, false, pathGeometryStride, 2 * float)
  gl.vertexAttribDivisor(sourceTailLocation, 1)
  gl.enableVertexAttribArray(targetHeadLocation)
  gl.vertexAttribPointer(targetHeadLocation, 2, gl.FLOAT, false, pathGeometryStride, 4 * float)
  gl.vertexAttribDivisor(targetHeadLocation, 1)
  gl.enableVertexAttribArray(targetTailLocation)
  gl.vertexAttribPointer(targetTailLocation, 2, gl.FLOAT, false, pathGeometryStride, 6 * float)
  gl.vertexAttribDivisor(targetTailLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, pathNodeBuffer)
  gl.enableVertexAttribArray(sourceLocation)
  gl.vertexAttribIPointer(sourceLocation, 1, gl.UNSIGNED_INT, edgeStride, 0)
  gl.vertexAttribDivisor(sourceLocation, 1)
  gl.enableVertexAttribArray(targetLocation)
  gl.vertexAttribIPointer(targetLocation, 1, gl.UNSIGNED_INT, edgeStride, uint)
  gl.vertexAttribDivisor(targetLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, pathWidthBuffer)
  gl.enableVertexAttribArray(widthLocation)
  gl.vertexAttribPointer(widthLocation, 1, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(widthLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, pathStyleBuffer)
  gl.enableVertexAttribArray(styleLocation)
  gl.vertexAttribIPointer(styleLocation, 1, gl.UNSIGNED_SHORT, 0, 0)
  gl.vertexAttribDivisor(styleLocation, 1)

  gl.bindBuffer(gl.ARRAY_BUFFER, pathFlagBuffer)
  gl.enableVertexAttribArray(pathArrowLocation)
  gl.vertexAttribPointer(pathArrowLocation, 1, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(pathArrowLocation, 1)

  gl.bindVertexArray(null)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'u_edgeStyles'), EDGE_STYLE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_nodeStyles'), NODE_STYLE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_positions'), POSITION_TEXTURE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_radii'), NODE_RADIUS_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_nodeStylePointers'), NODE_STYLE_POINTER_UNIT)
  const headAtTargetLocation = gl.getUniformLocation(program, 'u_headAtTarget')

  let instanceCount = 0
  let pathInstanceCount = 0

  return {
    setCount: (edgeCount) => {
      instanceCount = edgeCount
    },
    setPathArrows: (geometry, nodes, widths, styles) => {
      pathInstanceCount = widths.length
      if (pathInstanceCount === 0) return
      gl.bindBuffer(gl.ARRAY_BUFFER, pathGeometryBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, pathNodeBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, pathWidthBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, widths, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, pathStyleBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, styles, gl.DYNAMIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, pathFlagBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pathInstanceCount).fill(1), gl.DYNAMIC_DRAW)
    },
    render: () => {
      if (instanceCount === 0 && pathInstanceCount === 0) return
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(program)
      if (instanceCount > 0) {
        gl.bindVertexArray(vao)
        gl.uniform1i(headAtTargetLocation, 1)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, instanceCount)
        gl.uniform1i(headAtTargetLocation, 0)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, instanceCount)
      }
      if (pathInstanceCount > 0) {
        gl.bindVertexArray(pathVao)
        gl.uniform1i(headAtTargetLocation, 1)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, pathInstanceCount)
        gl.uniform1i(headAtTargetLocation, 0)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, pathInstanceCount)
      }
      gl.bindVertexArray(null)
    },
    destroy: () => {
      gl.deleteBuffer(pathGeometryBuffer)
      gl.deleteBuffer(pathNodeBuffer)
      gl.deleteBuffer(pathWidthBuffer)
      gl.deleteBuffer(pathStyleBuffer)
      gl.deleteBuffer(pathFlagBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteVertexArray(pathVao)
      gl.deleteProgram(program)
    }
  }
}
