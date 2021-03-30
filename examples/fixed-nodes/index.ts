import clustersKmeans from '@turf/clusters-kmeans'
import * as Force from '../../src/layout/force'
import * as Hierarchy from '../../src/layout/hierarchy'
import * as Collide from '../../src/layout/collide'
import * as Radial from '../../src/layout/radial'
import * as WebGL from '../../src/renderers/webgl'
import * as Graph from '../../src/'
import raw from './data'


type Node = Graph.Node & { cluster?: number, size?: number }


const NODE_STYLE_A: Graph.NodeStyle = {
  color: '#0A85FF',
  stroke: [{ color: '#9CF', width: 3 }],
  icon: { type: 'textIcon', family: 'Material Icons', text: 'person', color: '#fff', size: 24 },
  labelSize: 10,
  labelColor: '#666',
}

const NODE_STYLE_B: Graph.NodeStyle = {
  color: '#FFB71B',
  stroke: [{ color: '#FEA', width: 3 }],
  icon: { type: 'textIcon', family: 'Material Icons', text: 'business', color: '#fff', size: 24 },
  labelSize: 10,
  labelColor: '#666',
}

const NODE_STYLE_C: Graph.NodeStyle = {
  color: '#7F5BCC',
  stroke: [{ color: '#967ccc', width: 3 }],
  labelSize: 10,
  labelColor: '#666',
}

const EDGE_STYLE: Graph.EdgeStyle = {
  stroke: '#BBB',
  width: 1,
  arrow: 'forward',
  labelSize: 10,
  labelColor: '#666',
}


const container = document.querySelector('#graph') as HTMLDivElement
const render = WebGL.Renderer({ container })
const force = Force.Layout()
const hierarchy = Hierarchy.Layout()
const collide = Collide.Layout()
const radial = Radial.Layout()


const nodes = raw.nodes.map<Node>((id, idx) => ({ id: `${id}`, radius: 18, label: `${idx % 4 === 0 ? 'person' : 'company'} ${id}`, style: id === 0 ? NODE_STYLE_C : idx % 4 === 0 ? NODE_STYLE_A : NODE_STYLE_B, fx: id === 0 ? 0 : undefined, fy: id === 0 ? 0 : undefined }))
const edges = raw.edges.map(([source, target], idx) => ({ id: `${idx}`, source: `${source}`, target: `${target}`, label: 'linked to', style: EDGE_STYLE }))


const filterGraph = (predicate: (node: Node) => boolean) => (graph: { nodes: Node[], edges: Graph.Edge[] }) => {
  const nodeMap = graph.nodes.reduce<Record<string, Node>>((nodeMap, node) => (nodeMap[node.id] = node, nodeMap), {})
  return {
    nodes: graph.nodes.filter(predicate),
    edges: graph.edges.filter(({ source, target }) => predicate(nodeMap[source]) && predicate(nodeMap[target]))
  }
}


const groupBy = (grouper: (node: Node) => string) => (graph: { nodes: Node[], edges: Graph.Edge[] }) => {
  const idMap: Record<string, string> = {}

  const nodes = Object.values(graph.nodes.reduce<Record<string, Node[]>>((groups, node) => {
    const key = grouper(node)
    if (groups[key] === undefined) groups[key] = []
    groups[key].push(node)
    return groups
  }, {}))
    .map((nodes) => {
      nodes.forEach((node) => {
        idMap[node.id] = nodes[0].id
      })
      return { ...nodes[0], size: nodes.length }
    })

  const edges = Object.values(graph.edges.reduce<Record<string, Graph.Edge>>((edges, edge) => {
    if (edges[`${idMap[edge.source]}::${idMap[edge.target]}`] === undefined) {
      edges[`${idMap[edge.source]}::${idMap[edge.target]}`] = { ...edge, source: idMap[edge.source], target: idMap[edge.target] }
    }
    return edges
  }, {}))

  return { nodes, edges }
}


const cluster = (graph: { nodes: Node[], edges: Graph.Edge[] }) => {
  const nodeMap = graph.nodes.reduce<Record<string, Node>>((nodeMap, node) => (nodeMap[node.id] = node, nodeMap), {})

  const nodes = clustersKmeans({
    type: 'FeatureCollection',
    features: graph.nodes.map(({ id, x = 0, y = 0 }) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [x, y],
      },
      properties: { id }
    }))
  }).features.map(({ properties }) => {
    const cluster = properties.cluster ?? 0
    const node = nodeMap[(properties as any).id]

    return { ...node, cluster }
    // return { ...node, cluster: properties.cluster ?? 0, style: { ...node.style, color: ['gray', 'blue', 'green', 'yellow', 'red', 'orange', 'purple', 'pink'][cluster] } }
  })

  return { nodes, edges }
}


Promise.all<{ nodes: Node[], edges: Graph.Edge[] }>([
  force({ nodes, edges })
    .then(cluster)
    .then(filterGraph(({ cluster }) => cluster !== 2 && cluster !== 3 && cluster !== 5 && cluster !== 7))
    .then(force),
  force({ nodes, edges })
    .then(cluster)
    .then(filterGraph(({ cluster }) => cluster !== 3 && cluster !== 7))
    .then(force),
  force({ nodes, edges })
    .then(cluster),
  collide(hierarchy(`${raw.roots[0]}`, { nodes, edges })),
  collide(radial(`${raw.roots[0]}`, { nodes, edges, options: { radius: 1200 } })),
  force(groupBy((node) => node.cluster === 0 || node.cluster === 6 || node.cluster === 2 ? `${node.cluster}` : node.id)(cluster(hierarchy(`${raw.roots[0]}`, { nodes, edges }))))
]).then((layouts) => {
  const draw = (idx: number, animate: boolean) => {
    const nodes = layouts[idx].nodes
    const edges = layouts[idx].edges
    const width = container.offsetWidth
    const height = container.offsetHeight

    const { zoom } = Graph.boundsToViewport(
      Graph.getSelectionBounds(nodes, 80),
      { width, height }
    )

    render({
      nodes,
      edges,
      options: {
        width,
        height,
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

  console.log(JSON.stringify(layouts.map(({ nodes, edges }) => {
    const idMap = Object.values(nodes).reduce<Record<string, number>>((idMap, { id }, idx) => {
      idMap[id] = idx
      return idMap
    }, {})

    return {
      roots: raw.roots,
      nodes: Object.values(nodes).map(({ id, x = 0, y = 0 }) => [idMap[id], x, y]),
      edges: Object.values(edges).map(({ id, source, target }) => [id, idMap[source], idMap[target]])
    }
  })))
})
