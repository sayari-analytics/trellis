import { createProgram, Program, NODE_DEPTH_GLSL } from '.'
import { ANCHORS_GLSL, RADIUS_GLSL } from '../textures/positionTexture'
import { LABEL_STYLES_GLSL } from '../textures/styleTable'
import { LABEL_ATLAS_UNIT, NODE_RADIUS_UNIT } from '../textures'
import { LABEL_RASTER_OVERSAMPLE } from '../textures/labelAtlas'
import { CAMERA_BLOCK } from '../camera'

export type LabelProgram = Program & {
  setInstances: (buffer: ArrayBuffer, count: number) => void
  setNodeCount: (count: number) => void
}

type LabelProgramOptions = {
  anchorUnit: number
  labelStyleUnit: number
  atlasSize: number
  rotate?: boolean
  depth?: boolean
}

// prettier-ignore
const CORNERS = new Float32Array([
  0, 0,  1, 0,  0, 1,
  0, 1,  1, 0,  1, 1
])

const vertexShader = (depth: boolean) => /* glsl */ `#version 300 es
${CAMERA_BLOCK}
${ANCHORS_GLSL}
${RADIUS_GLSL}
${LABEL_STYLES_GLSL}
${depth ? NODE_DEPTH_GLSL : ''}
in vec2 a_corner;   // quad corner in [0, 1] (per vertex)
in uint a_element;  // element index -> anchor table (per instance)
in uint a_style;    // label style pointer (per instance) — color/size are baked into the raster
in uvec4 a_rect;    // atlas cell (x, y, w, h) in device px (per instance)
uniform float u_atlasSize;
uniform bool u_rotate; // edge labels: anchor.z is the edge angle (radians); rotate the label by it
out vec2 v_uv;
void main() {
  vec4 s1 = labelStyle(a_style, 1); // positionCode, margin (CSS px)
  vec4 s3 = labelStyle(a_style, 3); // angle radians
  int posCode = int(s1.x + 0.5);
  int anchorCode = int(s3.y + 0.5);
  float margin = s1.y;

  vec3 anchor = anchorPosition(int(a_element)); // xy world; z = 0 (node positions) or angle (edge anchors)
  float radiusPx = u_rotate ? 0.0 : nodeRadius(int(a_element)) * u_zoom;
  vec2 boxPx = vec2(float(a_rect.z), float(a_rect.w)) * (u_zoom * ${(1 / LABEL_RASTER_OVERSAMPLE).toFixed(6)});

  vec2 dir = vec2(0.0);
  if (posCode == 1) dir = vec2(0.0, 1.0);       // top
  else if (posCode == 2) dir = vec2(0.0, -1.0); // bottom
  else if (posCode == 3) dir = vec2(-1.0, 0.0); // left
  else if (posCode == 4) dir = vec2(1.0, 0.0);  // right

  vec2 cornerCentered = (a_corner - 0.5) * boxPx;
  vec2 anchorPush = dir * (radiusPx + margin * u_pixelRatio * u_zoom);
  vec2 textAnchor = vec2(0.0);
  if (anchorCode == 1) textAnchor.x += 0.5 * boxPx.x;      // start: left text edge
  else if (anchorCode == 2) textAnchor.x -= 0.5 * boxPx.x; // end: right text edge
  if (posCode == 1) textAnchor.y += 0.5 * boxPx.y;         // top: bottom text edge
  else if (posCode == 2) textAnchor.y -= 0.5 * boxPx.y;    // bottom: top text edge
  vec2 boxOffset = cornerCentered + textAnchor;
  float angle = u_rotate ? anchor.z : s3.x;
  if (angle != 0.0) {
    float c = cos(angle), s = sin(angle);
    boxOffset = vec2(boxOffset.x * c - boxOffset.y * s, boxOffset.x * s + boxOffset.y * c);
  }
  vec2 offset = anchorPush + boxOffset;
  vec4 clip = worldToClip(anchor.xy);
  clip.xy += offset * (2.0 / u_resolution);
  gl_Position = clip;
${depth ? '  gl_Position.z = nodeDepth(int(a_element)) * gl_Position.w; // occluded by nearer node bodies' : ''}

  vec2 texel = vec2(a_rect.xy) + vec2(a_corner.x * float(a_rect.z), (1.0 - a_corner.y) * float(a_rect.w));
  v_uv = texel / u_atlasSize;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_labelAtlas;
out vec4 outColor;
void main() {
  vec4 texel = texture(u_labelAtlas, v_uv); // straight-alpha RGBA; color baked at raster time
  if (texel.a <= 0.003) discard;
  outColor = texel;
}`

export const createLabelProgram = (gl: WebGL2RenderingContext, options: LabelProgramOptions): LabelProgram => {
  const program = createProgram(gl, vertexShader(options.depth ?? false), FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')
  const cornerBuffer = gl.createBuffer()
  const instanceBuffer = gl.createBuffer()
  if (cornerBuffer === null || instanceBuffer === null) throw new Error('Failed to create buffer')

  const cornerLocation = gl.getAttribLocation(program, 'a_corner')
  const elementLocation = gl.getAttribLocation(program, 'a_element')
  const styleLocation = gl.getAttribLocation(program, 'a_style')
  const rectLocation = gl.getAttribLocation(program, 'a_rect')
  const stride = 16

  gl.bindVertexArray(vao)

  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, CORNERS, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(cornerLocation)
  gl.vertexAttribPointer(cornerLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
  gl.enableVertexAttribArray(elementLocation)
  gl.vertexAttribIPointer(elementLocation, 1, gl.UNSIGNED_INT, stride, 0)
  gl.vertexAttribDivisor(elementLocation, 1)
  gl.enableVertexAttribArray(styleLocation)
  gl.vertexAttribIPointer(styleLocation, 1, gl.UNSIGNED_SHORT, stride, 4)
  gl.vertexAttribDivisor(styleLocation, 1)
  gl.enableVertexAttribArray(rectLocation)
  gl.vertexAttribIPointer(rectLocation, 4, gl.UNSIGNED_SHORT, stride, 8)
  gl.vertexAttribDivisor(rectLocation, 1)

  gl.bindVertexArray(null)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'u_anchors'), options.anchorUnit)
  gl.uniform1i(gl.getUniformLocation(program, 'u_radii'), NODE_RADIUS_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_labelStyles'), options.labelStyleUnit)
  gl.uniform1i(gl.getUniformLocation(program, 'u_labelAtlas'), LABEL_ATLAS_UNIT)
  gl.uniform1f(gl.getUniformLocation(program, 'u_atlasSize'), options.atlasSize)
  gl.uniform1i(gl.getUniformLocation(program, 'u_rotate'), options.rotate ? 1 : 0)
  const nodeCountLocation = options.depth ? gl.getUniformLocation(program, 'u_nodeCount') : null

  let instanceCount = 0

  return {
    setInstances: (buffer, count) => {
      instanceCount = count
      if (count === 0) return
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW)
    },
    setNodeCount: (count) => {
      if (nodeCountLocation === null) return
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
      gl.deleteBuffer(cornerBuffer)
      gl.deleteBuffer(instanceBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }
}
