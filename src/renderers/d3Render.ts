import { select, event } from 'd3-selection'
import { zoom } from 'd3-zoom'
// import { drag } from 'd3-drag'
import { Graph, Edge, Node } from '../index'


export type Options = {
  r?: number
}

const DEFAULT_OPTIONS = {
  r: 5
}


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
    .selectAll('line')

  const nodesContainer = container
    .append('g')
    .attr('fill', '#ff4b4b')
    .attr('stroke', '#bb0000')
    .attr('stroke-width', 1)
    .selectAll('circle')

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
  svg.call(zoomBehavior.on('zoom', () => container.attr('transform', event.transform)))
  zoomBehavior.translateBy(svg, parentElement.offsetWidth / 2, parentElement.offsetHeight / 2)
  
  // const dragNode = () => drag<any, Node>()
  //   .on('start', function (d) {
  //     d.fx = d.x
  //     d.fy = d.y
  //   })
  //   // .on('drag', function (d) {
  //   //   this.setAttribute('cx', event.x)
  //   //   this.setAttribute('cy', event.y)
  //   // })
  //   .on('drag', function (d) {
  //     d.fx = event.x
  //     d.fy = event.y
  //   })
  //   .on('end', function (d) {
  //     d.fx = null
  //     d.fy = null
  //   })

  return (
    nodes: { [key: string]: Node },
    edges: { [key: string]: Edge },
  ) => {
    return graph.layout({ nodes, edges }).subscribe({
      next: ({ nodes, edges }) => {
        edgeContainer
          .data(Object.values(edges))
          .join('line')
          .attr('x1', (d) => (d.source as Node).x!)
          .attr('y1', (d) => (d.source as Node).y!)
          .attr('x2', (d) => (d.target as Node).x!)
          .attr('y2', (d) => (d.target as Node).y!)

        nodesContainer
          .data(Object.values(nodes))
          .join('circle')
          .attr('r', r)
          .attr('cx', (d) => d.x!)
          .attr('cy', (d) => d.y!)
          // .call(dragNode())
      }
    })
  }
}
