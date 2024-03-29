import * as Renderer from '@trellis/renderers/webgl'
import * as Graph from '@trellis/index'
import * as Collide from '@trellis/layout/collide'
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
  content: '!',
  style: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff'
  }
}

const NODE_STYLE: Graph.NodeStyle = {
  color: GREEN,
  icon: TEXT_ICON,
  stroke: [{ width: 2, color: GREEN_LIGHT }],
  label: {
    position: 'bottom',
    fontName: 'NodeLabel',
    fontFamily: 'Roboto',
    highlight: { color: GREEN_LIGHT },
    margin: 4
  }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: DARK_GREEN,
  icon: IMAGE_ICON,
  stroke: [{ width: 2, color: GREEN_LIGHT }],
  label: {
    position: 'bottom',
    fontName: 'NodeLabelHover',
    fontFamily: 'Roboto',
    highlight: { color: DARK_GREEN },
    color: '#FFF',
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

const edges: Graph.Edge[] = [
  {
    id: '0::1',
    source: '0',
    target: '1',
    label: '0 <- EDGE LABEL -> 1',
    style: {
      arrow: 'both',
      label: {
        fontName: 'EdgeLabel',
        fontFamily: 'Roboto',
        fontSize: 10,
        color: DARK_GREEN,
        margin: 4
      }
    }
  }
]

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
