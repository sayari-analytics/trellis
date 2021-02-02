const Force = require('../../src/layout/force')
const WebGL = require('../../src/renderers/webgl')
const Graph = require('../../src/')
const data = require('./data')


const container = document.querySelector('#graph')
const render = WebGL.Renderer({ container })
const layout = Force.Layout()

layout({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => {
  const { x, y, zoom } = Graph.boundsToViewport(
    Graph.getSelectionBounds(nodes, 40),
    { width: width, height: 600 }
  )

  const options = {
    x,
    y,
    zoom,
    width: width,
    height: 600,
  }

  render({ nodes, edges, options })
})