import { select, event } from 'd3-selection'
import { zoom } from 'd3-zoom'
import { drag as dragBehavior } from 'd3-drag'
import { Graph, Edge, Node, PositionedNode, PositionedEdge } from '../index'
import { NodeStyle, DEFAULT_NODE_STYLES, EdgeStyle, DEFAULT_EDGE_STYLES, Options, DEFAULT_OPTIONS } from './options'


const nodeStyleSelector = <T extends keyof NodeStyle>(nodeStyles: NodeStyle, attribute: T) => (node: PositionedNode): NodeStyle[T] => {
  if (node.style === undefined || node.style![attribute] === undefined) {
    return nodeStyles[attribute]
  }

  return node.style[attribute] as NodeStyle[T]
}

const edgeStyleSelector = <T extends keyof EdgeStyle>(edgeStyles: EdgeStyle, attribute: T) => (edge: PositionedEdge): EdgeStyle[T] => {
  if (edge.style === undefined || edge.style![attribute] === undefined) {
    return edgeStyles[attribute]
  }

  return edge.style[attribute] as NodeStyle[T]
}


export const D3Renderer = ({
  id,
  synchronous = DEFAULT_OPTIONS.synchronous,
  nodeStyles = {},
  edgeStyles = {},
}: Options) => {
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

  const edgeContainer = container.append('g')

  const nodesContainer = container.append('g')
    
  const zoomBehavior = zoom<SVGSVGElement, unknown>()
  svg.call(zoomBehavior.on('zoom', () => container.attr('transform', event.transform)))
  zoomBehavior.translateBy(svg, parentElement.offsetWidth / 2, parentElement.offsetHeight / 2)

  // is the closure necessary here?  why recreate the dragBehavior on every render
  const dragNode = () => dragBehavior<any, PositionedNode>()
    .on('start', dragStart)
    .on('drag', drag)
    .on('end', dragEnd)

  const NODE_STYLES = { ...DEFAULT_NODE_STYLES, ...nodeStyles }
  const EDGE_STYLES = { ...DEFAULT_EDGE_STYLES, ...edgeStyles }
  const _nodeWidthSelector = nodeStyleSelector(NODE_STYLES, 'width')
  const nodeWidthSelector = (node: PositionedNode) => _nodeWidthSelector(node) / 2
  const nodeStrokeWidthSelector = nodeStyleSelector(NODE_STYLES, 'strokeWidth')
  const nodeFillSelector = nodeStyleSelector(NODE_STYLES, 'fill')
  const nodeStrokeSelector = nodeStyleSelector(NODE_STYLES, 'stroke')
  const nodeFillOpacitySelector = nodeStyleSelector(NODE_STYLES, 'fillOpacity')
  const nodeStrokeOpacitySelector = nodeStyleSelector(NODE_STYLES, 'strokeOpacity')
  const edgeStrokeSelector = edgeStyleSelector(EDGE_STYLES, 'stroke')
  const edgeWidthSelector = edgeStyleSelector(EDGE_STYLES, 'width')
  const edgeStrokeOpacitySelector = edgeStyleSelector(EDGE_STYLES, 'strokeOpacity')

  // const nodeClickHandler = (d: PositionedNode) => console.log('click', d.id)
  // const nodeMouseEnterHandler = (d: PositionedNode) => console.log('mouseenter', d.id)
  // const nodeMouseLeaveHandler = (d: PositionedNode) => console.log('mouseleave', d.id)

  const graph = new Graph(({ nodes, edges }) => {
    nodesContainer
      .selectAll<SVGLineElement, PositionedNode>('circle')
      .data(Object.values(nodes), (d) => d.id)
      .join('circle')
      .attr('cx', (d) => d.x!)
      .attr('cy', (d) => d.y!)
      .style('cursor', 'pointer')
      .attr('r', nodeWidthSelector)
      .style('stroke-width', nodeStrokeWidthSelector)
      .style('fill', nodeFillSelector)
      .style('stroke', nodeStrokeSelector)
      .style('fill-opacity', nodeFillOpacitySelector)
      .style('stroke-opacity', nodeStrokeOpacitySelector)
      // .on('click', nodeClickHandler)
      // .on('mouseenter', nodeMouseEnterHandler)
      // .on('mouseleave', nodeMouseLeaveHandler)
      .call(dragNode())

    edgeContainer
      .selectAll<SVGLineElement, PositionedEdge>('line')
      .data(Object.values(edges), (d) => d.id)
      .join('line')
      .attr('x1', (d) => d.source.x!)
      .attr('y1', (d) => d.source.y!)
      .attr('x2', (d) => d.target.x!)
      .attr('y2', (d) => d.target.y!)
      .style('stroke', edgeStrokeSelector)
      .style('stroke-width', edgeWidthSelector)
      .style('stroke-opacity', edgeStrokeOpacitySelector)
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
