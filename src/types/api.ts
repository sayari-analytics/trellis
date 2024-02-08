// graph
export type Bounds = { left: number; top: number; right: number; bottom: number }

export type Dimensions = { width: number; height: number }

export type Viewport = { x: number; y: number; zoom: number }

// style
export type FillStyle = { color: string; opacity?: number }

export type Stroke = { color: string; width: number }

export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export type AnchorPosition = 'bottom' | 'left' | 'top' | 'right'

export type TextHighlightStyle = FillStyle & {
  padding?: number | number[]
}

export type TextStyle = Partial<{
  color: string
  stroke: Stroke
  fontName: string
  fontSize: number
  fontFamily: string
  letterSpacing: number
  wordWrap: number | false
  fontWeight: FontWeight
  highlight: TextHighlightStyle
  align: TextAlign
}>

export type LabelStyle = Omit<TextStyle, 'align'> & {
  margin?: number
  position?: AnchorPosition
}

// icons
export type ImageIcon = {
  type: 'imageIcon'
  url: string
  scale?: number
  offset?: { x?: number; y?: number }
}

export type TextIcon = {
  type: 'textIcon'
  text: string
  fontSize: number
  fontFamily: string
  color: string
  fontWeight?: FontWeight
  offset?: { x?: number; y?: number }
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
  position?: Exclude<AnchorPosition, 'left' | 'right'>
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
export type AnnotationStyle = {
  background?: FillStyle
  stroke?: Stroke[]
}

export type TextAnnotationStyle = AnnotationStyle & {
  text?: Omit<LabelStyle, 'position'>
  padding?: number | number[]
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
