import Stats from 'stats.js'
import * as Hierarchy from '../../src/layout/hierarchy'
import * as Force from '../../src/layout/force'
import * as Graph from '../../src/'
import * as Zoom from '../../src/bindings/native/zoom'
import * as WebGL from '../../src/renderers/webgl'
import graphData from '../../data/tmp-data'

export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

/**
 * Initialize Data
 */
type Node = Graph.Node & { type: string }

const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'

const createCompanyStyle = (radius: number): Graph.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#FFF' }, { color: '#F7CA4D' }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'business',
    color: '#fff',
    size: radius * 1.2
  },
  badge: [
    {
      position: 45,
      color: '#FFAF1D',
      stroke: '#FFF',
      icon: { type: 'textIcon', family: 'Helvetica', size: 10, color: '#FFF', text: '15' }
    },
    {
      position: 135,
      color: '#E4171B',
      stroke: '#FFF',
      icon: { type: 'textIcon', family: 'Helvetica', size: 10, color: '#FFF', text: '!' }
    }
  ]
})

const createPersonStyle = (radius: number): Graph.NodeStyle => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB' }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'person',
    color: '#fff',
    size: radius * 1.2
  },
  badge: [
    {
      position: 45,
      color: '#7CBBF3',
      stroke: '#FFF',
      icon: { type: 'textIcon', family: 'Helvetica', size: 10, color: '#FFF', text: '8' }
    }
  ]
})

let nodes = Object.values(graphData.nodes)
  .map((node, idx) => ({
    ...node,
    label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel : node.label
  }))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
  .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    radius: 18,
    type,
    style: type === 'company' ? createCompanyStyle(18) : createPersonStyle(18)
  }))

let edges = Object.entries<{ field: string; source: string; target: string }>(graphData.edges)
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }])
  )
  .concat(
    Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }])
  )
  .concat([
    [
      'connect_2',
      {
        field: 'related_to',
        source: Object.values(graphData.nodes)[77].id,
        target: `${Object.values(graphData.nodes)[0].id}_2`
      }
    ],
    [
      'connect_3',
      {
        field: 'related_to',
        source: `${Object.values(graphData.nodes)[50].id}_2`,
        target: `${Object.values(graphData.nodes)[0].id}_3`
      }
    ]
  ])
  .map<Graph.Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
    style: { arrow: 'forward' }
  }))

let hierarchyNodes: Node[] = []
let hierarchyEdges: Graph.Edge[] = []

let forceNodes: Node[] = []
let forceEdges: Graph.Edge[] = []

/**
 * Initialize Layout and Renderer
 */
const container = document.querySelector('#graph') as HTMLDivElement
const hierarchy = Hierarchy.Layout()
const force = Force.Layout()
const zoomControl = Zoom.Control({ container })
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})

/**
 * Initialize Layout and Renderer Options
 */
const layoutOptions: Hierarchy.Options = {
  y: container.offsetHeight,
  x: 600
}
const renderOptions: WebGL.Options<Node, Graph.Edge> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 2.5,
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: ({ target: { id } }) => {
    nodes = nodes.map((node) =>
      node.id === id
        ? {
            ...node,
            style: {
              ...node.style,
              stroke: node.type === 'company' ? [{ color: '#FFF' }, { color: '#CCC' }] : [{ color: '#CCC' }]
            }
          }
        : node
    )
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes = nodes.map((node) =>
      node.id === id
        ? {
            ...node,
            style: node.type === 'company' ? createCompanyStyle(18) : createPersonStyle(18)
          }
        : node
    )
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerEnter: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerLeave: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onViewportPointerDown: () => {
    if (layout === 'hierarchy') {
      layout = 'force'
      nodes = forceNodes
      edges = forceEdges
      // const { x, y, zoom } = Graph.boundsToViewport(
      //   Graph.getSelectionBounds(nodes, 80),
      //   { width: renderOptions.width!, height: renderOptions.height! }
      // )
      // renderOptions.x = x
      // renderOptions.y = y
      // renderOptions.zoom = zoom

      render({ nodes, edges, options: renderOptions })
    } else {
      layout = 'hierarchy'
      nodes = hierarchyNodes
      edges = hierarchyEdges
      // const { x, y, zoom } = Graph.boundsToViewport(
      //   Graph.getSelectionBounds(nodes, 80),
      //   { width: renderOptions.width!, height: renderOptions.height! }
      // )
      // renderOptions.x = x
      // renderOptions.y = y
      // renderOptions.zoom = zoom

      render({ nodes, edges, options: renderOptions })
    }
  },
  onViewportDrag: ({ viewportX, viewportY }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    render({ nodes, edges, options: renderOptions })
  },
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    render({ nodes, edges, options: renderOptions })
  }
}

/**
 * Layout and Render Graph
 */
zoomControl({
  top: 80,
  onZoomIn: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! / 0.6)
    render({ nodes, edges, options: renderOptions })
  },
  onZoomOut: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! * 0.6)
    render({ nodes, edges, options: renderOptions })
  }
})

let layout = 'hierarchy'
const hierarchyData = hierarchy(nodes[0].id, { nodes, edges, options: layoutOptions })
nodes = hierarchyNodes = hierarchyData.nodes
edges = hierarchyEdges = hierarchyData.edges
force({ nodes, edges }).then((forceData) => {
  forceNodes = forceData.nodes
  forceEdges = forceData.edges

  const { x, y, zoom } = Graph.boundsToViewport(Graph.getSelectionBounds(nodes, 80), {
    width: renderOptions.width!,
    height: renderOptions.height!
  })
  renderOptions.x = x
  renderOptions.y = y
  renderOptions.zoom = zoom

  render({ nodes, edges, options: renderOptions })
})
