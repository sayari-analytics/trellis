export type NodeStyle = {
  strokeWidth: number
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity: number
  icon?: string
}

export type EdgeStyle = {
  width: number
  stroke: string
  strokeOpacity: number
}

export const DEFAULT_NODE_STYLES: NodeStyle = {
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
