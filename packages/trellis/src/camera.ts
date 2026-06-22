/**
 * The camera: the viewport model, its GPU (std140 UBO) layout + GLSL, and the CPU projection that
 * mirrors that GLSL. Keeping the world<->clip transform (CAMERA_BLOCK, used by every program) next to
 * its CPU twin (screenToWorld/worldToScreen, used by interaction) keeps the two numerically in sync.
 */
export type Viewport = { x: number; y: number; zoom: number }

// indices into the live viewport Float32Array [x, y, zoom]
export const VIEWPORT_X = 0
export const VIEWPORT_Y = 1
export const VIEWPORT_ZOOM = 2

/** binding point shared by the renderer's camera UBO and every program's Camera uniform block */
export const CAMERA_BINDING = 0

/**
 * std140 uniform block shared by all programs. The Renderer owns one buffer at CAMERA_BINDING and
 * fills it once per frame; shaders that include this block read the current camera.
 */
export const CAMERA_BLOCK = /* glsl */ `layout(std140) uniform Camera {
  vec2 u_resolution;  // device pixels
  vec2 u_center;      // camera position, world units
  float u_zoom;       // device pixels per world unit
  float u_pixelRatio; // device pixels per CSS pixel (render scale); lets shaders size floors in CSS px
};
// world units -> clip space (mirror of screenToWorld/worldToScreen below)
vec4 worldToClip(vec2 world) {
  vec2 px = (world - u_center) * u_zoom; // pixel space, origin centered
  return vec4(px / (u_resolution * 0.5), 0.0, 1.0);
}
// clip space -> world units (inverse)
vec2 clipToWorld(vec2 clip) {
  return u_center + clip * (u_resolution * 0.5) / u_zoom;
}`

// world <-> screen projection (CPU mirror of CAMERA_BLOCK). viewport is the live Float32Array
// [x, y, zoom]; screen coords are CSS px relative to the canvas top-left; width/height are device px.
export const screenToWorld = (
  viewport: Float32Array,
  width: number,
  height: number,
  dpr: number,
  screenX: number,
  screenY: number
): { x: number; y: number } => {
  const zoom = viewport[VIEWPORT_ZOOM]
  const px = screenX * dpr - width / 2 // device pixels from center
  const py = height / 2 - screenY * dpr // y up
  return { x: viewport[VIEWPORT_X] + px / zoom, y: viewport[VIEWPORT_Y] + py / zoom }
}

export const worldToScreen = (
  viewport: Float32Array,
  width: number,
  height: number,
  dpr: number,
  worldX: number,
  worldY: number
): { x: number; y: number } => {
  const zoom = viewport[VIEWPORT_ZOOM]
  const px = (worldX - viewport[VIEWPORT_X]) * zoom
  const py = (worldY - viewport[VIEWPORT_Y]) * zoom
  return { x: (px + width / 2) / dpr, y: (height / 2 - py) / dpr } // back to CSS px from top-left
}
