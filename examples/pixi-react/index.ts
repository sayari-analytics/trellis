import { createElement, FunctionComponent, useState, useCallback, useEffect } from 'react'
import { render } from 'react-dom'
import ReactResizeDetector from 'react-resize-detector'
import Stats from 'stats.js'
import * as Graph from '../../src'
import { Zoom, clampZoom } from '../../src/renderers/webgl/bindings/react/zoom'
import { Renderer, Props } from '../../src/renderers/webgl/bindings/react/renderer'
import * as Force from '../../src/layout/force'
import * as Cluster from '../../src/layout/cluster'
import * as Subgraph from '../../src/layout/subgraph'
import * as WebGL from '../../src/renderers/webgl'


const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


type Node = Graph.Node & { type: string }
type Edge = Graph.Edge


const COMPANY_STYLE: WebGL.NodeStyle = {
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: 22 }
}
const PERSON_STYLE: WebGL.NodeStyle = {
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: 22 }
}

const data: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' },
    { id: 'f', label: 'F' }, { id: 'g', label: 'G' }, { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' },
    { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' }, { id: 'o', label: 'O' },
    { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
  ]
    .map<Node>(({ id, label }) => ({
      id,
      label,
      radius: 18,
      type: id === 'a' ? 'company' : 'person',
      style: id === 'a' ? COMPANY_STYLE : PERSON_STYLE,
      subgraph: undefined,
    })),
  edges: [
    { id: 'ba', source: 'a', target: 'b', label: 'Related To' }, { id: 'ca', source: 'a', target: 'c', label: 'Related To' },
    { id: 'da', source: 'a', target: 'd', label: 'Related To' }, { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
    { id: 'fa', source: 'a', target: 'f', label: 'Related To' }, { id: 'ga', source: 'a', target: 'g', label: 'Related To' },
    { id: 'ha', source: 'a', target: 'h', label: 'Related To' }, { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
    { id: 'ja', source: 'b', target: 'j', label: 'Related To' }, { id: 'ka', source: 'b', target: 'k', label: 'Related To' },
    { id: 'la', source: 'b', target: 'l', label: 'Related To' }, { id: 'ma', source: 'l', target: 'm', label: 'Related To' },
    { id: 'na', source: 'c', target: 'n', label: 'Related To' }, { id: 'oa', source: 'c', target: 'o', label: 'Related To' },
    { id: 'pa', source: 'c', target: 'p', label: 'Related To' }, { id: 'qa', source: 'c', target: 'q', label: 'Related To' },
  ]
}


const force = Force.Layout()
const cluster = Cluster.Layout()
const subgraph = Subgraph.Layout()


/**
 * Render React Layout and Renderer Components
 */
const App: FunctionComponent = () => {

  const [graph, setGraph] = useState<{ nodes: Node[], edges: Edge[], x: number, y: number, zoom: number, minZoom: number, maxZoom: number }>({
    nodes: [],
    edges: [],
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 2.5,
  })

  useEffect(() => {
    force({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => setGraph((graph) => ({ ...graph, nodes, edges })))
  }, [])

  const onZoomIn = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      zoom: clampZoom(graph.minZoom, graph.maxZoom, graph.zoom / 0.6)
    }))
  }, [])
  const onZoomOut = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      zoom: clampZoom(graph.minZoom, graph.maxZoom, graph.zoom * 0.6)
    }))
  }, [])
  const onNodeDrag = useCallback(({ nodeX: x, nodeY: y, target: { id } }: WebGL.NodeDragEvent) => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    }))
  }, [])
  const onNodePointerEnter = useCallback(({ target: { id } }: WebGL.NodePointerEvent) => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ?
        { ...node, style: { ...node.style, stroke: [{ color: '#CCC', width: 4 }] } } :
        node
      )),
    }))
  }, [])
  const onNodePointerLeave = useCallback(({ target: { id } }: WebGL.NodePointerEvent) => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ? {
        ...node,
        style: {
          ...node.style,
          stroke: id === 'a' ? [{ color: '#F7CA4D', width: 4 }] : [{ color: '#90D7FB', width: 4 }]
        }
      } : node))
    }))
  }, [])
  const onEdgePointerEnter = useCallback(({ target: { id } }: WebGL.EdgePointerEvent) => {
    setGraph((graph) => ({
      ...graph,
      edges: graph.edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    }))
  }, [])
  const onEdgePointerLeave = useCallback(({ target: { id } }: WebGL.EdgePointerEvent) => {
    setGraph((graph) => ({
      ...graph,
      edges: graph.edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    }))
  }, [])
  const onNodeDoubleClick = useCallback(({ target }: WebGL.NodePointerEvent) => {
    const subgraphNodes = cluster((target.subgraph?.nodes ?? []).concat([
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 1}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 1}`, style: COMPANY_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 2}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 2}`, style: COMPANY_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 3}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 3}`, style: COMPANY_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 4}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 4}`, style: COMPANY_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 5}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 5}`, style: COMPANY_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 6}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 6}`, style: COMPANY_STYLE },
    ]))
    const radius = Subgraph.subgraphRadius(target.radius, subgraphNodes) + 20

    setGraph((graph) => ({
      ...graph,
      nodes: subgraph(
        graph.nodes,
        graph.nodes.map((node) => {
          if (node.id === target.id) {
            return {
              ...node,
              radius,
              style: { ...node.style, color: '#efefef', icon: undefined },
              subgraph: {
                nodes: subgraphNodes,
                edges: []
              },
            }
          }

          return node
        })
      )
    }))
  }, [graph])
  const onViewportPointerUp = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      nodes: subgraph(
        graph.nodes,
        graph.nodes.map((node) => ({
          ...node,
          radius: 18,
          style: node.id === 'a' ? COMPANY_STYLE : PERSON_STYLE,
          subgraph: undefined,
        }))
      )
    }))
  }, [graph])
  const onViewportDrag = useCallback(({ viewportX: x, viewportY: y }: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    setGraph((graph) => ({ ...graph, x, y }))
  }, [])
  const onViewportWheel = useCallback(({ viewportX: x, viewportY: y, viewportZoom: zoom }: WebGL.ViewportWheelEvent) => {
    setGraph((graph) => ({ ...graph, x, y, zoom }))
  }, [])

  return (
    createElement(ReactResizeDetector, {},
      ({ width, height }: { width?: number, height?: number }) => (
        createElement('div', { style: { width: '100%', height: '100%' } }, (
          createElement(Zoom, {
            top: 80,
            onZoomIn,
            onZoomOut,
          }, (
            createElement<Props<Node, Edge>>(Renderer, {
              width,
              height,
              nodes: graph.nodes,
              edges: graph.edges,
              x: graph.x,
              y: graph.y,
              zoom: graph.zoom,
              minZoom: graph.minZoom,
              maxZoom: graph.maxZoom,
              onNodeDrag,
              onNodePointerEnter,
              onNodePointerLeave,
              onEdgePointerEnter,
              onEdgePointerLeave,
              onNodeDoubleClick,
              onViewportPointerUp,
              onViewportWheel,
              onViewportDrag,
              debug: { stats }
            })
          ))
        ))
      )
    )
  )
}


render(
  createElement(App),
  document.querySelector('#graph')
)
