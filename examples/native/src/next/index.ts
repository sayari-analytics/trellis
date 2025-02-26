import { Renderer } from '@trellis/renderers/webgl-next'
import * as Graph from '@trellis/index'
import {
  EdgePointerEvent,
  EventOptions,
  NodeDragEvent,
  NodePointerEvent,
  ViewportDragDecelerateEvent,
  ViewportDragEvent
} from '@trellis/renderers/webgl-next/components/eventsComponent'
import { ViewportOptions } from '@trellis/renderers/webgl-next/components/viewportComponent'

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

// const TEXT_ICON: Graph.TextIcon = {
//   type: 'textIcon',
//   content: '⚠', // 'T',
//   style: {
//     fontSize: 14,
//     color: '#fff',
//     fontWeight: '400'
//   }
// }

// const DATA_URI_IMAGE_ICON: Graph.ImageIcon = {
//   type: 'imageIcon',
//   url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAAAXNSR0IArs4c6QAAA1BJREFUeF7tm2tugzAQhPHJ2pyszcmansyNEVSIQuVkx54hTP5EifyA+byz2Nhp8IeqQKL27s4HAyAPAgMwALIC5O4dAQZAVoDcvSPAAMgKkLt3BBgAWQFy944AAyArQO7eEWAAZAXI3TsCDKBegZzz+zAMH4sa5Xf53Kbv7/KdUvqsb5VbUj4CFqLPYtcqdj0CCGkAOecykpcjvlb8ZTlpELIAcs5fd2t5dNTvAbqllC7P0GtdRw5AwHJqtLqklOZ8UVO+eRlFALnhXctFghQAsO0cwo5kAIASbm3wyCRmJQAtrWcLjEQ+kADQefTPMCTygQqA3qN/hJDuM7Vaz2pVjn4BpNE/60m3obMDoNuQAgDkjPdRpzCATs/+snMChQigJOCZCDsRGwD5SUgBgHPAo5kLWd45AKnmE22RAdDXhBQsqLx0KTbE+BhAUT3fp8MM9dlPQONyCOPG132SbIg++pUAdLchhdEvA2CyIcQOiNqAlhj9UgAmCD3mBPT1n+UokcgBywtqnQ9UrOd3KaQ2ZnuVm7altHgsLdtRivV4W0oNTHAkSNmOtAWt7AiRmGUS7tbAk8sBWxf55GtLSctZ398hAMwXPYEoP9+m/9bb08vfcj7/n+UeCkBN7jhaGQMgEzMAAyArQO5eOgKmSVmRaOuUzPrwxnqCNZ4XK+fH1CZfkvOASewiannCQZ2MWY/vAknqIB81Ahqfhqkxl+u4Ikk8VdkdgIDoe2DG6OgNowsAYdH3YHRbvmgK4IDCr4E0t6gmAF5A+K3k3WSJAw7gyYWzmoSpUAZuTVAALy7+PACgEGAATiI+HAIEQMPXiAq2s3cNkONNKACIN1fKYm9dG+Q1JwoAZWuhALFwFIQBnMz7/8wTojNnBIAem6kEBvvmJYRtyABiaCUAnNX/R3TRnXaICDCAQBQZQEA8R0BQPER1WxBCxUAbBhAQD1HVABAqBtowgIB4iKoGgFAx0IYBBMRDVDUAhIqBNgwgIB6iKh0A4ibO3EZ4KeLM4iHu3QAQKgbaMICAeIiqBoBQMdCGAQTEQ1Q1AISKgTYMICAeoqoBIFQMtGEAAfEQVQ0AoWKgDQMIiIeoagAIFQNtGEBAPERVA0CoGGjDAALiIar+AERVI3Co9qc3AAAAAElFTkSuQmCC',
//   offset: { x: 0, y: 0 }
// }

const IMAGE_ICON: Graph.ImageIcon = {
  type: 'imageIcon',
  url: '/assets/company.png',
  offset: { x: 0, y: 0 }
}

const NODE_STYLE: Graph.NodeStyle = {
  color: PURPLE,
  stroke: [{ width: 2, color: LIGHT_PURPLE }],
  icon: IMAGE_ICON,
  label: {
    position: 'bottom',
    stroke: { color: '#fff', width: 1 }
  }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: '#f66',
  stroke: [{ width: 2, color: '#fcc' }],
  label: {
    position: 'bottom',
    color: '#fcc',
    stroke: { color: '#fff', width: 1 }
  },
  icon: IMAGE_ICON
}

const EDGE_STYLE: Graph.EdgeStyle = {
  width: 1,
  stroke: '#aaa',
  arrow: 'forward'
}

const EDGE_HOVER_STYLE: Graph.EdgeStyle = {
  width: 2,
  stroke: '#f66',
  arrow: 'forward'
}

// const force = Force.Layout()
// const hierarchy = Hierarchy.Layout()
let nodes: Graph.Node[] = []
let edges: Graph.Edge[] = []
const step = 50
const coordinates: Record<number, Set<number>> = {}
for (const [_x, _y] of sampleCoordinatePlane(20000, step, 0.5)) {
  const x = Math.round(_x)
  const y = Math.round(_y)
  nodes.push({ id: `${x}|${y}`, x: _x, y: _y, label: `${x}|${y}`, radius: 12, style: NODE_STYLE })

  if (coordinates[x] === undefined) {
    coordinates[x] = new Set()
  }
  coordinates[x].add(y)

  for (const adjacentX of [x - step, x]) {
    for (const adjacentY of [y - step, y, y + step]) {
      if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
        edges.push({
          source: `${x}|${y}`,
          target: `${adjacentX}|${adjacentY}`,
          style: EDGE_STYLE
        })
      }
    }
  }
}

const container = document.querySelector('#graph') as HTMLDivElement

const viewport: ViewportOptions = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.025,
  maxZoom: 3,
  width: 1700,
  height: 940
}

const events: EventOptions = {
  onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
    // console.log('viewport drag', `x: ${event.dx}, y: ${event.dy}`)
    viewport.x! += event.dx
    viewport.y! += event.dy
    renderer.update({ nodes, edges, viewport, events })
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    // console.log('viewport wheel', `x: ${dx}, y: ${dy}`)
    viewport.x! += dx
    viewport.y! += dy
    viewport.zoom! += dz
    renderer.update({ nodes, edges, viewport, events })
  },
  onNodePointerEnter: (event: NodePointerEvent) => {
    // console.log('node pointer enter', `id ${event.target.id}, x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) => (node.id === event.target.id ? { ...node, label: node.label + ' 北京', style: NODE_HOVER_STYLE } : node))
    edges = edges.map((edge) =>
      edge.source === event.target.id || edge.target === event.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge
    )
    renderer.update({ nodes, edges, viewport, events })
  },
  onNodeDrag: (event: NodeDragEvent) => {
    // console.log('node drag', `id ${event.target.id}, x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, x: (node.x ?? 0) + event.dx, y: (node.y ?? 0) + event.dy } : node
    )
    renderer.update({ nodes, edges, viewport, events })
  },
  onNodePointerLeave: (event: NodePointerEvent) => {
    // console.log('node pointer leave', `id ${event.target.id}, x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node === event.target ? { ...node, label: node.label?.slice(0, node.label.length - 3), style: NODE_STYLE } : node
    )
    edges = edges.map((edge) =>
      edge.source === event.target.id || edge.target === event.target.id ? { ...edge, style: EDGE_STYLE } : edge
    )
    renderer.update({ nodes, edges, viewport, events })
  },
  onEdgePointerEnter: (event: EdgePointerEvent) => {
    // console.log('edge pointer enter', `x: ${event.x}, y: ${event.y}`)
    edges = edges.map((edge) => (edge === event.target ? { ...edge, style: EDGE_HOVER_STYLE } : edge))
    renderer.update({ nodes, edges, viewport, events })
  },
  onEdgePointerLeave: (event: EdgePointerEvent) => {
    // console.log('edge pointer leave', `x: ${event.x}, y: ${event.y}`)
    edges = edges.map((edge) => (edge === event.target ? { ...edge, style: EDGE_STYLE } : edge))
    renderer.update({ nodes, edges, viewport, events })
  }
}

const renderer = new Renderer({
  container,
  width: viewport.width,
  height: viewport.height,
  maxZoom: viewport.maxZoom,
  // renderer: { type: 'webgl' }, // { type: 'webgpu' },
  debug: { stats: true, grid: false }
}).update({
  nodes,
  edges,
  viewport,
  events
})

;(window as any).renderer = renderer
