import { PositionedNode, PositionedEdge, Graph } from '../index'


export type NodeStyle = {
  width: number
  strokeWidth: number
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity: number
}

export type EdgeStyle = {
  width: number
  stroke: string
  strokeOpacity: number
}

export type RendererOptions = {
  id: string
  graph: Graph
  strength?: number
  nodeStyle?: Partial<NodeStyle>
  edgeStyle?: Partial<EdgeStyle>
  onNodeHover?: (node: PositionedNode) => void
  onNodeClick?: (node: PositionedNode) => void
  onEdgeHover?: (edge: PositionedEdge) => void
  onEdgeClick?: (edge: PositionedEdge) => void
}

export const DEFAULT_NODE_STYLES: NodeStyle = {
  width: 62,
  strokeWidth: 2,
  fill: '#ff4b4b',
  stroke: '#bb0000',
  fillOpacity: 1,
  strokeOpacity: 1,
}

export const DEFAULT_EDGE_STYLES: EdgeStyle = {
  width: 1,
  stroke: '#ccc',
  strokeOpacity: 1,
}

export const DEFAULT_RENDERER_OPTIONS: Partial<RendererOptions> = {
  nodeStyle: {},
  edgeStyle: {},
}
