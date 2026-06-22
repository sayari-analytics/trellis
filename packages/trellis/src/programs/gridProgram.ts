import { createProgram, Program } from '.'
import { CAMERA_BLOCK } from '../camera'

const GRID_SPACING = 100
const THIN_WIDTH = 1
const THICK_WIDTH = 3
const THIN_COLOR: [number, number, number] = [0.85, 0.85, 0.85]
const THICK_COLOR: [number, number, number] = [0.2, 0.2, 0.2]
const BACKGROUND: [number, number, number] = [1, 1, 1]

// prettier-ignore
const QUAD = new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1
])

const VERTEX_SHADER = /* glsl */ `#version 300 es
${CAMERA_BLOCK}
in vec2 a_clip;
out vec2 v_world;
void main() {
  gl_Position = vec4(a_clip, 0.0, 1.0);
  v_world = clipToWorld(a_clip);
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_world;
out vec4 outColor;

const float SPACING = ${GRID_SPACING.toFixed(1)};
const vec3 BACKGROUND = vec3(${BACKGROUND.map((c) => c.toFixed(4)).join(', ')});
const vec3 THIN_COLOR = vec3(${THIN_COLOR.map((c) => c.toFixed(4)).join(', ')});
const vec3 THICK_COLOR = vec3(${THICK_COLOR.map((c) => c.toFixed(4)).join(', ')});

// anti-aliased coverage of a line of the given pixel width at distance 'world' (world units),
// using screen-space derivatives so the line stays a constant pixel width at any zoom
float coverage(float world, float pixelWidth) {
  float pixels = world / fwidth(v_world.x); // distance to the line in device pixels (isotropic grid)
  float halfWidth = pixelWidth * 0.5;
  return 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, pixels);
}

// distance (world units) from coord to the nearest multiple of SPACING
float toNearestLine(float coord) {
  return abs(mod(coord + SPACING * 0.5, SPACING) - SPACING * 0.5);
}

void main() {
  float thin = max(coverage(toNearestLine(v_world.x), ${THIN_WIDTH.toFixed(1)}), coverage(toNearestLine(v_world.y), ${THIN_WIDTH.toFixed(
    1
  )}));
  float thick = max(coverage(abs(v_world.x), ${THICK_WIDTH.toFixed(1)}), coverage(abs(v_world.y), ${THICK_WIDTH.toFixed(1)}));
  vec3 color = mix(BACKGROUND, THIN_COLOR, thin);
  color = mix(color, THICK_COLOR, thick); // axes drawn on top of the thin grid
  outColor = vec4(color, 1.0);
}`

export const createGridProgram = (gl: WebGL2RenderingContext): Program => {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')

  const buffer = gl.createBuffer()
  if (buffer === null) throw new Error('Failed to create buffer')

  const clipLocation = gl.getAttribLocation(program, 'a_clip')

  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(clipLocation)
  gl.vertexAttribPointer(clipLocation, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  return {
    // the camera lives in the shared UBO, so the grid is just a constant-cost fullscreen draw
    render: () => {
      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.bindVertexArray(null)
    },
    destroy: () => {
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
