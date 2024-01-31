// viewport
export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface Coordinates {
  x: number
  y: number
}

export interface Viewport extends Coordinates {
  zoom: number
}

export interface Graph {
  nodes: Node[]
  edges: Edge[]
}

// style
export interface Stroke {
  color: string
  width: number
}

export interface FillStyle {
  color: string
  opacity?: number
}

// text
export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export type FontStyle = 'normal' | 'italic' | 'oblique'

export type AnchorPosition = 'bottom' | 'left' | 'top' | 'right'

export interface TextHighlightStyle extends FillStyle {
  padding?: number | number[]
}

export interface TextStyle {
  fontName?: string
  fontSize?: number
  margin?: number
  wordWrap?: number | false
  letterSpacing?: number
  fontFamily?: string
  fontWeight?: FontWeight
  fontStyle?: FontStyle
  stroke?: Stroke
  color?: string
  align?: TextAlign
  anchor?: AnchorPosition
  highlight?: TextHighlightStyle
}

// icons
interface IconBase<Type extends string> {
  type: Type
  offset?: Partial<Coordinates>
}

export interface TextIcon extends IconBase<'textIcon'> {
  content: string
  color: string
  /**
   * @default 10
   */
  fontSize?: number
  /**
   * @default 'sans-serif'
   */
  fontFamily?: string
  /**
   * @default 'normal'
   */
  fontStyle?: FontStyle
  /**
   * @default 'normal'
   */
  fontWeight?: FontWeight
}

export interface ImageIcon extends IconBase<'imageIcon'> {
  url: string
  /**
   * @default 1
   */
  scale?: number
}

export type IconStyle = TextIcon | ImageIcon

// nodes
export interface NodeBadge {
  position: number
  radius: number
  color: string
  icon?: IconStyle
  stroke?: Stroke
}

export interface NodeStyle {
  color?: string
  icon?: IconStyle
  stroke?: Stroke[]
  badge?: NodeBadge[]
  label?: TextStyle
}

export interface Node {
  id: string
  radius: number
  x?: number
  y?: number
  fx?: number
  fy?: number
  label?: string
  style?: NodeStyle
  subgraph?: Graph
}

// edges
export type ArrowStyle = 'forward' | 'reverse' | 'both' | 'none'

export interface EdgeLabelStyle extends TextStyle {
  anchor?: Exclude<AnchorPosition, 'left' | 'right'>
}

export interface EdgeStyle {
  /**
   * @default 1
   */
  opacity?: number
  /**
   * @default 'none'
   */
  arrow?: ArrowStyle
  label?: EdgeLabelStyle
  stroke?: Stroke
}

export interface Edge {
  id: string
  source: string
  target: string
  label?: string
  style?: EdgeStyle
}

// annotations
export interface AnnotationStyle {
  background?: FillStyle
  stroke?: Stroke[]
}

export interface TextAnnotationStyle extends AnnotationStyle {
  text?: Omit<TextStyle, 'anchor'>
  padding?: number | number[]
}

interface AnnotationBase<Type extends string> {
  type: Type
  id: string
  x: number
  y: number
  resize?: boolean
}

export interface CircleAnnotation extends AnnotationBase<'circle'> {
  radius: number
  style: AnnotationStyle
}

export interface RectangleAnnotation extends AnnotationBase<'rectangle'> {
  height: number
  width: number
  style: AnnotationStyle
}

export interface TextAnnotation extends AnnotationBase<'text'> {
  content: string
  height: number
  width: number
  style: TextAnnotationStyle
}

export type Annotation = CircleAnnotation | RectangleAnnotation | TextAnnotation
