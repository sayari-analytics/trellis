/**
 * @sayari/trellis-utils — helpers that build on the trellis core: animation interpolators and graph
 * generators for testing. Kept out of the core package so the renderer stays dependency-free.
 */

export { animate, smootherstep, interpolatePosition, interpolateViewport } from './animate'
export type { Position } from './animate'

export {
  gridGraph,
  randomGraph,
  scaleFreeGraph,
  smallWorldGraph,
  clusteredGraph,
  treeGraph,
  geometricGraph,
  egoForestGraph
} from './generators'
export type {
  Graph,
  GraphOptions,
  GridOptions,
  RandomOptions,
  ScaleFreeOptions,
  SmallWorldOptions,
  ClusteredOptions,
  TreeOptions,
  GeometricOptions,
  EgoForestOptions
} from './generators'

export { connectedComponents, subgraphs } from './components'
export type { ConnectedComponents } from './components'

export { packCircles, packRectangles, enclose } from './packing'
