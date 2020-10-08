// import { select, event } from 'd3-selection'
// import { zoom } from 'd3-zoom'
// import { drag as dragBehavior } from 'd3-drag'
// import raf from 'raf'
// import { interpolateDuration, noop } from '../../utils'
// import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
// import { LayoutOptions } from '../../layout/force'
// import { Node, Edge } from '../../types'


// type NodeStyle = {
//   strokeWidth: number
//   fill: string
//   stroke: string
//   fillOpacity: number
//   strokeOpacity: number
//   icon?: string
// }

// type EdgeStyle = {
//   width: number
//   stroke: string
//   strokeOpacity: number
// }

// type PositionedNodeWithInitialPosition = Node & { x0?: number, y0?: number }
// type PositionedEdgeWithInitialPosition<Props extends object = {}, Style extends object = {}> = Omit<Edge, 'source' | 'target'> &
//   { source: PositionedNodeWithInitialPosition, target: PositionedNodeWithInitialPosition }
// type RenderOptions = {
//   id: string
//   nodeStyle: Partial<NodeStyle>
//   edgeStyle: Partial<EdgeStyle>
//   onNodeMouseDown: (node: Node, location: { x: number, y: number }) => void
//   onNodeDrag: (node: Node, location: { x: number, y: number }) => void
//   onNodeMouseUp: (node: Node, location: { x: number, y: number }) => void
// }


// const NODE_STYLES: NodeStyle = {
//   strokeWidth: 2,
//   fill: '#ff4b4b',
//   stroke: '#bb0000',
//   fillOpacity: 1,
//   strokeOpacity: 1,
// }

// const EDGE_STYLES: EdgeStyle = {
//   width: 1,
//   stroke: '#ccc',
//   strokeOpacity: 1,
// }

// export type NodeStyleSelector = <T extends keyof NodeStyle>(node: Node, attribute: T) => NodeStyle[T]
// export const nodeStyleSelector = (nodeStyles: NodeStyle): NodeStyleSelector => <T extends keyof NodeStyle>(node: Node, attribute: T) => {
//   if (node.style === undefined || node.style![attribute] === undefined) {
//     return nodeStyles[attribute]
//   }

//   return node.style[attribute] as NodeStyle[T]
// }


// export type EdgeStyleSelector = <T extends keyof EdgeStyle>(edge: PositionedEdgeWithInitialPosition<{}, Partial<EdgeStyle>>, attribute: T) => EdgeStyle[T]
// export const edgeStyleSelector = (edgeStyles: EdgeStyle): EdgeStyleSelector => <T extends keyof EdgeStyle>(edge: PositionedEdgeWithInitialPosition<{}, Partial<EdgeStyle>>, attribute: T) => {
//   if (edge.style === undefined || edge.style![attribute] === undefined) {
//     return edgeStyles[attribute]
//   }

//   return edge.style[attribute] as EdgeStyle[T]
// }

// const ANIMATION_DURATION = 800


// export const D3Renderer = ({
//   id,
//   nodeStyle = {},
//   edgeStyle = {},
//   onNodeMouseDown = noop,
//   onNodeDrag = noop,
//   onNodeMouseUp = noop,
// }: RenderOptions) => {
//   const parent = select<HTMLElement, unknown>(`#${id}`)
//   const parentElement = parent.node()
//   if (parentElement === null) {
//     throw new Error(`Element with id ${id} not found`)
//   }

//   const svg = parent
//     .append('svg')
//     .attr('height', '100%')
//     .attr('width', '100%')
//     .style('cursor', 'move')

//   const container = svg.append('g')

//   const edgeContainer = container.append('g')

//   const nodesContainer = container.append('g')

//   const zoomBehavior = zoom<SVGSVGElement, unknown>()
//   svg.call(zoomBehavior.on('zoom', () => container.attr('transform', event.transform)))
//   zoomBehavior.translateBy(svg, parentElement.offsetWidth / 2, parentElement.offsetHeight / 2)

//   let draggedNode: string | undefined
//   let currentNodes: { [key: string]: PositionedNodeWithInitialPosition }
//   let currentEdges: { [key: string]: PositionedEdgeWithInitialPosition }
//   let currentOptions: LayoutOptions

//   const dragNode = dragBehavior<any, Node>()
//     .on('start', (d) => (draggedNode = d.id, onNodeMouseDown(d, { x: event.x, y: event.y })))
//     .on('drag', (d) => {
//       render({ nodes: currentNodes, edges: currentEdges, options: currentOptions })
//       onNodeDrag(d, { x: event.x, y: event.y })
//     })
//     .on('end', (d) => (draggedNode = undefined, onNodeMouseUp(d, { x: event.x, y: event.y })))

//   const _nodeStyleSelector = nodeStyleSelector({ ...NODE_STYLES, ...nodeStyle })
//   const _edgeStyleSelector = edgeStyleSelector({ ...EDGE_STYLES, ...edgeStyle })
//   const nodeStrokeWidthSelector = (node: Node) => _nodeStyleSelector(node, 'strokeWidth')
//   const nodeFillSelector = (node: Node) => _nodeStyleSelector(node, 'fill')
//   const nodeStrokeSelector = (node: Node) => _nodeStyleSelector(node, 'stroke')
//   const nodeFillOpacitySelector = (node: Node) => _nodeStyleSelector(node, 'fillOpacity')
//   const nodeStrokeOpacitySelector = (node: Node) => _nodeStyleSelector(node, 'strokeOpacity')
//   const edgeStrokeSelector = (edge: PositionedEdgeWithInitialPosition) => _edgeStyleSelector(edge, 'stroke')
//   const edgeWidthSelector = (edge: PositionedEdgeWithInitialPosition) => _edgeStyleSelector(edge, 'width')
//   const edgeStrokeOpacitySelector = (edge: PositionedEdgeWithInitialPosition) => _edgeStyleSelector(edge, 'strokeOpacity')

//   // const nodeClickHandler = (d: PositionedNode) => console.log('click', d.id)
//   // const nodeMouseEnterHandler = (d: PositionedNode) => console.log('mouseenter', d.id)
//   // const nodeMouseLeaveHandler = (d: PositionedNode) => console.log('mouseleave', d.id)

//   const interpolateLayout = interpolateDuration(ANIMATION_DURATION)
//   const synchronousLayout = (cb: (n: number) => void) => raf(() => cb(1))
//   const interpolatePosition = (start: number, end: number, percent: number) => {
//     const interpolate = interpolateNumber(start, end)
//     return interpolateBasis([interpolate(0), interpolate(0.1), interpolate(0.8), interpolate(0.95), interpolate(1)])(percent)
//   }

//   const render = ({ nodes, edges, options }: {
//     nodes: { [key: string]: Node },
//     edges: { [key: string]: PositionedEdgeWithInitialPosition },
//     options: LayoutOptions
//   }) => {
//     Object.entries(nodes as { [key: string]: PositionedNodeWithInitialPosition }).forEach(([nodeId, node]) => {
//       if (currentNodes && currentNodes[nodeId]) {
//         node.x0 = currentNodes[nodeId].x0
//         node.y0 = currentNodes[nodeId].y0
//       }
//     })

//     currentNodes = nodes
//     currentEdges = edges
//     currentOptions = options;
//     /**
//      * interpolation animations are disabled while dragging, which means adding new nodes while dragging is weirdly jerky
//      * why does interpolating layout while dragging not really work? should node position interpolation be disabled only for the single node?
//      * or should we split selection/rendering between dragged nodes and other nodes
//      */
//     (draggedNode !== undefined || options.tick === null ? synchronousLayout : interpolateLayout)((n: number) => {
//       nodesContainer
//         .selectAll<SVGLineElement, Node & { x0?: number, y0?: number }>('circle')
//         .data(Object.values(currentNodes), (d) => d.id)
//         .join('circle')
//         .attr('cx', (d) => {
//           d.x0 = interpolatePosition(d.x0 || 0, d.x!, n)
//           return d.x0
//         })
//         .attr('cy', (d) => {
//           d.y0 = interpolatePosition(d.y0 || 0, d.y!, n)
//           return d.y0
//         })
//         // .attr('cx', (d) => d.id === draggedNode ? d.x! : interpolatePosition(d.x0 || 0, d.x!, n))
//         // .attr('cy', (d) => d.id === draggedNode ? d.y! : interpolatePosition(d.y0 || 0, d.y!, n))
//         .style('cursor', 'pointer')
//         .attr('r', (d) => d.radius)
//         .style('stroke-width', nodeStrokeWidthSelector)
//         .style('fill', nodeFillSelector)
//         .style('stroke', nodeStrokeSelector)
//         .style('fill-opacity', nodeFillOpacitySelector)
//         .style('stroke-opacity', nodeStrokeOpacitySelector)
//         // .on('click', nodeClickHandler)
//         // .on('mouseenter', nodeMouseEnterHandler)
//         // .on('mouseleave', nodeMouseLeaveHandler)
//         .call(dragNode)

//       edgeContainer
//         .selectAll<SVGLineElement, PositionedEdgeWithInitialPosition>('line')
//         .data(Object.values(currentEdges), (d) => d.id)
//         .join('line')
//         .attr('x1', (d) => d.id === draggedNode ? d.source.x! : interpolatePosition(d.source.x0 || 0, d.source.x!, n))
//         .attr('y1', (d) => d.id === draggedNode ? d.source.y! : interpolatePosition(d.source.y0 || 0, d.source.y!, n))
//         .attr('x2', (d) => d.id === draggedNode ? d.target.x! : interpolatePosition(d.target.x0 || 0, d.target.x!, n))
//         .attr('y2', (d) => d.id === draggedNode ? d.target.y! : interpolatePosition(d.target.y0 || 0, d.target.y!, n))
//         .attr('x1', (d) => interpolatePosition(d.source.x0 || 0, d.source.x!, n))
//         .attr('y1', (d) => interpolatePosition(d.source.y0 || 0, d.source.y!, n))
//         .attr('x2', (d) => interpolatePosition(d.target.x0 || 0, d.target.x!, n))
//         .attr('y2', (d) => interpolatePosition(d.target.y0 || 0, d.target.y!, n))
//         .style('stroke', edgeStrokeSelector)
//         .style('stroke-width', edgeWidthSelector)
//         .style('stroke-opacity', edgeStrokeOpacitySelector)
//     })
//   }

//   return render
// }
