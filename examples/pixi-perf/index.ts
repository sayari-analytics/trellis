import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as Graph from '../../src/'
import * as Zoom from '../../src/bindings/native/zoom'
import * as Download from '../../src/bindings/native/download'
import * as WebGL from '../../src/renderers/webgl'
import * as Png from '../../src/renderers/image'
import graphData from '../../data/tmp-data'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


type Node = Graph.Node & { type: string }


/**
 * Initialize Data
 */
const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'
const data = {
  nodes: Object.values(graphData.nodes)
    .map((node, idx) => ({ ...node, label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel: node.label }))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_5` })))
    // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_6` })))
    .map<Node>(({ id, label, type }) => ({
      id,
      label,
      radius: 18,
      type,
      style: {
        color: type === 'company' ? '#ffaf1d' : '#7CBBF3',
        stroke: [{ color: type === 'company' ? '#F7CA4D' : '#90D7FB', width: 4 }],
        icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: 20 },
        badge: type === 'company' ? [{
          position: 45,
          color: '#FFAF1D',
          stroke: '#FFF',
          icon: {
            type: 'textIcon',
            family: 'Helvetica',
            size: 10,
            color: '#FFF',
            text: '8',
          }
        }] : undefined,
      }
    })),
  edges: Object.entries<{ field: string, source: string, target: string }>(graphData.edges)
    .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
    .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
    .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }]))
    // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_5`, { ...edge, source: `${edge.source}_5`, target: `${edge.target}_5` }]))
    .concat([
      ['connect_a', { field: 'related_to', source: Object.values(graphData.nodes)[0].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
      ['connect_d', { field: 'related_to', source: `${Object.values(graphData.nodes)[15].id}`, target: `${Object.values(graphData.nodes)[15].id}_2` }],
      ['connect_g', { field: 'related_to', source: `${Object.values(graphData.nodes)[30].id}`, target: `${Object.values(graphData.nodes)[30].id}_2` }],
      ['connect_b', { field: 'related_to', source: `${Object.values(graphData.nodes)[5].id}_2`, target: `${Object.values(graphData.nodes)[5].id}_3` }],
      ['connect_e', { field: 'related_to', source: `${Object.values(graphData.nodes)[20].id}_2`, target: `${Object.values(graphData.nodes)[20].id}_3` }],
      ['connect_h', { field: 'related_to', source: `${Object.values(graphData.nodes)[35].id}_2`, target: `${Object.values(graphData.nodes)[35].id}_3` }],
      ['connect_c', { field: 'related_to', source: `${Object.values(graphData.nodes)[10].id}_3`, target: `${Object.values(graphData.nodes)[10].id}_4` }],
      ['connect_f', { field: 'related_to', source: `${Object.values(graphData.nodes)[25].id}_3`, target: `${Object.values(graphData.nodes)[25].id}_4` }],
      ['connect_i', { field: 'related_to', source: `${Object.values(graphData.nodes)[40].id}_3`, target: `${Object.values(graphData.nodes)[40].id}_4` }],
    ])
    .map<Graph.Edge>(([id, { field, source, target }]) => ({
      id,
      source,
      target,
      label: field.replace(/_/g, ' '),
      style: { arrow: 'forward' }
    }))
}

let nodes: Node[] = []
let edges: Graph.Edge[] = []


/**
 * Initialize Layout and Renderers
 */
const container = document.querySelector('#graph') as HTMLDivElement
const layout = Force.Layout()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})
const imageRenderer = Png.Renderer()


/**
 * Initialize Zoom Control
 */
const zoomControl = Zoom.Control({ container })
const zoomOptions: Zoom.Options = {
  top: 80,
  onZoomIn: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! / 0.6)
    render({ nodes, edges, options: renderOptions })
  },
  onZoomOut: () => {
    renderOptions.zoom = Zoom.clampZoom(renderOptions.minZoom!, renderOptions.maxZoom!, renderOptions.zoom! * 0.6)
    render({ nodes, edges, options: renderOptions })
  },
}
zoomControl(zoomOptions)


/**
 * Create Download Controls
 */
const downloadControl = Download.Control({ container })
downloadControl({
  top: 160,
  onClick: () => {
    const { width, height } = Graph.boundsToDimensions(Graph.getSelectionBounds(nodes, 80), 1)

    return imageRenderer({
      nodes: nodes,
      edges: edges,
      options: {
        width,
        height,
        x: 0,
        y: 0,
        zoom: 1,
      }
    })
  }
})


/**
 * Layout and Render Graph
 */
const renderOptions: WebGL.Options<Node, Graph.Edge> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 2.5,
  nodesEqual: (prev, current) => prev === current,
  edgesEqual: (prev, current) => prev === current,
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ?
      { ...node, radius: node.radius * 4, style: { ...node.style, stroke: [{ color: '#CCC', width: 4 }] } } :
      node
    ))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      radius: 18,
      style: {
        ...node.style,
        stroke: [{ color: node.type === 'company' ? '#F7CA4D' : '#90D7FB', width: 4 }]
      }
    } : node))
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


const NODES_PER_TICK = 20
const INTERVAL = 2000
const COUNT = Math.ceil(data.nodes.length / NODES_PER_TICK)
let idx = 0


console.log(`Rendering ${NODES_PER_TICK} nodes every ${INTERVAL}ms ${COUNT} times \nnode count: ${data.nodes.length} \nedge count ${data.edges.length}`)


const update = () => {
  idx++
  // TODO - why does preserving node position perform poorly
  // const newNodes = data.nodes.slice(0, (idx + 1) * NODES_PER_TICK).map((node) => nodes.find(({ id }) => id === node.id) ?? node)
  const newNodes = data.nodes.slice(0, (idx + 1) * NODES_PER_TICK)
  const nodeIds = newNodes.reduce<Set<string>>((ids, { id }) => ids.add(id), new Set())
  const newEdges = data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  /**
   * uncomment to simulate bad data
   */
  // const newEdges = idx === 3 ?
  //   data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)).concat([{ id: '!', source: 'a', target: 'b' }]) :
  //   data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))

  layout({ nodes: newNodes, edges: newEdges }).then((graph) => {
    nodes = graph.nodes
    edges = graph.edges

    const { x, y, zoom } = Graph.boundsToViewport(
      Graph.getSelectionBounds(nodes, 80),
      { width: renderOptions.width!, height: renderOptions.height! }
    )
    renderOptions.x = x
    renderOptions.y = y
    renderOptions.zoom = zoom

    render({ nodes, edges, options: renderOptions })
  }).catch((error) => {
    console.error(error)
  })
}

const interval = setInterval(() => {
  if (idx === COUNT) {
    clearInterval(interval)
  } else {
    update()
  }
}, INTERVAL)
update()


;(window as any).render = render
