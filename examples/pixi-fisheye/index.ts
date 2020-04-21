import { Subject } from 'rxjs'
import { map, startWith } from 'rxjs/operators'
import Stats from 'stats.js'
import { Node, Edge, Graph } from '../../src/index'
import { PixiRenderer } from '../../src/renderers/pixi'


export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const nodeClick$ = new Subject<string | null>()
const nodeDoubleClick$ = new Subject<string | null>()

const graph = new Graph()
const container: HTMLCanvasElement = document.querySelector('canvas#graph')

const renderer = PixiRenderer({
  container,
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodePointerDown: (_, { id }, x, y) => graph.dragStart(id, x, y),
  onNodeDrag: (_, { id }, x, y) => graph.drag(id, x, y),
  onNodePointerUp: (_, { id }) => {
    graph.dragEnd(id)
    nodeClick$.next(id)
  },
  onNodeDoubleClick: (_, { id }) => {
    nodeDoubleClick$.next(id)
  },
  onContainerPointerUp: () => {
    nodeClick$.next(null)
    nodeDoubleClick$.next(null)
  },
  debug: { stats, logPerformance: false }
})
graph.onLayout(renderer.layout)
;(global as any).renderer = renderer


const COMPANY_STYLE = { width: 62, fill: '#FFAF1D', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
const PERSON_STYLE = { width: 62, fill: '#7CBBF3', stroke: '#90D7FB', strokeWidth: 4, icon: 'person' }

const nodes: Node[] = [
  { id: 'a', label: 'A', type: 'company'},
  { id: 'b', label: 'B', type: 'person'},
  { id: 'c', label: 'C', type: 'person'},
  { id: 'd', label: 'D', type: 'person'},
  { id: 'e', label: 'E', type: 'person'},
  { id: 'f', label: 'F', type: 'person'},
  { id: 'g', label: 'G', type: 'person'},
  { id: 'h', label: 'H', type: 'person'},
  { id: 'i', label: 'I', type: 'person'},
  { id: 'j', label: 'J', type: 'person'},
  { id: 'k', label: 'K', type: 'person'},
  { id: 'l', label: 'L', type: 'person'},
  { id: 'm', label: 'M', type: 'person'},
  { id: 'n', label: 'N', type: 'person'},
  { id: 'o', label: 'O', type: 'person'},
  { id: 'p', label: 'P', type: 'person'},
  { id: 'q', label: 'Q', type: 'person'},
]
  .map<Node>(({ id, label, type }, idx) => ({
    id,
    label,
    style: type === 'person' ? { ...PERSON_STYLE, width: (20 - idx) * 8 } : COMPANY_STYLE
  }))

const edges: Edge[] = [
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



nodeDoubleClick$.pipe(
  startWith(null),
  map((clickedNode) => {
    const nodeIds = new Set()
    return {
      nodes: nodes
        .map((node) => {
          if (node.id === clickedNode) {
            // const fill = hsl(node.style.fill)
            // fill.s -= 0.2
            // fill.l += 0.22
            return {
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
            }
          }
          return node
        })
        .map((node) => (nodeIds.add(node.id), node)),
      edges: edges,
      options: { nodeStrength: -500, }
    }
  })
).subscribe({
  next: (graphData) => graph.layout(graphData),
  error: (err) => console.error(err),
  complete: () => console.log('complete'),
})
