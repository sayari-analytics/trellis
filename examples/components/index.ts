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
// TODO: remove the commented out code before merging
const graph = ['a', 'b', 'd'].reduce(
  (graph, root) => hierarchy(root, graph),
  {
    nodes: [
      { id: 'a', label: 'a', radius: 18, style: A_STYLE },
      { id: 'aa', label: 'aa', radius: 18, style: A_STYLE },
      { id: 'ab', label: 'ab', radius: 18, style: A_STYLE },
      { id: 'aba', label: 'aba', radius: 18, style: A_STYLE },
      { id: 'b', label: 'b', radius: 18, style: B_STYLE },
      { id: 'ba', label: 'ba', radius: 18, style: B_STYLE },
      { id: 'bb', label: 'bb', radius: 18, style: B_STYLE },
      { id: 'c', label: 'c', radius: 18, style: C_STYLE },
      { id: 'd', label: 'd', radius: 18, style: D_STYLE, /*fx: 0, fy: 100*/ },
      { id: 'da', label: 'da', radius: 18, style: D_STYLE, /*fx: 0, fy: 0*/ },
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


const { nodes, edges } = components(graph)


render({
  nodes,
  edges,
  options: {
    width: container.offsetWidth,
    height: container.offsetHeight,
    x: 0,
    y: 0,
    zoom: 1,
    //onNodeClick: ({ target: node }) => { console.log(node) }
  },
})
