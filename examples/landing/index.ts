import clustersKmeans from '@turf/clusters-kmeans'
import * as Force from '../../src/layout/force'
import * as Hierarchy from '../../src/layout/hierarchy'
import * as WebGL from '../../src/renderers/webgl'
import * as Graph from '../../src/'
import raw from './data'


type Node = Graph.Node & { cluster?: number }


const NODE_STYLE_A: Graph.NodeStyle = {
  color: '#0A85FF',
  stroke: [{ color: '#9CF', width: 3 }],
  // icon: { type: 'textIcon', family: 'Helvetica', text: 'N', color: '#9CF', size: 22 }
}

const NODE_STYLE_B: Graph.NodeStyle = {
  color: '#FFB71B',
  stroke: [{ color: '#FEA', width: 3 }],
  // icon: { type: 'textIcon', family: 'Helvetica', text: 'N', color: '#FEA', size: 22 }
}

// const NODE_STYLE_C: Graph.NodeStyle = {
//   color: '#7F5BCC',
//   stroke: [{ color: '#CCC', width: 3 }]
// }

const EDGE_STYLE: Graph.EdgeStyle = {
  stroke: '#BBB',
  width: 1,
  arrow: 'forward',
}


const container = document.querySelector('#graph') as HTMLDivElement
const render = WebGL.Renderer({ container })
const force = Force.Layout()
const hierarchy = Hierarchy.Layout()
// const nodes = raw.nodes.map((id, idx) => ({ id: `${id}`, radius: 18, style: idx % 5 === 0 ? NODE_STYLE_C : idx % 3 === 0 ? NODE_STYLE_B : NODE_STYLE_A }))
const nodes = raw.nodes.map<Node>((id, idx) => ({ id: `${id}`, radius: 18, style: idx % 4 === 0 ? NODE_STYLE_A : NODE_STYLE_B }))
const edges = raw.edges.map(([source, target], idx) => ({ id: `${idx}`, source: `${source}`, target: `${target}`, style: EDGE_STYLE }))


const filterGraph = (predicate: (node: Node) => boolean, graph: { nodes: Node[], edges: Graph.Edge[] }) => {
  const nodeMap = graph.nodes.reduce<Record<string, Node>>((nodeMap, node) => (nodeMap[node.id] = node, nodeMap), {})
  return {
    nodes: graph.nodes.filter(predicate),
    edges: graph.edges.filter(({ source, target }) => predicate(nodeMap[source]) && predicate(nodeMap[target]))
  }
}


force({ nodes, edges }).then(({ nodes, edges }) => {
  const nodeMap = nodes.reduce<Record<string, Node>>((nodeMap, node) => (nodeMap[node.id] = node, nodeMap), {})

  clustersKmeans({
    type: 'FeatureCollection',
    features: nodes.map(({ id, x, y }) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [x, y],
      },
      properties: { id }
    }))
  }).features.forEach(({ properties }) => {
    const cluster = properties.cluster ?? 0
    const node = nodeMap[(properties as any).id]
    node.cluster = cluster
    // node.style = { ...node.style, color: ['red', 'blue', 'green', 'yellow', 'red', 'orange', 'purple', 'pink'][cluster] }
  })

  return Promise.all<{ nodes: Node[], edges: Graph.Edge[] }>([
    force(filterGraph(({ cluster }) => cluster !== 2 && cluster !== 3 && cluster !== 5 && cluster !== 7, { nodes, edges })),
    force(filterGraph(({ cluster }) => cluster !== 3 && cluster !== 7, { nodes, edges })),
    force({ nodes, edges }),
    hierarchy(`${raw.roots[0]}`, { nodes, edges }),
    // collapse by group and hierarchy layout
    // collapse by group and force layout
  ])
}).then((layouts) => {
  const draw = (idx: number, animate: boolean) => {
    const nodes = layouts[idx].nodes
    const edges = layouts[idx].edges
    const width = container.offsetWidth
    const height = container.offsetHeight

    const { x, y, zoom } = Graph.boundsToViewport(
      Graph.getSelectionBounds(nodes, 80),
      { width, height }
    )

    render({
      nodes,
      edges,
      options: {
        width,
        height,
        x,
        y,
        zoom,
        animateNodePosition: !!animate,
        animateViewportPosition: true,
        animateViewportZoom: true
      }
    })
  }

  let i = 0

  draw(0, false)

  setInterval(() => {
    i = (i + 1) % layouts.length
    draw(i, true)
  }, 3000)

  ;(window as any).layouts = layouts
})
