import { Subject } from 'rxjs'
import { map, startWith } from 'rxjs/operators'
import Stats from 'stats.js'
import { Node, Edge, Graph } from '../../src/index'
import { PixiRenderer } from '../../src/renderers/pixi'



export const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const nodeClick$ = new Subject<string | null>()

const graph = new Graph()
const container = document.getElementById('graph')
const renderer = PixiRenderer({
  id: 'graph',
  width: container.offsetWidth,
  height: container.offsetHeight,
  onNodeMouseDown: (({ id }, { x, y }) => graph.dragStart(id, x, y)),
  onNodeDrag: (({ id }, { x, y }) => graph.drag(id, x, y)),
  onNodeMouseUp: (({ id }) => {
    graph.dragEnd(id)
    nodeClick$.next(id)
  }),
  onContainerMouseUp: () => {
    nodeClick$.next(null)
  },
  debug: { stats }
})
graph.onLayout(renderer.layout)


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
  .map<Node>(({ id, label, type }) => ({
    id,
    label,
    style: {
      width: 62,
      fill: type === 'company' ? '#ffaf1d' : '#7CBBF3',
      stroke: type === 'company' ? '#F7CA4D' : '#90D7FB',
      strokeWidth: 4,
      icon: type === 'company' ? 'business' : 'person',
    }
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



nodeClick$.pipe(
  startWith(null),
  map((clickedNode) => {
    const nodeIds = new Set()
    return {
      nodes: nodes
        .map((node) => {
          if (node.id === clickedNode) {
            return {
              ...node,
              style: { ...node.style, fill: '#efefef', fillOpacity: 0.8, stroke: '#ccc', strokeWidth: 1, icon: undefined },
              subGraph: {
                nodes: [
                  { id: `${node.id}a`, label: 'A', type: 'company'},
                  { id: `${node.id}b`, label: 'B', type: 'company'},
                  { id: `${node.id}c`, label: 'C', type: 'company'},
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
