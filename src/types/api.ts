// graph
export type Bounds = { left: number; top: number; right: number; bottom: number }

export type Dimensions = { width: number; height: number }

export type Viewport = { x: number; y: number; zoom: number }

// style
export type Color = string | number

export type FillStyle = { color: Color; opacity?: number }

export type Stroke = { color: Color; width: number }

export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export type AnchorPosition = 'bottom' | 'left' | 'top' | 'right' | 'center'

export type LabelPosition = 'bottom' | 'left' | 'top' | 'right'

export type TextHighlightStyle = FillStyle & {
  padding?: number | [px: number, py: number]
}

type TextBase = Partial<{
  color: Color
  stroke: Stroke
  fontSize: number
  fontFamily: string
  fontWeight: FontWeight
}>

// icons
export type TextIconStyle = TextBase

export type ImageIcon = {
  type: 'imageIcon'
  url: string
  scale?: number
  offset?: { x?: number; y?: number }
}

export type TextIcon = {
  type: 'textIcon'
  content: string
  style?: TextIconStyle
  scale?: number
  offset?: { x?: number; y?: number }
}

// nodes
export type NodeLabelStyle = TextBase &
  Partial<{
    margin: number
    letterSpacing: number
    wordWrap: number | false
    highlight: TextHighlightStyle
    position: LabelPosition
  }>

export type NodeStyle = {
  color?: Color
  icon?: ImageIcon | TextIcon
  stroke?: Stroke[]
  badge?: {
    position: number
    radius: number
    color: Color
    stroke?: Color
    strokeWidth?: number
    icon?: ImageIcon | TextIcon
  }[]
  label?: NodeLabelStyle
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
export type EdgeLabelStyle = TextBase &
  Partial<{
    margin: number
    letterSpacing: number
    wordWrap: number | false
    highlight: TextHighlightStyle
    position: 'left' | 'right' | 'center'
  }>

export type ArrowStyle = 'forward' | 'reverse' | 'both' | 'none'

export type EdgeStyle = {
  width?: number
  stroke?: Color
  strokeOpacity?: number
  arrow?: ArrowStyle
  label?: EdgeLabelStyle
}

export type Edge = {
  source: string
  target: string
  label?: string
  style?: EdgeStyle
}

// annotations
export type AnnotationStyle = FillStyle & {
  stroke?: Stroke[]
}

export type AnnotationTextStyle = TextBase &
  Partial<{
    margin: number
    letterSpacing: number
    wordWrap: number | false
    highlight: TextHighlightStyle
    align: TextAlign
  }>

export type TextAnnotationStyle = AnnotationStyle & {
  text?: AnnotationTextStyle
  padding?: number | [px: number, py: number]
}

type AnnotationBase = {
  id: string
  x: number
  y: number
  resize?: boolean
}

export type CircleAnnotation = AnnotationBase & {
  type: 'circle'
  radius: number
  style: AnnotationStyle
}

export type RectangleAnnotation = AnnotationBase & {
  type: 'rectangle'
  width: number
  height: number
  style: AnnotationStyle
}

export type TextAnnotation = AnnotationBase & {
  type: 'text'
  width: number
  height: number
  content: string
  style: TextAnnotationStyle
}

export type Annotation = CircleAnnotation | RectangleAnnotation | TextAnnotation
