import { select, event } from 'd3-selection'
import { zoom } from 'd3-zoom'
import { drag as dragBehavior } from 'd3-drag'
import raf from 'raf'
import { PositionedNode, PositionedEdge } from '../index'
import { DEFAULT_NODE_STYLES, DEFAULT_EDGE_STYLES, RendererOptions } from './options'
import { interpolateDuration, noop } from '../utils'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { nodeStyleSelector, edgeStyleSelector } from './utils'
import { SimulationOptions } from '../simulation'


export const D3Renderer = ({
  id,
  nodeStyle = {},
  edgeStyle = {},
  onNodeMouseEnter = noop,
  onNodeMouseDown = noop,
  onNodeDrag = noop,
  onNodeMouseUp = noop,
  onNodeMouseLeave = noop,
}: RendererOptions) => {
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

  let draggedNode: string | undefined
  let currentNodes: { [key: string]: PositionedNode }
  let currentEdges: { [key: string]: PositionedEdge }
  let currentOptions: SimulationOptions

  const dragNode = dragBehavior<any, PositionedNode>()
    .on('start', (d) => (draggedNode = d.id, onNodeMouseDown(d, { x: event.x, y: event.y })))
    .on('drag', (d) => {
      render({ nodes: currentNodes, edges: currentEdges, options: currentOptions })
      onNodeDrag(d, { x: event.x, y: event.y })
    })
    .on('end', (d) => (draggedNode = undefined, onNodeMouseUp(d, { x: event.x, y: event.y })))

  const _nodeStyleSelector = nodeStyleSelector({ ...DEFAULT_NODE_STYLES, ...nodeStyle })
  const _edgeStyleSelector = edgeStyleSelector({ ...DEFAULT_EDGE_STYLES, ...edgeStyle })
  const nodeWidthSelector = (node: PositionedNode) => _nodeStyleSelector(node, 'width') / 2
  const nodeStrokeWidthSelector = (node: PositionedNode) => _nodeStyleSelector(node, 'strokeWidth')
  const nodeFillSelector = (node: PositionedNode) => _nodeStyleSelector(node, 'fill')
  const nodeStrokeSelector = (node: PositionedNode) => _nodeStyleSelector(node, 'stroke')
  const nodeFillOpacitySelector = (node: PositionedNode) => _nodeStyleSelector(node, 'fillOpacity')
  const nodeStrokeOpacitySelector = (node: PositionedNode) => _nodeStyleSelector(node, 'strokeOpacity')
  const edgeStrokeSelector = (edge: PositionedEdge) => _edgeStyleSelector(edge, 'stroke')
  const edgeWidthSelector = (edge: PositionedEdge) => _edgeStyleSelector(edge, 'width')
  const edgeStrokeOpacitySelector = (edge: PositionedEdge) => _edgeStyleSelector(edge, 'strokeOpacity')

  // const nodeClickHandler = (d: PositionedNode) => console.log('click', d.id)
  // const nodeMouseEnterHandler = (d: PositionedNode) => console.log('mouseenter', d.id)
  // const nodeMouseLeaveHandler = (d: PositionedNode) => console.log('mouseleave', d.id)

  const interpolateLayout = interpolateDuration(400)
  const synchronousLayout = (cb: (n: number) => void) => raf(() => cb(1))
  const interpolatePosition = (start: number, end: number, percent: number) => {
    const interpolate = interpolateNumber(start, end)
    return interpolateBasis([interpolate(0), interpolate(0.1), interpolate(0.8), interpolate(0.95), interpolate(1)])(percent)
  }

  const render = ({ nodes, edges, options }: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge }, options: SimulationOptions }) => {
    currentNodes = nodes
    currentEdges = edges
    currentOptions = options;
    /**
     * interpolation animations are disabled while dragging, which means adding new nodes while dragging is weirdly jerky
     * why does interpolating layout while dragging not really work? should node position interpolation be disabled only for the single node?
     * or should we split selection/rendering between dragged nodes and other nodes
     */
    (draggedNode !== undefined || options.tick === null ? synchronousLayout : interpolateLayout)((n: number) => {
      nodesContainer
        .selectAll<SVGLineElement, PositionedNode>('circle')
        .data(Object.values(nodes), (d) => d.id)
        .join('circle')
        .attr('cx', (d) => interpolatePosition(d.x0 || 0, d.x!, n))
        .attr('cy', (d) => interpolatePosition(d.y0 || 0, d.y!, n))
        // .attr('cx', (d) => d.id === draggedNode ? d.x! : interpolatePosition(d.x0 || 0, d.x!, n))
        // .attr('cy', (d) => d.id === draggedNode ? d.y! : interpolatePosition(d.y0 || 0, d.y!, n))
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
        .call(dragNode)

      edgeContainer
        .selectAll<SVGLineElement, PositionedEdge>('line')
        .data(Object.values(edges), (d) => d.id)
        .join('line')
        // .attr('x1', (d) => d.id === draggedNode ? d.source.x! : interpolatePosition(d.source.x0 || 0, d.source.x!, n))
        // .attr('y1', (d) => d.id === draggedNode ? d.source.y! : interpolatePosition(d.source.y0 || 0, d.source.y!, n))
        // .attr('x2', (d) => d.id === draggedNode ? d.target.x! : interpolatePosition(d.target.x0 || 0, d.target.x!, n))
        // .attr('y2', (d) => d.id === draggedNode ? d.target.y! : interpolatePosition(d.target.y0 || 0, d.target.y!, n))
        .attr('x1', (d) => interpolatePosition(d.source.x0 || 0, d.source.x!, n))
        .attr('y1', (d) => interpolatePosition(d.source.y0 || 0, d.source.y!, n))
        .attr('x2', (d) => interpolatePosition(d.target.x0 || 0, d.target.x!, n))
        .attr('y2', (d) => interpolatePosition(d.target.y0 || 0, d.target.y!, n))
        .style('stroke', edgeStrokeSelector)
        .style('stroke-width', edgeWidthSelector)
        .style('stroke-opacity', edgeStrokeOpacitySelector)
    })
  }

  return render
}
