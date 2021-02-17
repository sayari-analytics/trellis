import Stats from 'stats.js'
import * as Hierarchy from '../../src/layout/hierarchy'
import * as Components from '../../src/layout/components'
import * as WebGL from '../../src/renderers/webgl'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


const A_STYLE = { color: '#FFAF1D', stroke: [{ color: '#F7CA4D' }] }

const B_STYLE = { color: '#7CBBF3', stroke: [{ color: '#90D7FB' }] }

const C_STYLE = { color: '#7F5BCC', stroke: [{ color: '#9F7BEC' }] }

const D_STYLE = { color: '#C6D336', stroke: [{ color: '#E6F356' }] }


/**
 * Initialize Layout and Renderer
 */
const container = document.querySelector('#graph') as HTMLDivElement
const hierarchy = Hierarchy.Layout()
const components = Components.Layout()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})


/**
 * Layout and Render Graph
 */
const { nodes, edges } = ['a', 'b', 'd'].reduce(
  (graph, root) => hierarchy(root, graph),
  {
    nodes: [
      { id: 'a', radius: 18, style: A_STYLE, x: 40, y: 20 },
      { id: 'aa', radius: 18, style: A_STYLE, x: 40, y: 20 },
      { id: 'ab', radius: 18, style: A_STYLE, x: 40, y: 20 },
      { id: 'aba', radius: 18, style: A_STYLE, x: 40, y: 20 },
      { id: 'b', radius: 18, style: B_STYLE, x: -40, y: -20 },
      { id: 'ba', radius: 18, style: B_STYLE, x: -40, y: -20 },
      { id: 'bb', radius: 18, style: B_STYLE, x: -40, y: -20 },
      { id: 'c', radius: 18, style: C_STYLE, x: -160, y: -20 },
      { id: 'd', radius: 18, style: D_STYLE, x: 260, y: -200 },
      { id: 'da', radius: 18, style: D_STYLE, x: 260, y: -200 },
    ],
    edges: [
      { id: 'a-aa', source: 'a', target: 'aa' },
      { id: 'a-ab', source: 'a', target: 'ab' },
      { id: 'a-ab2', source: 'a', target: 'ab' },
      { id: 'ab-aba', source: 'ab', target: 'aba' },
      { id: 'b-ba', source: 'b', target: 'ba' },
      { id: 'b-bb', source: 'b', target: 'bb' },
      { id: 'd-da', source: 'd', target: 'da' },
    ],
  }
)


const boundingCircles = components({ nodes, edges })
console.log(boundingCircles)
console.log({ nodes, edges })


render({
  nodes: [...boundingCircles.map(({ x, y, r }, idx) => ({ id: `${idx}`, x, y, radius: r, style: { color: '#FFF', stroke: [{ color: '#AAA', width: 1 }] } })), ...nodes],
  // nodes,
  edges,
  options: {
    width: container.offsetWidth,
    height: container.offsetHeight,
    x: 0,
    y: 0,
    zoom: 1,
  }
})
