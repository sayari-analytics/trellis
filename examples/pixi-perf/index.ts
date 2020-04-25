import Stats from 'stats.js'
import { Layout, Node, Edge, PositionedNode } from '../../src/layout/force'
import { PixiRenderer } from '../../src/renderers/pixi'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


const COMPANY_STYLE = { fill: '#FFAF1D', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
const PERSON_STYLE = { fill: '#7CBBF3', stroke: '#90D7FB', strokeWidth: 4, icon: 'person' }

let nodes: Node[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' },
  { id: 'e', label: 'E' },
  { id: 'f', label: 'F' },
  { id: 'g', label: 'G' },
  { id: 'h', label: 'H' },
  { id: 'i', label: 'I' },
  { id: 'j', label: 'J' },
  { id: 'k', label: 'K' },
  { id: 'l', label: 'L' },
  { id: 'm', label: 'M' },
  { id: 'n', label: 'N' },
  { id: 'o', label: 'O' },
  { id: 'p', label: 'P' },
  { id: 'q', label: 'Q' },
]
  .map<Node>(({ id, label }, idx) => ({
    id,
    label,
    radius: id === 'a' ? 62 : (20 - idx) * 4,
    style: id === 'a' ? COMPANY_STYLE : PERSON_STYLE
  }))

let edges: Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'Related To' },
  { id: 'ca', source: 'a', target: 'c', label: 'Related To' },
  { id: 'da', source: 'a', target: 'd', label: 'Related To' },
  { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
  { id: 'fa', source: 'a', target: 'f', label: 'Related To' },
  { id: 'ga', source: 'a', target: 'g', label: 'Related To' },
  { id: 'ha', source: 'a', target: 'h', label: 'Related To' },
  { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
  { id: 'ja', source: 'a', target: 'j', label: 'Related To' },
  { id: 'ka', source: 'a', target: 'k', label: 'Related To' },
  { id: 'la', source: 'a', target: 'l', label: 'Related To' },
  { id: 'ma', source: 'a', target: 'm', label: 'Related To' },
  { id: 'na', source: 'a', target: 'n', label: 'Related To' },
  { id: 'oa', source: 'a', target: 'o', label: 'Related To' },
  { id: 'pa', source: 'a', target: 'p', label: 'Related To' },
  { id: 'qa', source: 'a', target: 'q', label: 'Related To' },
]

let options = { nodeStrength: -500, }


const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const updatePosition = (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
  nodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
  layout.layout({ nodes, edges, options })
}
const renderer = PixiRenderer({
  container,
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerDown: updatePosition,
  onNodeDrag: updatePosition,
  onNodePointerUp: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    nodes = nodes.map((node) => (node.id === id ? { ...node, x: undefined, y: undefined } : node))
    layout.layout({ nodes, edges, options })
  },
  // onNodePointerEnter: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
  //   nodes = nodes.map((node) => (node.id === id ? { ...node, radius: node.radius * 4, style: { ...node.style, stroke: '#CCC' } } : node))
  //   layout.layout({ nodes, edges, options })
  // },
  // onNodePointerLeave: (_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
  //   nodes = nodes.map((node) => (node.id === id ?
  //     { ...node, radius: node.radius / 4, style: { ...node.style, stroke: id === 'a' ? COMPANY_STYLE.stroke : PERSON_STYLE.stroke } } :
  //     node
  //   ))
  //   layout.layout({ nodes, edges, options })
  // },
  onEdgePointerEnter: (_: PIXI.interaction.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    layout.layout({ nodes, edges, options })
  },
  onEdgePointerLeave: (_: PIXI.interaction.InteractionEvent, { id }: Edge) => {
    edges = edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    layout.layout({ nodes, edges, options })
  },
  onNodeDoubleClick: (_, { id }) => {
    nodes = nodes.map((node) => (node.id === id ? {
      ...node,
      style: { ...node.style, fill: '#efefef', fillOpacity: 0.8, icon: undefined },
      subGraph: {
        nodes: [
          { id: `${node.id}a`, radius: 21, label: `${node.id.toUpperCase()}A`, type: 'company', style: { ...COMPANY_STYLE } },
          { id: `${node.id}b`, radius: 21, label: `${node.id.toUpperCase()}B`, type: 'company', style: { ...COMPANY_STYLE } },
          { id: `${node.id}c`, radius: 21, label: `${node.id.toUpperCase()}C`, type: 'company', style: { ...COMPANY_STYLE } },
        ],
        edges: []
      },
    } : node))
    layout.layout({ nodes, edges, options })
  },
  onContainerPointerUp: () => {
    nodes = nodes.map((node, idx) => (node.subGraph ? {
      ...node,
      style: node.id === 'a' ? COMPANY_STYLE : { ...PERSON_STYLE, width: (20 - idx) * 8 },
      subGraph: undefined,
    } : node))
    layout.layout({ nodes, edges, options })
  },
  debug: { stats, logPerformance: false }
})

const layout = new Layout(({ nodes, edges }) => {
  renderer.layout({ nodes, edges })
})

layout.layout({ nodes, edges, options })

// let i = 1
// setInterval(() => {
//   layout.layout({ nodes: nodes.slice(0, i + 1), edges: edges.slice(0, i), options })
//   i++
// }, 1000)

;(global as any).renderer = renderer
