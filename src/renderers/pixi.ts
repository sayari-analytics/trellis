import { select, event } from 'd3-selection'
import { zoom } from 'd3-zoom'
import { drag as dragBehavior } from 'd3-drag'
import { Graph, Edge, Node, PositionedNode, PositionedEdge } from '../index'


export type Options = {
  r: number
  synchronous?: number | false
}

const DEFAULT_OPTIONS: Options = {
  r: 6,
  synchronous: false,
}


export const PixiRenderer = (
  id: string,
  { r = DEFAULT_OPTIONS.r, synchronous = DEFAULT_OPTIONS.synchronous }: Partial<Options> = {}
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
    .style('cursor', 'move')

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

  // is the closure necessary here?  why recreate the dragBehavior on every render
  const dragNode = () => dragBehavior<any, PositionedNode>()
    .on('start', dragStart)
    .on('drag', drag)
    .on('end', dragEnd)

  const graph = new Graph(({ nodes, edges }) => {
    nodesContainer
      .selectAll<SVGLineElement, PositionedNode>('circle')
      .data(Object.values(nodes), (d) => d.id)
      .join('circle')
      .attr('r', r)
      .attr('cx', (d) => d.x!)
      .attr('cy', (d) => d.y!)
      .style('cursor', 'pointer')
      .call(dragNode())

    edgeContainer
      .selectAll<SVGLineElement, PositionedEdge>('line')
      .data(Object.values(edges), (d) => d.id)
      .join('line')
      .attr('x1', (d) => d.source.x!)
      .attr('y1', (d) => d.source.y!)
      .attr('x2', (d) => d.target.x!)
      .attr('y2', (d) => d.target.y!)
  })

  function dragStart (d: PositionedNode) {
    graph.dragStart(d.id, event.x, event.y)
  }

  function drag (d: PositionedNode) {
    graph.drag(d.id, event.x, event.y)
  }

  function dragEnd (d: PositionedNode) {
    graph.dragEnd(d.id)
  }

  return (nodes: { [key: string]: Node }, edges: { [key: string]: Edge }) => {
    graph.layout({ nodes, edges, options: { synchronous } })
  }
}
