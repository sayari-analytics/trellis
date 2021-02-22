import * as Force from '../../src/layout/force'
import * as WebGL from '../../src/renderers/webgl'

/* Initialize Data */
const NODE_STYLE = {
  color: '#999',
  stroke: [{ color: '#FFF', width: 2 }, { color: '#F7CA4D', width: 2 }],
}
const EDGE_STYLE = { arrow: 'forward' }
let nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, radius: 18, style: NODE_STYLE }))
let edges = [
  { id: 'ba', source: 'a', target: 'b' }, { id: 'ca', source: 'a', target: 'c' }, { id: 'da', source: 'a', target: 'd' },
  { id: 'ce', source: 'c', target: 'e' }, { id: 'cf', source: 'c', target: 'f' }
].map(({ id, source, target }) => ({ id, source, target, style: EDGE_STYLE }))

/* Create Renderer and Layout */
const container = document.querySelector('#graph')
const render = WebGL.Renderer({ container })
const force = Force.Layout()

/* Create renderer properties and handlers */
const renderOptions = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerEnter: ({ target: { id } }) => {
    nodes.forEach((node) => {
      if (node.id === id) node.style.stroke[1].width = 4
    })

    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes.forEach((node) => {
      if (node.id === id) node.style.stroke[1].width = 2
    })

    render({ nodes, edges, options: renderOptions })
  },
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodes.forEach((node) => {
      if (node.id === id) {
        node.x = x
        node.y = y
      }
    })
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
