/**
 * The indexed style palettes. Geometry styles (node/edge) and text styles (label/icon) are all
 * TextureTables — one RGBA32F row per style, fetched in shaders by a uint style pointer. The public
 * style *types* live in ../state (they're part of the Node/Edge API); this module owns how a style packs
 * into a texel row + the resolvers the label packer shares. Edge *width* is per-edge data (a column),
 * not part of the edge style.
 */
import type { NodeStyle, EdgeStyle, NodeLabelStyle, EdgeLabelStyle, NodeIcon } from '../state'
import { TextureTable, createTextureTable, stylesGLSL, red, green, blue, NODE_STYLE_UNIT, EDGE_STYLE_UNIT } from '.'

// ---------------------------------------------------------------------------------------------------
// node + edge geometry styles
// ---------------------------------------------------------------------------------------------------

export const NODE_STYLES_GLSL = stylesGLSL('u_nodeStyles', 'nodeStyle')
export const EDGE_STYLES_GLSL = stylesGLSL('u_edgeStyles', 'edgeStyle')

const NODE_STYLE_TEXELS = 3
const EDGE_STYLE_TEXELS = 2
// geometry-only defaults; .label / .icon feed the label + icon tables, not these
const DEFAULT_NODE_STYLE: Required<Omit<NodeStyle, 'label' | 'icon'>> = {
  fillColor: 0x3380e6,
  fillColorOpacity: 1,
  strokeWidth: 2,
  strokeColor: 0x194080,
  strokeColorOpacity: 1
}
const DEFAULT_EDGE_STYLE: Required<Pick<EdgeStyle, 'fillColor' | 'fillColorOpacity'>> = { fillColor: 0x99a3ad, fillColorOpacity: 1 }
// the arrow program reads texel 1's .x as a bitmask: bit 0 = head at target, bit 1 = head at source
const ARROW_CODE: Record<NonNullable<EdgeStyle['arrow']>, number> = { none: 0, forward: 1, reverse: 2, both: 3 }

const opacity = (value: number | undefined) => value ?? 1

// texel 0 = fill rgba, texel 1 = stroke rgba, texel 2 .x = strokeWidth. Colors are RGB-only;
// alpha comes from the matching explicit opacity field.
const packNodeStyle = (data: Float32Array, o: number, s: NodeStyle | undefined) => {
  const fillColor = s?.fillColor ?? DEFAULT_NODE_STYLE.fillColor
  const strokeColor = s?.strokeColor ?? DEFAULT_NODE_STYLE.strokeColor
  data[o] = red(fillColor)
  data[o + 1] = green(fillColor)
  data[o + 2] = blue(fillColor)
  data[o + 3] = opacity(s?.fillColorOpacity)
  data[o + 4] = red(strokeColor)
  data[o + 5] = green(strokeColor)
  data[o + 6] = blue(strokeColor)
  data[o + 7] = opacity(s?.strokeColorOpacity)
  data[o + 8] = s?.strokeWidth ?? DEFAULT_NODE_STYLE.strokeWidth
}

const packEdgeStyle = (data: Float32Array, o: number, s: EdgeStyle | undefined) => {
  const fillColor = s?.fillColor ?? DEFAULT_EDGE_STYLE.fillColor
  data[o] = red(fillColor)
  data[o + 1] = green(fillColor)
  data[o + 2] = blue(fillColor)
  data[o + 3] = opacity(s?.fillColorOpacity) // texel 0 .a is the fill alpha; edge width is per-edge data, not packed here
  data[o + 4] = ARROW_CODE[s?.arrow ?? 'none'] // texel 1 .x is the arrow code
}

export const createNodeStyleTable = (gl: WebGL2RenderingContext): TextureTable<NodeStyle> =>
  createTextureTable(gl, NODE_STYLE_UNIT, NODE_STYLE_TEXELS, packNodeStyle)

export const createEdgeStyleTable = (gl: WebGL2RenderingContext): TextureTable<EdgeStyle> =>
  createTextureTable(gl, EDGE_STYLE_UNIT, EDGE_STYLE_TEXELS, packEdgeStyle)

// ---------------------------------------------------------------------------------------------------
// label + icon text styles (node/edge label + node icon all resolve to the shared row layout below)
// ---------------------------------------------------------------------------------------------------

// node labels are placed on a side of the node; edge labels are always centered + rotated (no position)
const POSITION_CODE: Record<NonNullable<NodeLabelStyle['textPosition']>, number> = { top: 1, bottom: 2, left: 3, right: 4 }
const TEXT_ANCHOR_CODE: Record<NonNullable<NodeLabelStyle['textAnchor']>, number> = { middle: 0, start: 1, end: 2 }
const DEFAULT_LABEL_MARGIN = 4 // CSS px gap between the node edge and a node label (no margin field on the style)

const LABEL_STYLE_TEXELS = 4

// the flat form packed into a label row + read by the label packer (all text kinds resolve to this)
export type ResolvedLabelStyle = {
  fontSize: number
  color: number
  colorOpacity: number
  positionCode: number
  margin: number
  strokeWidth: number
  strokeColor: number
  strokeColorOpacity: number
  angle: number
  anchorCode: number
}

const defaultNodeTextAnchor = (style: NodeLabelStyle | undefined): NonNullable<NodeLabelStyle['textAnchor']> => {
  if ((style?.textAngle ?? 0) !== 0) return 'start'
  if (style?.textPosition === 'left') return 'end'
  if (style?.textPosition === 'right') return 'start'
  return 'middle'
}

export const resolveNodeLabelStyle = (style: NodeLabelStyle | undefined): ResolvedLabelStyle => {
  const textAnchor = style?.textAnchor ?? defaultNodeTextAnchor(style)
  return {
    fontSize: style?.fontSize ?? 12,
    color: style?.textColor ?? 0x222222,
    colorOpacity: opacity(style?.textColorOpacity),
    positionCode: POSITION_CODE[style?.textPosition ?? 'bottom'],
    margin: DEFAULT_LABEL_MARGIN,
    strokeWidth: style?.textOutlineWidth ?? 0,
    strokeColor: style?.textOutlineColor ?? 0xffffff,
    strokeColorOpacity: opacity(style?.textOutlineColorOpacity),
    angle: style?.textAngle ?? 0,
    anchorCode: TEXT_ANCHOR_CODE[textAnchor]
  }
}

export const resolveEdgeLabelStyle = (style: EdgeLabelStyle | undefined): ResolvedLabelStyle => ({
  fontSize: style?.fontSize ?? 12,
  color: style?.textColor ?? 0x222222,
  colorOpacity: opacity(style?.textColorOpacity),
  positionCode: 0, // edge labels are always centered on the edge
  margin: 0,
  strokeWidth: style?.textOutlineWidth ?? 0,
  strokeColor: style?.textOutlineColor ?? 0xffffff,
  strokeColorOpacity: opacity(style?.textOutlineColorOpacity),
  angle: 0,
  anchorCode: TEXT_ANCHOR_CODE.middle
})

export const resolveIconStyle = (icon: NodeIcon | undefined): ResolvedLabelStyle => ({
  fontSize: icon?.fontSize ?? 12,
  color: icon?.color ?? 0x000000,
  colorOpacity: opacity(icon?.colorOpacity),
  positionCode: 0, // icons are centered on the node
  margin: 0,
  strokeWidth: icon?.strokeWidth ?? 0,
  strokeColor: icon?.strokeColor ?? 0xffffff,
  strokeColorOpacity: opacity(icon?.strokeColorOpacity),
  angle: 0,
  anchorCode: TEXT_ANCHOR_CODE.middle
})

// GLSL: declare the label-style sampler and a row/texel accessor. texel 0 = (color.rgb, fontSize);
// texel 1 = (positionCode, margin, colorOpacity, strokeColorOpacity); texel 2 = (strokeColor.rgb, strokeWidth);
// texel 3 = (label angle in radians, text anchor code, _, _). Both label programs
// include this; the Renderer points u_labelStyles at the node- or edge-label table unit.
export const LABEL_STYLES_GLSL = stylesGLSL('u_labelStyles', 'labelStyle')

const packResolved = (data: Float32Array, o: number, r: ResolvedLabelStyle) => {
  data[o] = red(r.color)
  data[o + 1] = green(r.color)
  data[o + 2] = blue(r.color)
  data[o + 3] = r.fontSize
  data[o + 4] = r.positionCode
  data[o + 5] = r.margin
  data[o + 6] = r.colorOpacity
  data[o + 7] = r.strokeColorOpacity
  data[o + 8] = red(r.strokeColor)
  data[o + 9] = green(r.strokeColor)
  data[o + 10] = blue(r.strokeColor)
  data[o + 11] = r.strokeWidth
  data[o + 12] = r.angle
  data[o + 13] = r.anchorCode
}

// generic over the text-style kind: `resolve` maps node-label/edge-label/icon styles to the packed row
export const createLabelStyleTable = <S>(
  gl: WebGL2RenderingContext,
  unit: number,
  resolve: (style: S | undefined) => ResolvedLabelStyle
): TextureTable<S> => createTextureTable(gl, unit, LABEL_STYLE_TEXELS, (data, o, s) => packResolved(data, o, resolve(s)))
