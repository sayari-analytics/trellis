import { Graph, Node, Edge } from '../../src/index'
import { D3StaticRenderer } from '../../src/renderers/d3Static'
import { data, large, mediumLg, mediumSm } from './data'

const render = D3StaticRenderer(new Graph(), 'graph')

render(
  mediumSm.nodes.reduce<{ [id: string]: Node }>((nodeMap, { id }) => {
    nodeMap[id] = { id }
    return nodeMap
  }, {}),
  mediumSm.links.reduce<{ [id: string]: Edge }>((edgeMap, { source, target }) => {
    edgeMap[`${source}|${target}`] = { id: `${source}|${target}`, source, target }
    return edgeMap
  }, {})
)
