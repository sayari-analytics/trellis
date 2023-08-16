import * as WebGL from '../../src/renderers/webgl-next'
import * as Graph from '../../src'
import { range } from '../utils'

try {
  document.createElement('canvas').getContext('webgl')
  // eslint-disable-next-line no-console
  console.log('browser supports webgl')
} catch (err) {
  console.warn(err)
}

const container = document.querySelector('#graph') as HTMLDivElement

const render = new WebGL.InternalRenderer({ container, debug: true })
;(window as any).render = render


const NODE_STYLE: Graph.Node['style'] = { color: 'blue', stroke: [{ width: 1, color: '#aaf' }] }
const nodeCoordinates: Record<number, Set<number>> = {}

let nodes = Array.from(range(100000, 50, 0.5)).map(([x, y], i) => {
  if (nodeCoordinates[x] === undefined) {
    nodeCoordinates[x] = new Set()
  }
  nodeCoordinates[x].add(y)

  return { id: i.toString(), x, y, radius: 10, style: NODE_STYLE }
})
// const edges: Graph.Edge[] = nodes.reduce<Graph.Edge[]>((edges, { x, y }) => {
//   if (nodeCoordinates[x + 1] !== undefined) {

//   }

//   return edges
// }, [])
let edges: Graph.Edge[] = [
  { id: '1', source: '10', target: '20' },
  { id: '2', source: '50', target: '75' },
]
const renderOptions: WebGL.Options = {
  width: 1200, // container.offsetWidth,
  height: 1200, // container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.025,
  maxZoom: 5,
  onViewportPointerDown: (event: WebGL.ViewportPointerEvent) => {
    // console.log('pointer down', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportDragStart: (event: WebGL.ViewportDragEvent) => {
    // console.log('drag start', `x: ${event.viewportX}, y: ${event.viewportY}`)
  },
  onViewportDrag: (event: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    // if (event.type === 'viewportDrag') {
    //   console.log('drag', `x: ${event.viewportX}, y: ${event.viewportY}`)
    // }

    renderOptions.x = event.viewportX
    renderOptions.y = event.viewportY
    render.update({ nodes, edges, options: renderOptions })
  },
  onViewportDragEnd: (event: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    // console.log('drag end', `x: ${event.viewportX}, y: ${event.viewportY}`)
  },
  onViewportPointerUp: (event: WebGL.ViewportPointerEvent) => {
    // console.log('pointer up', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportClick: (event: WebGL.ViewportPointerEvent) => {
    // console.log('click', `x: ${event.x}, y: ${event.y}`)
    renderOptions.zoom = renderOptions.zoom! > 0.25 ? 0.1 : 1
    renderOptions.x = renderOptions.x! < 100 ? 400 : 0
    renderOptions.y = renderOptions.y! < 100 ? 400 : 0
    render.update({ nodes, edges, options: renderOptions })
  },
  onViewportDoubleClick: (event: WebGL.ViewportPointerEvent) => {
    // console.log('double click', `x: ${event.x}, y: ${event.y}`)
  },
  onNodePointerEnter: (event: WebGL.NodePointerEvent) => {
    // console.log('node pointer enter', `x: ${event.x}, y: ${event.y}`)
  },
  onNodePointerDown: (event: WebGL.NodePointerEvent) => {
    // console.log('node pointer down', `x: ${event.x}, y: ${event.y}`)
  },
  onNodeDragStart: (event: WebGL.NodeDragEvent) => {
    // console.log('node drag start', `x: ${event.x}, y: ${event.y}`)
  },
  onNodeDrag: (event: WebGL.NodeDragEvent) => {
    nodes = nodes.map((node) => (node.id === event.target.id ? { ...node, x: event.nodeX, y: event.nodeY } : node))
    render.update({ nodes, edges, options: renderOptions })
  },
  onNodeDragEnd: (event: WebGL.NodeDragEvent) => {
    // console.log('node drag end', `x: ${event.x}, y: ${event.y}`)
  },
  onNodePointerUp: (event: WebGL.NodePointerEvent) => {
    // console.log('node pointer up', `x: ${event.x}, y: ${event.y}`)
  },
  onNodeClick: (event: WebGL.NodePointerEvent) => {
    // console.log('node pointer click', `x: ${event.x}, y: ${event.y}`)
  },
  onNodeDoubleClick: (event: WebGL.NodePointerEvent) => {
    // console.log('node pointer double click', `x: ${event.x}, y: ${event.y}`)
  },
  onNodePointerLeave: (event: WebGL.NodePointerEvent) => {
    // console.log('node pointer leave', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    render.update({ nodes, edges, options: renderOptions })
  },
}

render.update({ nodes, edges, options: renderOptions })


// const nodes = []
// for (let i = 0; i < 500000; i++) {
//   nodes.push({ id: i })
// }

// const nodesById: Record<string, { id: string }> = {}

// const t0 = performance.now()
// for (const node of nodes) {
//   nodesById[node.id] = node
// }

// console.log(performance.now() - t0)
