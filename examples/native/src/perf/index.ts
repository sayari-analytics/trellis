import * as Renderer from '@trellis/renderers/webgl'
import * as Graph from '@trellis/index'

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
const ARIAL_PINK = 'ArialPink'

const NODE_STYLE: Graph.NodeStyle = {
  color: PURPLE,
  stroke: [{ width: 2, color: LIGHT_PURPLE }],
  icon: { type: 'textIcon', text: 'T', family: 'sans-serif', size: 14, color: '#fff', weight: '400' },
  label: {
    position: 'top',
    fontName: ARIAL_PINK,
    fontFamily: ['Arial', 'sans-serif'],
    margin: 2,
    background: {
      color: '#f66',
      opacity: 0.5
    }
  }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: '#f66',
  stroke: [{ width: 2, color: '#fcc' }],
  label: { position: 'bottom', color: '#fcc' },
  icon: { type: 'textIcon', text: 'L', family: 'sans-serif', size: 14, color: '#fff', weight: '400' }
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

// const force = Force.Layout()
// const hierarchy = Hierarchy.Layout()
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
  zoom: 1,
  minZoom: 0.025,
  width: 1250, // 1700,
  height: 650, // 940,
  onViewportDrag: (event: Renderer.ViewportDragEvent | Renderer.ViewportDragDecelerateEvent) => {
    // console.log('viewport drag', `x: ${event.dx}, y: ${event.dy}`)
    options.x! += event.dx
    options.y! += event.dy
    renderer.update({ nodes, edges, options })
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x! += dx
    options.y! += dy
    options.zoom! += dz
    renderer.update({ nodes, edges, options })
  },
  onNodePointerEnter: (event: Renderer.NodePointerEvent) => {
    // console.log('node pointer enter', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) => (node.id === event.target.id ? { ...node, label: node.label + ' 北京', style: NODE_HOVER_STYLE } : node))
    edges = edges.map((edge) =>
      edge.source === event.target.id || edge.target === event.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge
    )
    renderer.update({ nodes, edges, options })
  },
  onNodeDrag: (event: Renderer.NodeDragEvent) => {
    // console.log('node drag', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, x: (node.x ?? 0) + event.dx, y: (node.y ?? 0) + event.dy } : node
    )
    renderer.update({ nodes, edges, options })
  },
  onNodePointerLeave: (event: Renderer.NodePointerEvent) => {
    // console.log('node pointer leave', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, label: node.label?.slice(0, node.label.length - 3), style: NODE_STYLE } : node
    )
    edges = edges.map((edge) =>
      edge.source === event.target.id || edge.target === event.target.id ? { ...edge, style: EDGE_STYLE } : edge
    )
    renderer.update({ nodes, edges, options })
  },
  onEdgePointerEnter: (event: Renderer.EdgePointerEvent) => {
    // console.log('edge pointer enter', `x: ${event.x}, y: ${event.y}`)
    edges = edges.map((edge) => (edge.id === event.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge))
    renderer.update({ nodes, edges, options })
  },
  onEdgePointerLeave: (event: Renderer.EdgePointerEvent) => {
    // console.log('edge pointer leave', `x: ${event.x}, y: ${event.y}`)
    edges = edges.map((edge) => (edge.id === event.target.id ? { ...edge, style: EDGE_STYLE } : edge))
    renderer.update({ nodes, edges, options })
  }
}

const renderer = new Renderer.Renderer({ container, width: options.width, height: options.height, debug: true }).update({
  nodes,
  edges,
  options
})
;(window as any).renderer = renderer
