import Stats from 'stats.js'
import * as Force from '../../src/layout/force'
import * as Download from '../../src/bindings/native/download'
import * as WebGL from '../../src/renderers/webgl'
import * as Png from '../../src/renderers/image'
import * as Graph from '../../src'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


/**
 * Initialize Data
 */
const createCompanyStyle = (radius: number): Graph.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#FFF', width: 4 }, { color: '#F7CA4D' }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius * 1.2 },
  badge: [{
    position: 45,
    color: '#FFAF1D',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 10,
      color: '#FFF',
      text: '15',
    }
  }, {
    position: 135,
    color: '#E4171B',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 10,
      color: '#FFF',
      text: '!',
    }
  }],
})

const createPersonStyle = (radius: number): Graph.NodeStyle => ({
  color: '#7CBBF3',
  labelSize: 10,
  labelWordWrap: 260,
  stroke: [{ color: '#FFF', width: 2 }, { color: '#90D7FB', width: 1 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: radius * 1.2 },
  badge: [{
    position: 45,
    color: '#7CBBF3',
    stroke: '#FFF',
    icon: {
      type: 'textIcon',
      family: 'Helvetica',
      size: 10,
      color: '#FFF',
      text: '8',
    }
  }],
})

let annotations = [{
  type: 'text' as const,
  id: 'test-text-annotation',
  width: 100,
  height: 100,
  x: -400,
  y: -200,
  resize: true,
  content: 'This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text.',
  style: {
    color: '#FFFFFF',
    stroke: {
      color: '#000000',
      width: .5
    },
    text: {
      fontSize: 18
    }
  }
}, {
  type: 'text' as const,
  id: 'test-text-annotation-2',
  width: 100,
  height: 100,
  x: -600,
  y: -200,
  resize: true,
  content: 'TEST 2',
  style: {
    color: '#FFFFFF',
    stroke: {
      color: '#000000',
      width: .5
    },
    text: {
      fontSize: 18
    }
  }
}, {
  type: 'rectangle' as const,
  id: 'test-rectangle-annotation',
  width: 100,
  height: 100,
  x: -600,
  y: -400,
  resize: true,
  style: {
    color: '#FFFFFF',
    stroke: {
      color: '#000000',
      width: .5
    }
  }
}]

let nodes = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
  { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
  { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map<Graph.Node>(({ id, label }) => ({
    id,
    label,
    radius: 18,
    style: id === 'a' ? createCompanyStyle(18) : createPersonStyle(18)
  }))

let edges: Graph.Edge[] = [
  { id: 'ea', source: 'a', target: 'e', label: 'A to E', style: { arrow: 'forward' } }, { id: 'fa', source: 'a', target: 'f', label: 'A to F', style: { arrow: 'forward' } },
  { id: 'ga', source: 'a', target: 'g', label: 'A to G', style: { arrow: 'forward' } }, { id: 'ha', source: 'a', target: 'h', label: 'A to H', style: { arrow: 'forward' } },
  { id: 'ia', source: 'a', target: 'i', label: 'A to I', style: { arrow: 'forward' } }, { id: 'ja', source: 'b', target: 'j', label: 'B to J', style: { arrow: 'forward' } },
  { id: 'ka', source: 'b', target: 'k', label: 'K to B', style: { arrow: 'reverse' } }, { id: 'la', source: 'b', target: 'l', label: 'L to B', style: { arrow: 'reverse' } },
  { id: 'ma', source: 'l', target: 'm', label: 'M to L', style: { arrow: 'reverse' } }, { id: 'nc', source: 'n', target: 'c', label: 'N to C', style: { arrow: 'forward' } },
  { id: 'oa', source: 'c', target: 'o', label: 'Both', style: { arrow: 'both' } }, { id: 'pa', source: 'c', target: 'p', label: 'Both', style: { arrow: 'both' } },
  { id: 'qa', source: 'c', target: 'q', label: 'Both', style: { arrow: 'both' } },
]


/**
 * Create Renderer and Layout
 */
const container = document.querySelector('#graph') as HTMLDivElement
const imageRenderer = Png.Renderer()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})
const force = Force.Layout()



/**
 * Create Download Controls
 */
const downloadControl = Download.Control({ container })
downloadControl({
  top: 75,
  onClick: () => {
    const bounds = Graph.getSelectionBounds(nodes, 60)
    const dimensions = Graph.boundsToDimensions(bounds, 1)
    const viewport = Graph.boundsToViewport(bounds, dimensions)

    return imageRenderer({
      nodes: nodes,
      edges: edges,
      annotations: annotations,
      options: {
        width: dimensions.width,
        height: dimensions.height,
        x: viewport.x,
        y: viewport.y,
        zoom: 1,
      }
    })
  }
})


/**
 * Layout and Render Graph
 */
const layoutOptions: Force.Options = {
  nodeStrength: -500,
}
const renderOptions: WebGL.Options = {
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
    render({ nodes, edges, annotations, options: renderOptions })
  },
  onNodePointerEnter: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: {
        ...node.style,
        stroke: node.id === 'a' ?
          node.style?.stroke?.map((stroke, idx) => ({ ...stroke, color: idx % 2 === 0 ? '#FFF' : '#CCC' })) :
          node.style?.stroke?.map((stroke) => ({ ...stroke, color: '#CCC' }))
      }
    } : node))
    render({ nodes, edges, annotations, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: {
        ...node.style,
        stroke: node.id === 'a' ?
          createCompanyStyle(48).stroke :
          createPersonStyle(48).stroke
      }
    } : node))
    render({ nodes, edges, annotations, options: renderOptions })
  },
  onEdgePointerEnter: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    render({ nodes, edges, annotations, options: renderOptions })
  },
  onEdgePointerLeave: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    render({ nodes, edges, annotations, options: renderOptions })
  },
  onAnnotationDrag: ({ annotationX, annotationY, target: { id, x = 0, y = 0 } }: WebGL.AnnotationDragEvent) => {
    const dx = annotationX - x
    const dy = annotationY - y

    annotations = annotations.map((annotation) => (
      annotation.id === id ? (
        { ...annotation, x: annotation.x + dx, y: annotation.y + dy }
      ) : annotation
    ))

    render({ nodes, edges, annotations, options: renderOptions })
  },
  onAnnotationResize: ({ width, height, target: { id, x = 0, y = 0 } }: WebGL.AnnotationResizeEvent) => {
    annotations = annotations.map((annotation) => (
      annotation.id === id ? (
        { ...annotation, width, height }
      ) : annotation
    ))

    render({ nodes, edges, annotations, options: renderOptions })
  },
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    render({ nodes, edges, annotations, options: renderOptions })
  }
}


force({ nodes, edges, options: layoutOptions }).then((graph) => {
  nodes = graph.nodes

  const { x, y, zoom } = Graph.boundsToViewport(
    Graph.getSelectionBounds(nodes, 40),
    { width: renderOptions.width!, height: renderOptions.height! }
  )
  renderOptions.x = x
  renderOptions.y = y
  renderOptions.zoom = zoom

  render({ nodes, edges, annotations, options: renderOptions })
})
