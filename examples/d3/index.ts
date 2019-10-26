import { Graph, Node, Edge } from '../../src/index'
import { D3Renderer } from '../../src/renderers/d3Render'
import data from './data'

const render = D3Renderer(new Graph(), 'graph')

render(
  data.nodes.reduce<{ [id: string]: Node }>((nodeMap, { id }) => {
    nodeMap[id] = { id }
    return nodeMap
  }, {}),
  data.links.reduce<{ [id: string]: Edge }>((edgeMap, { source, target }) => {
    edgeMap[`${source}::${target}`] = { source, target }
    return edgeMap
  }, {})
)
