/* eslint-disable prefer-const */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Renderer from '../../src/renderers/webgl'
import * as Graph from '../../src'
import * as Force from '../../src/layout/force'
import * as Hierarchy from '../../src/layout/hierarchy'

// try { document.createElement('canvas').getContext('webgl'); console.info('browser supports webgl') } catch (err) { console.warn(err) }

const sampleCoordinatePlane = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample) * step
  let i = 0

  for (let x = -(side / 2); x < side / 2; x += step) {
    for (let y = -(side / 2); y < side / 2; y += step) {
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
  color: PURPLE,
  stroke: [{ width: 2, color: LIGHT_PURPLE }],
  label: { position: 'bottom' }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: '#f66',
  stroke: [{ width: 2, color: '#fcc' }],
  label: { position: 'bottom' }
}

const EDGE_STYLE: Graph.EdgeStyle = {
  width: 1,
  stroke: '#aaa',
  arrow: 'reverse'
}

const EDGE_HOVER_STYLE: Graph.EdgeStyle = {
  width: 2,
  stroke: '#f66',
  arrow: 'reverse'
}

const force = Force.Layout()
const hierarchy = Hierarchy.Layout()
let nodes: Graph.Node[] = []
let edges: Graph.Edge[] = []
const step = 50
const coordinates: Record<number, Set<number>> = {}
for (const [_x, _y] of sampleCoordinatePlane(1000, step, 0.5)) {
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
          id: `${x}|${y}|${adjacentX}|${adjacentY}`,
          source: `${x}|${y}`,
          target: `${adjacentX}|${adjacentY}`,
          style: EDGE_STYLE
        })
      }
    }
  }
}

const container = document.querySelector('#graph') as HTMLDivElement

const options: Renderer.Options = {
  x: 0,
  y: 0,
  zoom: 0.5,
  minZoom: 0.025,
  width: 1250, // 1700,
  height: 650, // 940,
  // onViewportPointerEnter: (event: Renderer.ViewportPointerEvent) => {
  //   console.log('viewport pointer enter', `x: ${event.x}, y: ${event.y}`)
  // },
  // onViewportPointerDown: (event: Renderer.ViewportPointerEvent) => {
  //   console.log('viewport pointer down', `x: ${event.x}, y: ${event.y}`)
  // },
  // onViewportDragStart: (event: Renderer.ViewportDragEvent) => {
  //   console.log('viewport drag start', `x: ${event.dx}, y: ${event.dy}`)
  // },
  onViewportDrag: (event: Renderer.ViewportDragEvent | Renderer.ViewportDragDecelerateEvent) => {
    console.log('viewport drag', `x: ${event.dx}, y: ${event.dy}`)
    options.x! += event.dx
    options.y! += event.dy
    renderer.update({ nodes, edges, options })
  },
  // onViewportDragEnd: (event: Renderer.ViewportDragEvent | Renderer.ViewportDragDecelerateEvent) => {
  //   console.log('viewport drag end', `x: ${event.dx}, y: ${event.dy}`)
  // },
  // onViewportPointerUp: (event: Renderer.ViewportPointerEvent) => {
  //   console.log('viewport pointer up', `x: ${event.x}, y: ${event.y}`)
  // },
  onViewportClick: (event: Renderer.ViewportPointerEvent) => {
    console.log('viewport click', `x: ${event.x}, y: ${event.y}`)
    // if (options.x === 0 && options.y === 0 && options.zoom === 1) {
    //   options.x = 1000
    //   options.y = -1000
    //   options.zoom = 0.2
    // } else {
    //   options.x = 0
    //   options.y = 0
    //   options.zoom = 1
    // }
    // renderer.update({ nodes, edges, options })

    // if (options.width === 1400 && options.height === 1000) {
    //   options.width = 700
    //   options.height = 500
    // } else {
    //   options.width = 1400
    //   options.height = 1000
    // }
    // renderer.update({ nodes, edges, options })

    // force({ nodes, edges }).then((graph) => {
    //   nodes = graph.nodes

    //   const { x, y, zoom } = Graph.boundsToViewport(
    //     Graph.getSelectionBounds(nodes, 40),
    //     { width: options.width, height: options.height }
    //   )
    //   options.x = x
    //   options.y = y
    //   options.zoom = zoom

    //   renderer.update({ nodes, edges, options: options })
    // })
  },
  // onViewportDoubleClick: (event: Renderer.ViewportPointerEvent) => {
  //   console.log('viewport double click', `x: ${event.x}, y: ${event.y}`)
  // },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x! += dx
    options.y! += dy
    options.zoom! += dz
    renderer.update({ nodes, edges, options })
  },
  // onViewportPointerLeave: (event: Renderer.ViewportPointerEvent) => {
  //   console.log('viewport pointer leave', `x: ${event.x}, y: ${event.y}`)
  // },
  onNodePointerEnter: (event: Renderer.NodePointerEvent) => {
    console.log('node pointer enter', `x: ${event.x}, y: ${event.y}, id: ${event.target.id}`)
    nodes = nodes.map((node) => (node.id === event.target.id ? { ...node, label: node.label + ' 北京', style: NODE_HOVER_STYLE } : node))
    edges = edges.map((edge) =>
      edge.source === event.target.id || edge.target === event.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge
    )
    renderer.update({ nodes, edges, options })
  },
  // onNodePointerDown: (event: Renderer.NodePointerEvent) => {
  //   console.log('node pointer down', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeDragStart: (event: Renderer.NodeDragEvent) => {
  //   console.log('node drag start', `x: ${event.x}, y: ${event.y}`)
  // },
  onNodeDrag: (event: Renderer.NodeDragEvent) => {
    console.log('node drag', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, x: (node.x ?? 0) + event.dx, y: (node.y ?? 0) + event.dy } : node
    )
    renderer.update({ nodes, edges, options })
  },
  // onNodeDragEnd: (event: Renderer.NodeDragEvent) => {
  //   console.log('node drag end', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodePointerUp: (event: Renderer.NodePointerEvent) => {
  //   console.log('node pointer up', `x: ${event.x}, y: ${event.y}`)
  // },
  // onNodeClick: (event: Renderer.NodePointerEvent) => {
  //   console.log('node pointer click', `x: ${event.x}, y: ${event.y}`)
  //   // const graph = hierarchy(event.target.id, { nodes, edges, options: { separation: (a, b) => 1, nodeSize: [30, 100] } })
  //   // nodes = graph.nodes.map((node) => ({ ...node, x: node.y, y: node.x }))
  //   // edges = graph.edges
  //   // renderer.update({ nodes, edges, options })
  // },
  // onNodeDoubleClick: (event: Renderer.NodePointerEvent) => {
  //   console.log('node pointer double click', `x: ${event.x}, y: ${event.y}`)
  // },
  onNodePointerLeave: (event: Renderer.NodePointerEvent) => {
    console.log('node pointer leave', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, label: node.label?.slice(0, node.label.length - 3), style: NODE_STYLE } : node
    )
    edges = edges.map((edge) =>
      edge.source === event.target.id || edge.target === event.target.id ? { ...edge, style: EDGE_STYLE } : edge
    )
    renderer.update({ nodes, edges, options })
  },
  onEdgePointerEnter: (event: Renderer.EdgePointerEvent) => {
    console.log('edge pointer enter', `x: ${event.x}, y: ${event.y}`)
    edges = edges.map((edge) => (edge.id === event.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge))
    renderer.update({ nodes, edges, options })
  },
  // onEdgePointerDown: (event: Renderer.EdgePointerEvent) => {
  //   console.log('edge pointer down', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgePointerUp: (event: Renderer.EdgePointerEvent) => {
  //   console.log('edge pointer up', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgeClick: (event: Renderer.EdgePointerEvent) => {
  //   console.log('edge pointer click', `x: ${event.x}, y: ${event.y}`)
  // },
  // onEdgeDoubleClick: (event: Renderer.EdgePointerEvent) => {
  //   console.log('edge pointer double click', `x: ${event.x}, y: ${event.y}`)
  // },
  onEdgePointerLeave: (event: Renderer.EdgePointerEvent) => {
    console.log('edge pointer leave', `x: ${event.x}, y: ${event.y}`)
    edges = edges.map((edge) => ({ ...edge, style: EDGE_STYLE }))
    renderer.update({ nodes, edges, options })
  }
}

const renderer = new Renderer.Renderer({ container, width: options.width, height: options.height, debug: true }).update({
  nodes,
  edges,
  options
})
;(window as any).renderer = renderer
