/* eslint-disable prefer-const */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Static from '../../src/renderers/static'
import * as Graph from '../../src'
import * as Force from '../../src/layout/force'
import * as Hierarchy from '../../src/layout/hierarchy'


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

const PURPLE = '#7A5DC5'
const LIGHT_PURPLE = '#CAD'

const NODE_STYLE: Graph.NodeStyle = {
  color: PURPLE, stroke: [{ width: 2, color: LIGHT_PURPLE }], label: { position: 'bottom' }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: '#f66', stroke: [{ width: 2, color: '#fcc' }], label: { position: 'bottom' }
}

const EDGE_STYLE: Graph.EdgeStyle = {
  width: 1, stroke: '#aaa', arrow: 'reverse',
}

const EDGE_HOVER_STYLE: Graph.EdgeStyle = {
  width: 2, stroke: '#f66', arrow: 'reverse',
}

const force = Force.Layout()
const hierarchy = Hierarchy.Layout()
let nodes: Graph.Node[] = []
let edges: Graph.Edge[] = []
const step = 50
const coordinates: Record<number, Set<number>> = {}
for (const [_x, _y] of sampleCoordinatePlane(50000, step, 0.5)) {
  const x = Math.round(_x)
  const y = Math.round(_y)
  nodes.push({ id: `${x}|${y}`, x: _x, y: _y, radius: 10, label: `${x}|${y}`, style: NODE_STYLE })

  if (coordinates[x] === undefined) {
    coordinates[x] = new Set()
  }
  coordinates[x].add(y)

  for (const adjacentX of [x - step, x]) {
    for (const adjacentY of [y - step, y, y + step]) {
      if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
        edges.push({
          id: `${x}|${y}|${adjacentX}|${adjacentY}`, source: `${x}|${y}`, target: `${adjacentX}|${adjacentY}`, style: EDGE_STYLE
        })
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
  width: 1250, // 1700,
  height: 650, // 940,
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
    render.update({ nodes, edges, options })
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
    render.update({ nodes, edges, options })
    // force({ nodes, edges }).then((graph) => {
    //   nodes = graph.nodes
    
    //   const { x, y, zoom } = Graph.boundsToViewport(
    //     Graph.getSelectionBounds(nodes, 40),
    //     { width: options.width, height: options.height }
    //   )
    //   options.x = x
    //   options.y = y
    //   options.zoom = zoom
    
    //   render.update({ nodes, edges, options: options })
    // })
  },
  onViewportDoubleClick: (event: Static.ViewportPointerEvent) => {
    // console.log('double click', `x: ${event.x}, y: ${event.y}`)
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x! += dx
    options.y! += dy
    options.zoom! += dz
    render.update({ nodes, edges, options })
  },
  onViewportPointerLeave: (event: Static.ViewportPointerEvent) => {
    // console.log('pointer leave', `x: ${event.x}, y: ${event.y}`)
  },
  onNodePointerEnter: (event: Static.NodePointerEvent) => {
    // console.log('node pointer enter', `x: ${event.x}, y: ${event.y}, id: ${event.target.id}`)
    nodes = nodes.map((node) => (
      node.id === event.target.id ?
        { ...node, label: node.label + ' 北京', style: NODE_HOVER_STYLE } :
        node
    ))
    edges = edges.map((edge) => (
      edge.source === event.target.id || edge.target === event.target.id ?
        { ...edge, style: EDGE_HOVER_STYLE } :
        edge
    ))
    render.update({ nodes, edges, options })
  },
  // onNodePointerDown: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer down', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeDragStart: (event: Static.NodeDragEvent) => {
  //   // console.log('node drag start', `x: ${event.x}, y: ${event.y}`)
  // },
  onNodeDrag: (event: Static.NodeDragEvent) => {
    // console.log('node drag', `x: ${event.x}, y: ${event.y}`)
    // const t = performance.now()
    nodes = nodes.map((node) => (
      node.id === event.target.id ?
        { ...node, x: (node.x ?? 0) + event.dx, y: (node.y ?? 0) + event.dy } :
        node
    ))
    // console.log(performance.now() - t)
    render.update({ nodes, edges, options })
  },
  // onNodeDragEnd: (event: Static.NodeDragEvent) => {
  //   // console.log('node drag end', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodePointerUp: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer up', `x: ${event.x}, y: ${event.y}`)
  // },
  onNodeClick: (event: Static.NodePointerEvent) => {
    // console.log('node pointer click', `x: ${event.x}, y: ${event.y}`)
    const graph = hierarchy(event.target.id, { nodes, edges, options: { separation: (a, b) => 1, nodeSize: [30, 100] } })
    nodes = graph.nodes.map((node) => ({ ...node, x: node.y, y: node.x }))
    edges = graph.edges
    render.update({ nodes, edges, options })
  },
  // onNodeDoubleClick: (event: Static.NodePointerEvent) => {
  //   // console.log('node pointer double click', `x: ${event.x}, y: ${event.y}`)
  // },
  onNodePointerLeave: (event: Static.NodePointerEvent) => {
    // console.log('node pointer leave', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) => (
      node.id === event.target.id ?
        { ...node, label: node.label?.slice(0, node.label.length - 3), style: NODE_STYLE } :
        node
    ))
    edges = edges.map((edge) => (
      edge.source === event.target.id || edge.target === event.target.id ?
        { ...edge, style: EDGE_STYLE } :
        edge
    ))
    render.update({ nodes, edges, options })
  },
  // onEdgePointerEnter: (event: Static.EdgePointerEvent) => {
  //   // console.log('edge pointer enter', `x: ${event.x}, y: ${event.y}`)
  //   edges = edges.map((edge) => (
  //     edge.id === event.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge
  //   ))
  //   render.update({ nodes, edges, options })
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
  //   edges = edges.map((edge) => ({ ...edge, style: EDGE_STYLE }))
  //   render.update({ nodes, edges, options })
  // },
}

const render = new Static.StaticRenderer({ container, nodes, edges, options, debug: true })
;(window as any).render = render
