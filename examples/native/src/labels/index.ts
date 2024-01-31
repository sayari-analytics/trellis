import * as Graph from '@trellis/index'
import { person } from '../../../assets/icons'

const GREEN = '#91AD49'
const GREEN_LIGHT = '#C6D336'
const DARK_GREEN = '#607330'

const IMAGE_ICON: Graph.ImageIcon = {
  type: 'imageIcon',
  url: person,
  scale: 0.66
}

const TEXT_ICON: Graph.TextIcon = {
  type: 'textIcon',
  fontFamily: 'sans-serif',
  fontWeight: '400',
  fontSize: 14,
  color: '#fff',
  content: '!'
}

const NODE_STYLE: Graph.NodeStyle = {
  color: GREEN,
  icon: IMAGE_ICON,
  stroke: [{ width: 2, color: GREEN_LIGHT }],
  label: {
    anchor: 'bottom',
    fontName: 'NodeLabel',
    fontFamily: 'Roboto',
    margin: 4,
    color: DARK_GREEN
  }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: DARK_GREEN,
  icon: TEXT_ICON,
  stroke: [
    { width: 2, color: GREEN_LIGHT },
    { width: 2, color: DARK_GREEN }
  ],
  label: {
    anchor: 'bottom',
    fontName: 'NodeLabelHover',
    fontFamily: 'Roboto',
    color: GREEN_LIGHT,
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

const collide = Graph.Collide.Layout()

const edges: Graph.Edge[] = [{ id: '0::1', source: '0', target: '1', label: 'EDGE LABEL 0 --> 1!', style: { color: DARK_GREEN, width: 1 } }]

let nodes = data.map<Graph.Node>((label, index) => ({
  radius: 10,
  label: `${label}${index % 2 === 0 ? ' 北京' : ''}`,
  id: `${index}`,
  style: NODE_STYLE
}))

const layout = collide({ nodes, edges, options: { nodePadding: 50 } })
nodes = layout.nodes

const size = { width: 1250, height: 650 }
const bounds = Graph.getSelectionBounds(nodes, 100)
const viewport = Graph.boundsToViewport(bounds, size)
const container = document.querySelector('#graph') as HTMLDivElement

const options: Graph.OptionsV1 = {
  ...viewport,
  ...size,
  minZoom: 0.25,
  onViewportDrag: (event: Graph.ViewportDragEvent | Graph.ViewportDragDecelerateEvent) => {
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
  onNodePointerEnter: (event: Graph.NodePointerEvent) => {
    // console.log('node pointer enter', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, radius: 15, label: node.label + ' 北京', style: NODE_HOVER_STYLE } : node
    )
    renderer.update({ nodes, edges, options })
  },
  onNodeDrag: (event: Graph.NodeDragEvent) => {
    // console.log('node drag', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, x: (node.x ?? 0) + event.dx, y: (node.y ?? 0) + event.dy } : node
    )
    renderer.update({ nodes, edges, options })
  },
  onNodePointerLeave: (event: Graph.NodePointerEvent) => {
    // console.log('node pointer leave', `x: ${event.x}, y: ${event.y}`)
    nodes = nodes.map((node) =>
      node.id === event.target.id ? { ...node, radius: 10, label: node.label?.slice(0, node.label.length - 3), style: NODE_STYLE } : node
    )
    renderer.update({ nodes, edges, options })
  }
}

const renderer = new Graph.Renderer({ container, width: options.width, height: options.height, debug: true }).update({
  nodes,
  edges,
  options
})
;(window as any).renderer = renderer
