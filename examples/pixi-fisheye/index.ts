import Stats from 'stats.js'
import { Node, Edge, Graph } from '../../src/index'
import { PixiRenderer } from '../../src/renderers/pixi'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


const COMPANY_STYLE = { width: 62, fill: '#FFAF1D', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
const PERSON_STYLE = { width: 62, fill: '#7CBBF3', stroke: '#90D7FB', strokeWidth: 4, icon: 'person' }

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
    style: id === 'a' ? COMPANY_STYLE : { ...PERSON_STYLE, width: (20 - idx) * 8 }
  }))

let edges: Edge[] = [
  { id: 'ba', source: 'a', target: 'b' },
  { id: 'ca', source: 'a', target: 'c' },
  { id: 'da', source: 'a', target: 'd' },
  { id: 'ea', source: 'a', target: 'e' },
  { id: 'fa', source: 'a', target: 'f' },
  { id: 'ga', source: 'a', target: 'g' },
  { id: 'ha', source: 'a', target: 'h' },
  { id: 'ia', source: 'a', target: 'i' },
  { id: 'ja', source: 'a', target: 'j' },
  { id: 'ka', source: 'a', target: 'k' },
  { id: 'la', source: 'a', target: 'l' },
  { id: 'ma', source: 'a', target: 'm' },
  { id: 'na', source: 'a', target: 'n' },
  { id: 'oa', source: 'a', target: 'o' },
  { id: 'pa', source: 'a', target: 'p' },
  { id: 'qa', source: 'a', target: 'q' },
]
  .map<Edge>(({ id, source, target }) => ({
    id,
    source,
    target,
    label: 'related to',
  }))

let options = { nodeStrength: -500, }


const graph = new Graph()
const container: HTMLCanvasElement = document.querySelector('canvas#graph')
const renderer = PixiRenderer({
  container,
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerDown: (_, { id }, x, y) => graph.dragStart(id, x, y),
  onNodeDrag: (_, { id }, x, y) => graph.drag(id, x, y),
  onNodePointerUp: (_, { id }) => graph.dragEnd(id),
  onNodeDoubleClick: (_, { id }) => {
    nodes = nodes.map((node) => {
      return node.id === id ?
        {
          ...node,
          style: { ...node.style, fill: '#efefef', fillOpacity: 0.8, icon: undefined },
          subGraph: {
            nodes: [
              { id: `${node.id}a`, label: `${node.id.toUpperCase()}A`, type: 'company', style: { ...COMPANY_STYLE, width: 42 } },
              { id: `${node.id}b`, label: `${node.id.toUpperCase()}B`, type: 'company', style: { ...COMPANY_STYLE, width: 42 } },
              { id: `${node.id}c`, label: `${node.id.toUpperCase()}C`, type: 'company', style: { ...COMPANY_STYLE, width: 42 } },
            ],
            edges: []
          },
        } :
        node
    })
    graph.layout({ nodes, edges, options })
  },
  onContainerPointerUp: () => {
    nodes = nodes.map((node, idx) => {
      if (node.subGraph) {
        return {
          ...node,
          style: node.id === 'a' ? COMPANY_STYLE : { ...PERSON_STYLE, width: (20 - idx) * 8 },
          subGraph: undefined,
        }
      }
      return node
    })
    graph.layout({ nodes, edges, options })
  },
  debug: { stats, logPerformance: true }
})

graph.onLayout(renderer.layout)

graph.layout({ nodes, edges, options })

;(global as any).renderer = renderer
