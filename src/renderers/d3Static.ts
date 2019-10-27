import { select, event } from 'd3-selection'
import { zoom } from 'd3-zoom'
import { drag } from 'd3-drag'
import { Graph, Edge, Node, SimulatedNode, SimulatedEdge } from '../index'


export type Options = {
  iterations?: number
  r?: number
}

const DEFAULT_OPTIONS = {
  iterations: 300,
  r: 6,
}


export const D3StaticRenderer = (
  graph: Graph,
  id: string,
  { iterations = DEFAULT_OPTIONS.iterations, r = DEFAULT_OPTIONS.r }: Options = {}
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
    .attr('stroke', '#222')
    .attr('stroke-opacity', 0.6)

  const nodesContainer = container
    .append('g')
    .attr('fill', '#ff4b4b')
    .attr('stroke', '#bb0000')
    .attr('stroke-width', 1)

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
  svg.call(zoomBehavior.on('zoom', () => container.attr('transform', event.transform)))
  zoomBehavior.translateBy(svg, parentElement.offsetWidth / 2, parentElement.offsetHeight / 2)
  
  function dragStart (d: SimulatedNode) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragged (d: SimulatedNode) {
    d.fx = event.x
    d.fy = event.y
    graph.simulation.restart().tick(1)
  }

  function dragEnd (d: SimulatedNode) {
    d.fx = null
    d.fy = null
  }

  const dragNode = () => drag<any, SimulatedNode>()
    .on('start', dragStart)
    .on('drag', dragged)
    .on('end', dragEnd)

  return (nodes: { [key: string]: Node }, edges: { [key: string]: Edge }) => {
    graph.layout({ nodes, edges }).then((simulation) => {
      simulation.tick(iterations)
      simulation
        .restart()
        .alpha(0)
        .on('tick', () => {
          edgeContainer
            .selectAll<SVGLineElement, SimulatedEdge>('line')
            .data(Object.values(graph.edges), (d) => d.id)
            .join('line')
            .attr('x1', (d) => d.source.x!)
            .attr('y1', (d) => d.source.y!)
            .attr('x2', (d) => d.target.x!)
            .attr('y2', (d) => d.target.y!)
      
          nodesContainer
            .selectAll<SVGLineElement, SimulatedNode>('circle')
            .data(Object.values(graph.nodes), (d) => d.id)
            .join('circle')
            .attr('r', r)
            .attr('cx', (d) => d.x!)
            .attr('cy', (d) => d.y!)
            .style('cursor', 'pointer')
            .call(dragNode())
        })
    })
  }
}
