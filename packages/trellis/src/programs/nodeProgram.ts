import { createProgram, Program, NODE_DEPTH_GLSL } from '.'
import { NODE_STYLE_UNIT, POSITION_TEXTURE_UNIT, NODE_RADIUS_UNIT, NODE_STYLE_POINTER_UNIT } from '../textures'
import { NODE_STYLES_GLSL } from '../textures/styleTable'
import { POSITIONS_GLSL, RADIUS_GLSL } from '../textures/positionTexture'
import { NODE_STYLE_POINTER_GLSL } from '../textures/pointerTexture'
import { CAMERA_BLOCK } from '../camera'

export type NodeProgram = Program & {
  setCount: (count: number) => void
}

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
${NODE_STYLES_GLSL}
${POSITIONS_GLSL}
${RADIUS_GLSL}
${NODE_STYLE_POINTER_GLSL}
${NODE_DEPTH_GLSL}
in vec2 a_quad;    // unit-quad corner in [-1, 1] (per vertex)
out vec2 v_offset; // world-space offset from the node center
out float v_radius;
out float v_strokeWidth;
out vec4 v_color;
out vec4 v_strokeColor;
void main() {
  vec2 center = nodePosition(gl_InstanceID);
  uint stylePtr = nodeStylePointer(gl_InstanceID);
  vec4 fill = nodeStyle(stylePtr, 0);   // fill rgba
  vec4 stroke = nodeStyle(stylePtr, 1); // stroke rgba
  float strokeWidth = nodeStyle(stylePtr, 2).x;

  float minRadius = 1.25 * u_pixelRatio / u_zoom;
  float radius = max(nodeRadius(gl_InstanceID), minRadius);
  float extent = radius + strokeWidth + 1.0 / u_zoom;
  v_offset = a_quad * extent;
  gl_Position = worldToClip(center + v_offset);
  gl_Position.z = nodeDepth(gl_InstanceID) * gl_Position.w;
  v_radius = radius;
  v_strokeWidth = strokeWidth;
  v_color = fill;
  v_strokeColor = stroke;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_offset;
in float v_radius;
in float v_strokeWidth;
in vec4 v_color;
in vec4 v_strokeColor;
out vec4 outColor;
void main() {
  float dist = length(v_offset); // world units from center
  // Radial gradient magnitude; fwidth(dist) overestimates by up to sqrt(2).
  float aa = max(length(vec2(dFdx(dist), dFdy(dist))), 1e-6);
  float outer = v_radius + v_strokeWidth;
  float coverage = clamp((outer - dist) / aa + 0.5, 0.0, 1.0);
  if (coverage <= 0.0) discard;
  float strokeMix = v_strokeWidth > 0.0 ? clamp((dist - v_radius) / aa + 0.5, 0.0, 1.0) : 0.0;
  vec4 c = mix(v_color, v_strokeColor, strokeMix);
  outColor = vec4(c.rgb, c.a * coverage);
}`

export const createNodeProgram = (gl: WebGL2RenderingContext): NodeProgram => {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')
  const quadBuffer = gl.createBuffer()
  if (quadBuffer === null) throw new Error('Failed to create buffer')

  const quadLocation = gl.getAttribLocation(program, 'a_quad')

  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(quadLocation)
  gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'u_nodeStyles'), NODE_STYLE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_positions'), POSITION_TEXTURE_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_radii'), NODE_RADIUS_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_nodeStylePointers'), NODE_STYLE_POINTER_UNIT)
  const nodeCountLocation = gl.getUniformLocation(program, 'u_nodeCount')

  let instanceCount = 0

  return {
    setCount: (count) => {
      instanceCount = count
      gl.useProgram(program)
      gl.uniform1f(nodeCountLocation, count)
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
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
