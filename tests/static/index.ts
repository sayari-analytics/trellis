/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Static from '../../src/renderers/static'
import * as Graph from '../../src'


// try { document.createElement('canvas').getContext('webgl'); console.info('browser supports webgl') } catch (err) { console.warn(err) }


const sampleCoordinatePlane = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample) * step
  let i = 0

  for (let x = -(side / 2); x < (side / 2); x += step) {
    for (let y = -(side / 2); y < (side / 2); y += step) {
      if (i >= count) {
        return
      }

      if (Math.random() > sample) {
        i++
        yield [x, y]
      }
    }
  }
}

const NODE_STYLE: Graph.NodeStyle = {
  color: 'red',
  stroke: [{ width: 2, color: '#f88' }]
}

const nodes: Graph.Node[] = []
const edges: Graph.Edge[] = []
const step = 50
const coordinates: Record<number, Set<number>> = {}
for (const [x, y] of sampleCoordinatePlane(100000, step, 0.5)) {
  nodes.push({ id: `${x}|${y}`, x, y, radius: 10, label: `${Math.round(x)}|${Math.round(y)}`, style: NODE_STYLE })

  if (coordinates[x] === undefined) {
    coordinates[x] = new Set()
  }
  coordinates[x].add(y)

  for (const adjacentX of [x - step, x]) {
    for (const adjacentY of [y - step, y, y + step]) {
      if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
        edges.push({ id: `${x}|${y}|${adjacentX}|${adjacentY}`, source: `${x}|${y}`, target: `${adjacentX}|${adjacentY}` })
      }
    }
  }
}

const container = document.querySelector('#graph') as HTMLDivElement

const options: Static.Options = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.025,
  width: 1400,
  height: 1000,
  onViewportPointerEnter: (event: Static.ViewportPointerEvent) => {
    // console.log('pointer enter', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportPointerDown: (event: Static.ViewportPointerEvent) => {
    // console.log('pointer down', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportDragStart: (event: Static.ViewportDragEvent) => {
    // console.log('drag start', `x: ${event.dx}, y: ${event.dy}`)
  },
  onViewportDrag: (event: Static.ViewportDragEvent | Static.ViewportDragDecelerateEvent) => {
    // console.log('drag', `x: ${event.dx}, y: ${event.dy}`)
    options.x! += event.dx
    options.y! += event.dy
    render.update({ options })
  },
  onViewportDragEnd: (event: Static.ViewportDragEvent | Static.ViewportDragDecelerateEvent) => {
    // console.log('drag end', `x: ${event.dx}, y: ${event.dy}`)
  },
  onViewportPointerUp: (event: Static.ViewportPointerEvent) => {
    // console.log('pointer up', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportClick: (event: Static.ViewportPointerEvent) => {
    // console.log('click', `x: ${event.x}, y: ${event.y}`)
    if (options.x === 0 && options.y === 0 && options.zoom === 1) {
      options.x = 1000
      options.y = -1000
      options.zoom = 0.2
    } else {
      options.x = 0
      options.y = 0
      options.zoom = 1
    }
    // if (options.width === 1400 && options.height === 1000) {
    //   options.width = 700
    //   options.height = 500
    // } else {
    //   options.width = 1400
    //   options.height = 1000
    // }
    render.update({ options })
  },
  onViewportDoubleClick: (event: Static.ViewportPointerEvent) => {
    // console.log('double click', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x! += dx
    options.y! += dy
    options.zoom! += dz
    render.update({ options })
  },
  onViewportPointerLeave: (event: Static.ViewportPointerEvent) => {
    // console.log('pointer leave', `x: ${event.x}, y: ${event.y}`)
  },
  // onNodePointerEnter: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer enter', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodePointerDown: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer down', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeDragStart: (event: Static.NodeDragEvent) => {
  //   // console.log('node drag start', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeDrag: (event: Static.NodeDragEvent) => {
  //   // console.log('node drag', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeDragEnd: (event: Static.NodeDragEvent) => {
  //   // console.log('node drag end', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodePointerUp: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer up', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeClick: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer click', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeDoubleClick: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer double click', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodePointerLeave: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer leave', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgePointerEnter: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer enter', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgePointerDown: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer down', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgePointerUp: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer up', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgeClick: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer click', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgeDoubleClick: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer double click', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgePointerLeave: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer leave', `x: ${event.x}, y: ${event.y}`)
  // },
}

const render = new Static.StaticRenderer({ container, nodes, edges, options, debug: true })
;(window as any).render = render
