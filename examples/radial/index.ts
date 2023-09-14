import Stats from 'stats.js'
import * as Radial from '../../src/layout/radial'
import * as Graph from '../../src/'
import * as WebGL from '../../src/renderers/webgl'
import graphData from '../../data/tmp-data'

export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

/**
 * Initialize Data
 */
type Node = Graph.Node & { type: string }

const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'

const createCompanyStyle = (radius: number): Graph.NodeStyle => ({
  color: '#FFAF1D',
  stroke: [{ color: '#FFF' }, { color: '#F7CA4D' }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'business',
    color: '#fff',
    size: radius * 1.25
  },
  badge: [
    {
      position: 45,
      color: '#FFAF1D',
      stroke: '#FFF',
      icon: {
        type: 'textIcon',
        family: 'Helvetica',
        size: 12,
        color: '#FFF',
        text: '15'
      }
    },
    {
      position: 135,
      color: '#E4171B',
      stroke: '#FFF',
      icon: {
        type: 'textIcon',
        family: 'Helvetica',
        size: 12,
        color: '#FFF',
        text: '!'
      }
    }
  ]
})

const createPersonStyle = (radius: number): Graph.NodeStyle => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB' }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'person',
    color: '#fff',
    size: radius * 1.25
  },
  badge: [
    {
      position: 45,
      color: '#7CBBF3',
      stroke: '#FFF',
      icon: {
        type: 'textIcon',
        family: 'Helvetica',
        size: 12,
        color: '#FFF',
        text: '8'
      }
    }
  ]
})

let nodes = Object.values(graphData.nodes)
  .map((node, idx) => ({
    ...node,
    label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel : node.label
  }))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
  // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    radius: 32,
    type,
    style: type === 'company' ? createCompanyStyle(32) : createPersonStyle(32)
  }))

let edges = Object.entries<{ field: string; source: string; target: string }>(graphData.edges)
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }]))
  // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }]))
  // .concat([
  //   ['connect_2', { field: 'related_to', source: Object.values(graphData.nodes)[77].id, target: `${Object.values(graphData.nodes)[0].id}_2` }],
  //   ['connect_3', { field: 'related_to', source: `${Object.values(graphData.nodes)[50].id}_2`, target: `${Object.values(graphData.nodes)[0].id}_3` }],
  // ])
  .map<Graph.Edge>(([id, { field, source, target }]) => ({
    id,
    source,
    target,
    label: field.replace(/_/g, ' '),
    style: { arrow: 'forward' }
  }))

// let nodes = [
//   { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
//   { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
//   { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
// ]
//   .map<Node>(({ id, label }) => ({
//     id,
//     label,
//     radius: 48,
//     type: id === 'a' ? 'company' : 'person',
//     style: id === 'a' ? createCompanyStyle(48) : createPersonStyle(48)
//   }))

// let edges: Graph.Edge[] = [
//   { id: 'ba', source: 'a', target: 'b', label: 'None' }, { id: 'ca', source: 'a', target: 'c', label: 'None' }, { id: 'da', source: 'a', target: 'd', label: 'None' },
//   { id: 'ea', source: 'a', target: 'e', label: 'A to E', style: { arrow: 'forward' } }, { id: 'fa', source: 'a', target: 'f', label: 'A to F', style: { arrow: 'forward' } },
//   { id: 'ga', source: 'a', target: 'g', label: 'A to G', style: { arrow: 'forward' } }, { id: 'ha', source: 'a', target: 'h', label: 'A to H', style: { arrow: 'forward' } },
//   { id: 'ia', source: 'a', target: 'i', label: 'A to I', style: { arrow: 'forward' } }, { id: 'ja', source: 'b', target: 'j', label: 'B to J', style: { arrow: 'forward' } },
//   { id: 'ka', source: 'b', target: 'k', label: 'K to B', style: { arrow: 'reverse' } }, { id: 'la', source: 'b', target: 'l', label: 'L to B', style: { arrow: 'reverse' } },
//   { id: 'ma', source: 'l', target: 'm', label: 'M to L', style: { arrow: 'reverse' } }, { id: 'na', source: 'c', target: 'n', label: 'N to C', style: { arrow: 'reverse' } },
//   { id: 'oa', source: 'c', target: 'o', label: 'Both', style: { arrow: 'both' } }, { id: 'pa', source: 'c', target: 'p', label: 'Both', style: { arrow: 'both' } },
//   { id: 'qa', source: 'c', target: 'q', label: 'Both', style: { arrow: 'both' } },
// ]

/**
 * Initialize Layout and Renderer Options
 */
const container = document.querySelector('#graph') as HTMLDivElement

const layoutOptions: Radial.Options = {
  radius: 1200
}

const renderOptions: WebGL.Options<Node, Graph.Edge> = {
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodeDrag: ({ nodeX: x, nodeY: y, target: { id } }) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerEnter: ({ target: { id } }) => {
    nodes = nodes.map((node) =>
      node.id === id
        ? {
            ...node,
            style: {
              ...node.style,
              stroke: node.type === 'company' ? [{ color: '#FFF' }, { color: '#CCC' }] : [{ color: '#CCC' }]
            }
          }
        : node
    )
    render({ nodes, edges, options: renderOptions })
  },
  onNodePointerLeave: ({ target: { id } }) => {
    nodes = nodes.map((node) =>
      node.id === id
        ? {
            ...node,
            style: node.type === 'company' ? createCompanyStyle(32) : createPersonStyle(32)
          }
        : node
    )
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerEnter: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    render({ nodes, edges, options: renderOptions })
  },
  onEdgePointerLeave: ({ target: { id } }) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    render({ nodes, edges, options: renderOptions })
  }
}

/**
 * Initialize Layout and Renderer
 */
const radial = Radial.Layout()
const render = WebGL.Renderer({
  container,
  debug: { stats, logPerformance: false }
})

/**
 * Layout and Render Graph
 */
const positionedGraph = radial(nodes[0].id, { nodes, edges, options: layoutOptions })
nodes = positionedGraph.nodes
edges = positionedGraph.edges
render({ nodes, edges, options: renderOptions })
