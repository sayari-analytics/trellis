import * as Renderer from '@trellis/renderers/webgl'
import * as Graph from '@trellis/index'
import * as Collide from '@trellis/layout/collide'

const GREEN = '#91AD49'
const GREEN_LIGHT = '#C6D336'
const DARK_GREEN = '#607330'

const TEXT_ICON: Graph.TextIcon = {
  type: 'textIcon',
  family: 'sans-serif',
  color: '#fff',
  weight: '400',
  text: '!',
  size: 14
}

const NODE_STYLE: Graph.NodeStyle = {
  color: GREEN,
  icon: TEXT_ICON,
  stroke: [{ width: 2, color: GREEN_LIGHT }],
  label: {
    position: 'top',
    fontName: 'NodeLabel',
    fontFamily: ['Arial', 'sans-serif'],
    background: { color: GREEN_LIGHT },
    margin: 4
  }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: DARK_GREEN,
  icon: TEXT_ICON,
  stroke: [{ width: 2, color: GREEN_LIGHT }],
  label: {
    position: 'top',
    fontName: 'NodeLabelHover',
    fontFamily: ['Arial', 'sans-serif'],
    background: { color: GREEN_LIGHT },
    color: DARK_GREEN,
    margin: 4
  }
}

const data = [
  'Myriel',
  'Napoleon',
  'Mlle.Baptistine',
  'Mme.Magloire',
  'CountessdeLo',
  'Geborand',
  'Champtercier',
  'Cravatte',
  'Count',
  'OldMan',
  'Labarre',
  'Valjean'
]

const collide = Collide.Layout()

const edges: Graph.Edge[] = []
let nodes = data.map<Graph.Node>((label, index) => ({
  radius: 10,
  label: index % 2 === 0 ? label + ' 北京' : label,
  id: `${index}-${label}`,
  style: NODE_STYLE
}))

const layout = collide({ nodes, edges, options: { nodePadding: 50 } })
nodes = layout.nodes

const size = { width: 1250, height: 650 }
const bounds = Graph.getSelectionBounds(nodes, 100)
const viewport = Graph.boundsToViewport(bounds, size)
const container = document.querySelector('#graph') as HTMLDivElement

const options: Renderer.Options = {
  ...viewport,
  ...size,
  minZoom: 0.025,
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
    renderer.update({ nodes, edges, options })
  }
}

const renderer = new Renderer.Renderer({ container, width: options.width, height: options.height, debug: true }).update({
  nodes,
  edges,
  options
})
;(window as any).renderer = renderer
