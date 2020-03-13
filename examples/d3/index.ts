import { Node, Edge, Graph } from '../../src/index'
import { D3Renderer } from '../../src/renderers/d3'
import { data, large, mediumLg, mediumSm } from '../data'


const graph = new Graph()
const container: HTMLCanvasElement = document.querySelector('canvas#graph')

const renderer = D3Renderer({
  container,
  onNodeMouseDown: (({ id }, { x, y }) => graph.dragStart(id, x, y)),
  onNodeDrag: (({ id }, { x, y }) => graph.drag(id, x, y)),
  onNodeMouseUp: (({ id }) => graph.dragEnd(id)),
})
graph.onLayout(renderer)

const nodes = mediumSm.nodes.map(({ id }) => ({ id }))

const edges = mediumSm.links.map(({ source, target }) => ({ id: `${source}|${target}`, source, target }))


graph.layout({
  nodes: nodes.reduce<{ [id: string]: Node }>((nodeMap, node) => {
    nodeMap[node.id] = node
    return nodeMap
  }, {}),
  edges: edges.reduce<{ [id: string]: Edge }>((edgeMap, edge) => {
    edgeMap[edge.id] = edge
    return edgeMap
  }, {}),
  options: {
    tick: null,
  },
})
