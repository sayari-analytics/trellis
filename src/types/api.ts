// graph
export type Bounds = { left: number; top: number; right: number; bottom: number }

export type Dimensions = { width: number; height: number }

export type Viewport = { x: number; y: number; zoom: number }

// style
export type FillStyle = { color: string; opacity?: number }

export type Stroke = { color: string; width: number }

export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export type AnchorPosition = 'bottom' | 'left' | 'top' | 'right' | 'center'

export type TextHighlightStyle = FillStyle & {
  padding?: number | [px: number, py: number]
}

export type TextStyle = Partial<{
  color: string
  margin: number
  stroke: Stroke
  fontName: string
  fontSize: number
  fontFamily: string
  letterSpacing: number
  wordWrap: number | false
  fontWeight: FontWeight
  highlight: TextHighlightStyle
  position: AnchorPosition
  align: TextAlign
}>

export type LabelStyle = Omit<TextStyle, 'align' | 'position'> & {
  position?: Exclude<AnchorPosition, 'center'>
}

// icons
type IconBase<T extends string> = {
  type: T
  offset?: { x?: number; y?: number }
}

export type ImageIcon = IconBase<'imageIcon'> & {
  url: string
  scale?: number
}

export type TextIcon = IconBase<'textIcon'> & {
  content: string
  style?: Pick<TextStyle, 'color' | 'stroke' | 'fontSize' | 'fontFamily' | 'fontWeight'>
}

export type IconStyle = ImageIcon | TextIcon

// nodes
export type NodeStyle = {
  color?: string
  icon?: IconStyle
  stroke?: Stroke[]
  badge?: {
    position: number
    radius: number
    color: string
    stroke?: string
    strokeWidth?: number
    icon?: IconStyle
  }[]
  label?: LabelStyle
}

export type Node = {
  id: string
  radius: number
  x?: number
  y?: number
  fx?: number
  fy?: number
  label?: string
  style?: NodeStyle
  subgraph?: {
    nodes: Node[]
    edges: Edge[]
    options?: {}
  }
}

// edges
export type ArrowStyle = 'forward' | 'reverse' | 'both' | 'none'

export type EdgeLabelStyle = LabelStyle & {
  position?: Exclude<AnchorPosition, 'left' | 'right' | 'center'>
}

export type EdgeStyle = {
  width?: number
  stroke?: string
  strokeOpacity?: number
  arrow?: ArrowStyle
  label?: EdgeLabelStyle
}

export type Edge = {
  id: string
  source: string
  target: string
  label?: string
  style?: EdgeStyle
}

// annotations
export type AnnotationStyle = FillStyle & {
  stroke?: Stroke[]
}

export type TextAnnotationStyle = AnnotationStyle & {
  text?: Omit<LabelStyle, 'position'>
  padding?: number | [px: number, py: number]
}

type AnnotationBase<Type extends string> = {
  type: Type
  id: string
  x: number
  y: number
  resize?: boolean
}

export type CircleAnnotation = AnnotationBase<'circle'> & {
  radius: number
  style: AnnotationStyle
}

export type RectangleAnnotation = AnnotationBase<'rectangle'> & {
  width: number
  height: number
  style: AnnotationStyle
}

export type TextAnnotation = AnnotationBase<'text'> & {
  width: number
  height: number
  content: string
  style: TextAnnotationStyle
}

export type Annotation = CircleAnnotation | RectangleAnnotation | TextAnnotation
