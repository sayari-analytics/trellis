import data from './data.js'

const trellis = window.trellis
const container = document.querySelector('#graph')

const layout = trellis.layout.Force.Layout()
const render = trellis.renderers.WebGL.Renderer({ container })

layout({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => {
  const { x, y, zoom } = trellis.boundsToViewport(
    trellis.getSelectionBounds(nodes, 40),
    { width: 600, height: 600 }
  )

  const options = {
    x,
    y,
    zoom,
    width: 600,
    height: 600,
  }

  render({ nodes, edges, options })
})