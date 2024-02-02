export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export type Stroke = { color: string; width: number }

export type Bounds = { left: number; top: number; right: number; bottom: number }

export type Dimensions = { width: number; height: number }

export type Viewport = { x: number; y: number; zoom: number }

export type FontStyle = 'normal' | 'italic' | 'oblique'

export type LabelBackgroundStyle = {
  color: string
  opacity?: number
  padding?: number | number[]
}

export type LabelPosition = 'bottom' | 'left' | 'top' | 'right'

export type LabelStyle = Partial<{
  fontName: string
  fontSize: number
  margin: number
  wordWrap: number
  letterSpacing: number
  fontFamily: string
  fontWeight: FontWeight
  stroke: Stroke
  color: string
  position: LabelPosition
  background: LabelBackgroundStyle
}>

export type TextIcon = {
  type: 'textIcon'
  text: string
  fontSize: number
  fontFamily: string
  color: string
  fontWeight?: FontWeight
  offset?: { x?: number; y?: number }
}

export type ImageIcon = {
  type: 'imageIcon'
  url: string
  scale?: number
  offset?: { x?: number; y?: number }
}

export type NodeIcon = TextIcon | ImageIcon

export type NodeBadge = {
  position: number
  radius: number
  color: string
  icon?: NodeIcon
  stroke?: Stroke
}

export type NodeStyle = {
  color?: string
  icon?: NodeIcon
  stroke?: Stroke[]
  badge?: NodeBadge[]
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

export type EdgeStyle = {
  width?: number
  stroke?: string
  strokeOpacity?: number
  arrow?: 'forward' | 'reverse' | 'both' | 'none'
  label?: LabelStyle
}

export type Edge = {
  id: string
  source: string
  target: string
  label?: string
  style?: EdgeStyle
}

// TODO

export type CircleAnnotation = {
  type: 'circle'
  id: string
  x: number
  y: number
  radius: number
  style: {
    backgroundColor: string
    stroke: {
      color: string
      width: number
    }
  }
}

export type RectangleAnnotation = {
  type: 'rectangle'
  id: string
  x: number
  y: number
  width: number
  height: number
  resize?: boolean
  style: {
    backgroundColor: string
    stroke: {
      color: string
      width: number
    }
  }
}

export type TextAnnotation = {
  type: 'text'
  id: string
  x: number
  y: number
  width: number
  height: number
  content: string
  resize?: boolean
  style: Partial<{
    backgroundColor: string
    padding: number
    stroke: {
      color: string
      width: number
    }
    text: Partial<{
      fontName: string
      fontSize: number
      fontWeight: FontWeight
      fontStyle: FontStyle
      weight: string
      color: string
      align: TextAlign
      letterSpacing: number
      lineSpacing: number
      maxWidth: number
    }>
  }>
}

export type Annotation = CircleAnnotation | RectangleAnnotation | TextAnnotation
