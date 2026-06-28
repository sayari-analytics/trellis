import { createProgram, Program, NODE_DEPTH_GLSL } from '.'
import { ANCHORS_GLSL, RADIUS_GLSL } from '../textures/positionTexture'
import { LABEL_STYLES_GLSL } from '../textures/styleTable'
import { GLYPH_ATLAS_UNIT, NODE_RADIUS_UNIT } from '../textures'
import { GlyphMetrics } from '../textures/glyphAtlas'
import { CAMERA_BLOCK } from '../camera'

export type GlyphProgram = Program & {
  setInstances: (buffer: ArrayBuffer, count: number) => void
  setNodeCount: (count: number) => void
}

type GlyphProgramOptions = {
  anchorUnit: number
  labelStyleUnit: number
  metrics: GlyphMetrics
  rotate?: boolean
  depth?: boolean
}

// unit quad corners in [0, 1]; y = 1 is the visual top of the glyph (camera y is up)
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
in vec2 a_corner;   // glyph quad corner in [0, 1] (per vertex)
in uint a_element;  // element (node/edge) index -> anchor table (per instance)
in uint a_glyph;    // atlas cell index (per instance)
in uint a_style;    // label style pointer (per instance)
in float a_penEmX;  // centered horizontal pen offset, em (per instance)
in float a_lenEm;   // label width, em — for left/right anchoring (per instance)
uniform vec2 u_glyphBoxEm; // glyph quad size / em (the full padded SDF cell)
uniform float u_lineEm;    // visible line height / em (anchoring, ignores SDF padding)
uniform ivec2 u_atlasGrid; // atlas grid (cols, rows)
uniform float u_sdfEdge;   // SDF value at the glyph edge
uniform float u_sdfRange;  // FONT_PX / RADIUS: em-fraction outline width -> SDF value units
uniform bool u_rotate;     // edge labels: anchor.z is the edge angle (radians); rotate the label by it
out vec2 v_uv;
out vec3 v_color;
out vec3 v_strokeColor;
out float v_colorOpacity;
out float v_strokeColorOpacity;
out float v_outlineThreshold; // SDF value at the outer edge of the stroke (== u_sdfEdge when no stroke)
void main() {
  vec4 s0 = labelStyle(a_style, 0); // color.rgb, fontSize (CSS px)
  vec4 s1 = labelStyle(a_style, 1); // positionCode, margin (CSS px), color opacity, stroke opacity
  vec4 s2 = labelStyle(a_style, 2); // strokeColor.rgb, strokeWidth (CSS px)
  vec4 s3 = labelStyle(a_style, 3); // angle radians
  float fontSize = s0.a;
  int posCode = int(s1.x + 0.5);
  int anchorCode = int(s3.y + 0.5);
  float margin = s1.y;
  float strokeWidth = s2.a;

  vec3 anchor = anchorPosition(int(a_element)); // xy world; z = 0 (node positions) or angle (edge anchors)
  float radiusPx = u_rotate ? 0.0 : nodeRadius(int(a_element)) * u_zoom;

  // vertical anchoring uses the visible line height (not the padded cell) so labels sit tight to nodes.
  float offX = a_penEmX;
  float offY = 0.0;
  vec2 dir = vec2(0.0);
  if (posCode == 1) { dir = vec2(0.0, 1.0); offY += 0.5 * u_lineEm; }       // top
  else if (posCode == 2) { dir = vec2(0.0, -1.0); offY -= 0.5 * u_lineEm; } // bottom
  else if (posCode == 3) { dir = vec2(-1.0, 0.0); }                         // left
  else if (posCode == 4) { dir = vec2(1.0, 0.0); }                          // right

  if (anchorCode == 1) offX += 0.5 * a_lenEm;      // start: left text edge at the positioned anchor
  else if (anchorCode == 2) offX -= 0.5 * a_lenEm; // end: right text edge at the positioned anchor

  vec2 cornerEm = (a_corner - 0.5) * u_glyphBoxEm;
  vec2 emDevice = (vec2(offX, offY) + cornerEm) * fontSize * u_pixelRatio * u_zoom;
  float angle = u_rotate ? anchor.z : s3.x;
  if (angle != 0.0) {
    float c = cos(angle), s = sin(angle);
    emDevice = vec2(emDevice.x * c - emDevice.y * s, emDevice.x * s + emDevice.y * c);
  }
  vec2 dirDevice = dir * (radiusPx + margin * u_pixelRatio * u_zoom);
  vec4 clip = worldToClip(anchor.xy);
  clip.xy += (emDevice + dirDevice) * (2.0 / u_resolution); // device px -> clip
  gl_Position = clip;
${depth ? '  gl_Position.z = nodeDepth(int(a_element)) * gl_Position.w; // occluded by nearer node bodies' : ''}

  int col = int(a_glyph) % u_atlasGrid.x;
  int row = int(a_glyph) / u_atlasGrid.x;
  vec2 cell = 1.0 / vec2(u_atlasGrid);
  v_uv = (vec2(float(col), float(row)) + vec2(a_corner.x, 1.0 - a_corner.y)) * cell;
  v_color = s0.rgb;
  v_strokeColor = s2.rgb;
  v_colorOpacity = s1.z;
  v_strokeColorOpacity = s1.w;
  // Stroke outer edge sits at a lower SDF value.
  v_outlineThreshold = u_sdfEdge - (strokeWidth / fontSize) * u_sdfRange;
}`

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_color;
in vec3 v_strokeColor;
in float v_colorOpacity;
in float v_strokeColorOpacity;
in float v_outlineThreshold;
uniform sampler2D u_glyphAtlas;
uniform float u_sdfEdge;
out vec4 outColor;
void main() {
  float dist = texture(u_glyphAtlas, v_uv).a; // SDF: > u_sdfEdge inside the glyph, < outside
  float aa = max(fwidth(dist), 0.0001);       // ~1px screen-space falloff, smooth at any scale
  float fill = smoothstep(u_sdfEdge - aa, u_sdfEdge + aa, dist);
  float alpha = smoothstep(v_outlineThreshold - aa, v_outlineThreshold + aa, dist);
  if (alpha <= 0.003) discard;
  vec3 color = v_outlineThreshold < u_sdfEdge ? mix(v_strokeColor, v_color, fill) : v_color;
  float opacity = v_outlineThreshold < u_sdfEdge ? mix(v_strokeColorOpacity, v_colorOpacity, fill) : v_colorOpacity;
  outColor = vec4(color, alpha * opacity);
}`

export const createGlyphProgram = (gl: WebGL2RenderingContext, options: GlyphProgramOptions): GlyphProgram => {
  const program = createProgram(gl, vertexShader(options.depth ?? false), FRAGMENT_SHADER)

  const vao = gl.createVertexArray()
  if (vao === null) throw new Error('Failed to create vertex array')
  const cornerBuffer = gl.createBuffer()
  const instanceBuffer = gl.createBuffer()
  if (cornerBuffer === null || instanceBuffer === null) throw new Error('Failed to create buffer')

  const cornerLocation = gl.getAttribLocation(program, 'a_corner')
  const elementLocation = gl.getAttribLocation(program, 'a_element')
  const glyphLocation = gl.getAttribLocation(program, 'a_glyph')
  const styleLocation = gl.getAttribLocation(program, 'a_style')
  const penLocation = gl.getAttribLocation(program, 'a_penEmX')
  const lenLocation = gl.getAttribLocation(program, 'a_lenEm')
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
  gl.enableVertexAttribArray(glyphLocation)
  gl.vertexAttribIPointer(glyphLocation, 1, gl.UNSIGNED_SHORT, stride, 4)
  gl.vertexAttribDivisor(glyphLocation, 1)
  gl.enableVertexAttribArray(styleLocation)
  gl.vertexAttribIPointer(styleLocation, 1, gl.UNSIGNED_SHORT, stride, 6)
  gl.vertexAttribDivisor(styleLocation, 1)
  gl.enableVertexAttribArray(penLocation)
  gl.vertexAttribPointer(penLocation, 1, gl.FLOAT, false, stride, 8)
  gl.vertexAttribDivisor(penLocation, 1)
  gl.enableVertexAttribArray(lenLocation)
  gl.vertexAttribPointer(lenLocation, 1, gl.FLOAT, false, stride, 12)
  gl.vertexAttribDivisor(lenLocation, 1)

  gl.bindVertexArray(null)

  gl.useProgram(program)
  gl.uniform1i(gl.getUniformLocation(program, 'u_anchors'), options.anchorUnit)
  gl.uniform1i(gl.getUniformLocation(program, 'u_radii'), NODE_RADIUS_UNIT)
  gl.uniform1i(gl.getUniformLocation(program, 'u_labelStyles'), options.labelStyleUnit)
  gl.uniform1i(gl.getUniformLocation(program, 'u_glyphAtlas'), GLYPH_ATLAS_UNIT)
  gl.uniform2f(gl.getUniformLocation(program, 'u_glyphBoxEm'), options.metrics.glyphBoxEm[0], options.metrics.glyphBoxEm[1])
  gl.uniform1f(gl.getUniformLocation(program, 'u_lineEm'), options.metrics.lineEm)
  gl.uniform2i(gl.getUniformLocation(program, 'u_atlasGrid'), options.metrics.grid[0], options.metrics.grid[1])
  gl.uniform1f(gl.getUniformLocation(program, 'u_sdfEdge'), options.metrics.sdfEdge)
  gl.uniform1f(gl.getUniformLocation(program, 'u_sdfRange'), options.metrics.sdfRange)
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
