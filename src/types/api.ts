// graph
export type Bounds = { left: number; top: number; right: number; bottom: number }

export type Dimensions = { width: number; height: number }

export type Coordinates = { x: number; y: number }

export type Viewport = { x: number; y: number; zoom: number }

// style
export type FillStyle = { color: string; opacity?: number }

export type Stroke = FillStyle & { width: number }

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

export type LabelStyle = Omit<TextStyle, 'align'> & {
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
export type NodeStyle = Partial<FillStyle> & {
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

export type EdgeStyle = Partial<Stroke> & {
  stroke?: Stroke[]
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
type AnnotationBase<Type extends string> = {
  type: Type
  id: string
  x: number
  y: number
  content?: string
  resize?: boolean
}

export type AnnotationStyle = FillStyle & {
  stroke?: Stroke[]
  text?: Omit<LabelStyle, 'position'>
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

export type LineAnnotationStyle = Stroke & {
  stroke?: Stroke[]
  text?: EdgeLabelStyle
}

export type LineAnnotation = Omit<AnnotationBase<'line'>, 'x' | 'y'> & {
  points: [{ x: number; y: number }, { x: number; y: number }]
  style: LineAnnotationStyle
}

export type Annotation = CircleAnnotation | RectangleAnnotation | LineAnnotation
