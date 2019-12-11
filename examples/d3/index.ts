import { Node, Edge } from '../../src/index'
import { D3Renderer } from '../../src/renderers/d3'
import { data, large, mediumLg, mediumSm } from '../data'

const render = D3Renderer({ id: 'graph', synchronous: false })

const nodes = large.nodes.map(({ id }) => ({ id }))

const edges = large.links.map(({ source, target }) => ({ id: `${source}|${target}`, source, target }))

render(
  nodes.reduce<{ [id: string]: Node }>((nodeMap, node) => {
    nodeMap[node.id] = node
    return nodeMap
  }, {}),
  edges.reduce<{ [id: string]: Edge }>((edgeMap, edge) => {
    edgeMap[edge.id] = edge
    return edgeMap
  }, {})
)
