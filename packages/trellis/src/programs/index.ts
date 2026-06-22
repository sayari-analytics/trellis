import { CAMERA_BINDING } from '../camera'

export type Program = {
  render: () => void
  destroy: () => void
}

// arrow-head size from edge width, shared by the arrow program (geometry) and the edge program (which
// trims its line to the arrow base). Requires the Camera block (u_pixelRatio / u_zoom) to be included.
export const ARROW_GLSL = /* glsl */ `\
float arrowHalfWidth(float width) { return max(width * 1.6, 1.5 * u_pixelRatio / u_zoom); }
float arrowLength(float width) { return arrowHalfWidth(width) * 2.2; }`

// Higher slot index is nearer; icon programs use the same mapping for node-body occlusion.
export const NODE_DEPTH_GLSL = /* glsl */ `\
uniform float u_nodeCount;
float nodeDepth(int slot) {
  return u_nodeCount > 0.0 ? 1.0 - 2.0 * (float(slot) + 0.5) / u_nodeCount : 0.0;
}`

const compileShader = (
  gl: WebGL2RenderingContext,
  type: WebGL2RenderingContext['VERTEX_SHADER'] | WebGL2RenderingContext['FRAGMENT_SHADER'],
  source: string
) => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create WebGLShader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: "${info}"`)
  }

  return shader
}

export const createProgram = (gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create WebGLProgram')

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link error: "${info}"`)
  }

  const cameraIndex = gl.getUniformBlockIndex(program, 'Camera')
  if (cameraIndex !== gl.INVALID_INDEX) gl.uniformBlockBinding(program, cameraIndex, CAMERA_BINDING)

  return program
}
