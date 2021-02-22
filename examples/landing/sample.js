import * as Force from '@sayari/trellis/layout/force'
import * as WebGL from '@sayari/trellis/renderers/webgl'

/* Initialize Data */
const NODE_STYLE = { color: '#999', stroke: [{ color: '#FFF', width: 2 }, { color: '#F7CA4D', width: 2 }] }
const EDGE_STYLE = { arrow: 'forward', width: 2, stroke: '#CCC' }
let nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, radius: 18, style: NODE_STYLE }))
let edges = [['a', 'b'], ['a', 'c'], ['a', 'd'], ['c', 'e'], ['c', 'f']]
  .map(([source, target]) => ({ id: `${source}_${target}`, source, target, style: EDGE_STYLE }))

/* Create Renderer and Layout */
const container = document.querySelector('#graph')
const render = WebGL.Renderer({ container })
const force = Force.Layout()

/* Create renderer properties and handlers */
const renderOptions = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerEnter: ({ target: { id } }) => {
    nodes.find((node) => node.id === id).style.stroke[1].width = 4
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes.find((node) => node.id === id).style.stroke[1].width = 2
    render({ nodes, edges, options: renderOptions })
  },
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    const node = nodes.find((node) => node.id === id)
    node.x = x
    node.y = y
    render({ nodes, edges, options: renderOptions })
  },
  onViewportDrag: ({ viewportX, viewportY }) => {
    renderOptions.x = viewportX
    renderOptions.y = viewportY
    render({ nodes, edges, options: renderOptions })
  },
}

/* Run layout and render graph */
force({ nodes, edges }).then((graph) => {
  nodes = graph.nodes
  render({ nodes, edges, options: renderOptions })
})
