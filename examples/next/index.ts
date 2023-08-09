import * as WebGL from '../../src/renderers/webgl-next'
import * as Graph from '../../src/'

const container = document.querySelector('#graph') as HTMLDivElement

const render = new WebGL.InternalRenderer({ container })

const nodes: Graph.Node[] = []
const edges: Graph.Edge[] = []
const renderOptions: WebGL.Options = {
  width: 600, // container.offsetWidth,
  height: 600, // container.offsetHeight,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 2.5,
  onViewportPointerDown: (event: WebGL.ViewportPointerEvent) => {
    // console.log('pointer down', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportDragStart: (event: WebGL.ViewportDragEvent) => {
    // console.log('drag start', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportDrag: (event: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    if (event.type === 'viewportDrag') {
      // console.log('drag', `x: ${event.x}, y: ${event.y}`)
    }

    renderOptions.x = event.viewportX
    renderOptions.y = event.viewportY
    render.update({ nodes, edges, options: renderOptions })
  },
  onViewportDragEnd: (event: WebGL.ViewportDragEvent) => {
    // console.log('drag end', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportPointerUp: (event: WebGL.ViewportPointerEvent) => {
    // console.log('pointer up', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    render.update({ nodes, edges, options: renderOptions })
  },
}

render.update({ nodes, edges, options: renderOptions })
