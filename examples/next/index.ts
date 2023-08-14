import * as WebGL from '../../src/renderers/webgl-next'
import * as Graph from '../../src/'

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

const nodes: Graph.Node[] = []
const edges: Graph.Edge[] = []
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
  onViewportDragEnd: (event: WebGL.ViewportDragEvent) => {
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
  onViewportWheel: ({ viewportX, viewportY, viewportZoom }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    renderOptions.zoom = viewportZoom
    render.update({ nodes, edges, options: renderOptions })
  },
}

render.update({ nodes, edges, options: renderOptions })
