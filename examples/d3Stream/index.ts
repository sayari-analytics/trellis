import { interval } from 'rxjs'
import { map } from 'rxjs/operators'
import { Node, Edge, Graph } from '../../src/index'
import { D3Renderer } from '../../src/renderers/d3'
import { data, large, mediumLg, mediumSm } from '../data'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'
import { SimulationOptions } from '../../src/simulation'


const graph = new Graph()
const container: HTMLCanvasElement = document.querySelector('canvas#graph')

const renderer = D3Renderer({
  container,
  onNodeMouseDown: (({ id }, { x, y }) => graph.dragStart(id, x, y)),
  onNodeDrag: (({ id }, { x, y }) => graph.drag(id, x, y)),
  onNodeMouseUp: (({ id }) => graph.dragEnd(id)),
})
graph.onLayout(renderer)


const NODES_PER_TICK = 20

const colorScale = scaleOrdinal(schemeCategory10)

const nodes: Node[] = mediumSm.nodes.map<Node>(({ id, group }) => ({
  id,
  style: {
    width: (group + 3) * 3,
    fill: colorScale(group.toString()),
  }
}))

const edges: Edge[] = mediumSm.links.map<Edge>(({ source, target, value }) => ({
  id: `${source}|${target}`,
  source,
  target,
  style: {
    width: Math.max(1, value * 0.2),
  }
}))


interval(1000).pipe(
  map((idx) => {
    return nodes
      .slice(0, (idx + 1) * NODES_PER_TICK)
      .reduce<{ nodes: { [id: string]: Node }, edges: { [id: string]: Edge }, options: Partial<SimulationOptions> }>((graph, node) => {
        graph.nodes[node.id] = node

        edges.forEach((edge) => {
          if (graph.nodes[edge.source] && graph.nodes[edge.target]) {
            graph.edges[edge.id] = edge
          }
        })

        return graph
      }, { nodes: {}, edges: {}, options: { tick: null } })
  }),
).subscribe({
  next: (graphData) => graph.layout(graphData)
})
