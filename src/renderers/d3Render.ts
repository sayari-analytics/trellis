import { select, event } from 'd3-selection'
import { zoom } from 'd3-zoom'
import { drag } from 'd3-drag'
import { Graph, Edge, Node, SimulatedNode, SimulatedEdge } from '../index'


export type Options = {
  r?: number
}

const DEFAULT_OPTIONS = {
  r: 5
}


/**
 * TODO
 * - drag handlers
 * - click/hover handlers
 * - data updates
 * - styles (default, per-node)
 * - tooltips
 */

export const D3Renderer = (
  graph: Graph,
  id: string,
  { r = DEFAULT_OPTIONS.r }: Options = {}
) => {
  const parent = select<HTMLElement, unknown>(`#${id}`)
  const parentElement = parent.node()
  if (parentElement === null) {
    throw new Error(`Element with id ${id} not found`)
  }

  const svg = parent
    .append('svg')
    .attr('height', '100%')
    .attr('width', '100%')

  const container = svg.append('g')

  const edgeContainer = container
    .append('g')
    .attr('stroke-width', 1)
    .attr('stroke', '#666')

  const nodesContainer = container
    .append('g')
    .attr('fill', '#ff4b4b')
    .attr('stroke', '#bb0000')
    .attr('stroke-width', 1)

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
  svg.call(zoomBehavior.on('zoom', () => container.attr('transform', event.transform)))
  zoomBehavior.translateBy(svg, parentElement.offsetWidth / 2, parentElement.offsetHeight / 2)
  
  function dragged (d: SimulatedNode) {
    d.fx = event.x
    d.fy = event.y
    graph.simulation.restart().tick(1)
  }

  const dragNode = () => drag<any, SimulatedNode>()
    .on('drag', dragged)

  return (
    nodes: { [key: string]: Node },
    edges: { [key: string]: Edge },
  ) => {
    return graph.layout({ nodes, edges }).subscribe({
      next: ({ nodes, edges }) => {
        edgeContainer
          .selectAll<SVGLineElement, SimulatedEdge>('line')
          .data(Object.values(edges), (d) => d.id)
          .join('line')
          .attr('x1', (d) => d.source.x!)
          .attr('y1', (d) => d.source.y!)
          .attr('x2', (d) => d.target.x!)
          .attr('y2', (d) => d.target.y!)

        nodesContainer
          .selectAll<SVGLineElement, SimulatedNode>('circle')
          .data<SimulatedNode>(Object.values(nodes), (d) => d.id)
          .join('circle')
          .attr('r', r)
          .attr('cx', (d) => (d.fx = d.x, d.x!))
          .attr('cy', (d) => (d.fy = d.y, d.y!))
          .call(dragNode())
      }
    })
  }
}
