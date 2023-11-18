import * as WebGL from './renderers/webgl'
import * as Graph from '../../../src'
import raw from './data'

const NODE_STYLE_A: Graph.NodeStyle = {
  color: '#0A85FF',
  stroke: [{ color: '#9CF', width: 3 }],
  icon: { type: 'textIcon', family: 'Material Icons', text: 'person', color: '#fff', size: 24 },
  labelSize: 10,
  labelColor: '#666'
}

const NODE_STYLE_B: Graph.NodeStyle = {
  color: '#FFB71B',
  stroke: [{ color: '#FEA', width: 3 }],
  icon: { type: 'textIcon', family: 'Material Icons', text: 'business', color: '#fff', size: 24 },
  labelSize: 10,
  labelColor: '#666'
}

const EDGE_STYLE: Graph.EdgeStyle = {
  stroke: '#BBB',
  width: 1,
  arrow: 'forward',
  labelSize: 10,
  labelColor: '#666'
}

const container = document.querySelector('#graph') as HTMLDivElement
const render = WebGL.Renderer({ container })
const layouts = raw.map(({ roots, nodes, edges }) => {
  return {
    roots,
    nodes: nodes.map(([id, x, y], idx) => ({
      id: `${id}`,
      x,
      y,
      radius: 18,
      label: `${idx % 4 === 0 ? 'person' : 'company'} ${id}`,
      style: idx % 4 === 0 ? NODE_STYLE_A : NODE_STYLE_B
    })),
    edges: edges.map(([id, source, target]) => ({
      id: id as string,
      source: `${source}`,
      target: `${target}`,
      label: 'linked to',
      style: EDGE_STYLE
    }))
  }
})

const draw = (idx: number, animate: boolean) => {
  const nodes = layouts[idx].nodes
  const edges = layouts[idx].edges
  const width = container.offsetWidth
  const height = container.offsetHeight

  const { x, y, zoom } = Graph.boundsToViewport(Graph.getSelectionBounds(nodes, 80), { width, height })

  render({
    nodes,
    edges,
    options: {
      width,
      height,
      x,
      y,
      zoom,
      animateNodePosition: !!animate,
      animateViewportPosition: true,
      animateViewportZoom: true
    }
  })
}

let i = 0

draw(0, false)

setInterval(() => {
  i = (i + 1) % layouts.length
  draw(i, true)
}, 3000)
