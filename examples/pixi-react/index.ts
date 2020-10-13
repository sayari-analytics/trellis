import { createElement, SFC, useState, useCallback, useEffect } from 'react'
import { render } from 'react-dom'
import ReactResizeDetector from 'react-resize-detector'
import Stats from 'stats.js'
import * as Graph from '../../src'
import { Zoom, clampZoom } from '../../src/renderers/pixi/bindings/react/zoom'
import { Renderer } from '../../src/renderers/pixi/bindings/react/renderer'
import * as Force from '../../src/layout/force'
import * as SubGraph from '../../src/layout/subGraph'
import { NodeStyle } from '../../src/renderers/pixi'


const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)


type Node = Graph.Node & { type: string }


const createCompanyStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius * 1.2 }
})
const createPersonStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: radius * 1.2 }
})

const data = {
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
      style: id === 'a' ? createCompanyStyle(18) : createPersonStyle(18),
      subGraph: undefined,
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
const subGraph = SubGraph.Layout()


/**
 * Render React Layout and Renderer Components
 */
const App: SFC = () => {

  const [graph, setGraph] = useState<{ nodes: Graph.Node[], edges: Graph.Edge[], x: number, y: number, zoom: number, minZoom: number, maxZoom: number }>({
    nodes: [],
    edges: [],
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 2.5,
  })

  useEffect(() => {
    force<Node, Graph.Edge>({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => setGraph((graph) => ({ ...graph, nodes, edges })))
  }, [])

  const onContainerDrag = useCallback((_, x: number, y: number) => {
    setGraph((graph) => ({ ...graph, x, y }))
  }, [])
  const onWheel = useCallback((_, x: number, y: number, zoom: number) => {
    setGraph((graph) => ({ ...graph, x, y, zoom }))
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
  const onNodePointerDown = useCallback((_, { id }: Node, x: number, y: number) => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
    }))
  }, [])
  const onNodeDrag = useCallback((_, { id }: Node, x: number, y: number) => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    }))
  }, [])
  const onNodePointerEnter = useCallback((_, { id }: Node) => {
    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ?
        { ...node, style: { ...node.style, stroke: [{ color: '#CCC', width: 4 }] } } :
        node
      )),
    }))
  }, [])
  const onNodePointerLeave = useCallback((_, { id }: Node) => {
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
  const onEdgePointerEnter = useCallback((_, { id }: Graph.Edge) => {
    setGraph((graph) => ({
      ...graph,
      edges: graph.edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge))
    }))
  }, [])
  const onEdgePointerLeave = useCallback((_, { id }: Graph.Edge) => {
    setGraph((graph) => ({
      ...graph,
      edges: graph.edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge))
    }))
  }, [])
  const onNodeDoubleClick = useCallback((_, { id }) => {
    subGraph({
      nodes: graph.nodes.map((node) => (node.id === id ? {
        ...node,
        style: { ...node.style, color: '#efefef', icon: undefined },
        subGraph: {
          nodes: [
            { id: `${node.id}a`, radius: 10, label: `${node.id.toUpperCase()}A`, style: createCompanyStyle(10) },
            { id: `${node.id}b`, radius: 10, label: `${node.id.toUpperCase()}B`, style: createCompanyStyle(10) },
            { id: `${node.id}c`, radius: 10, label: `${node.id.toUpperCase()}C`, style: createCompanyStyle(10) },
          ],
          edges: []
        },
      } : node)),
      edges: graph.edges
    }).then(({ nodes, edges }) => setGraph((graph) => ({ ...graph, nodes, edges })))
  }, [graph])
  const onContainerPointerUp = useCallback(() => {
    subGraph({
      nodes: graph.nodes.map((node) => (node.subGraph ? {
        ...node,
        radius: 18,
        style: node.id === 'a' ? createCompanyStyle(18) : createPersonStyle(18),
        subGraph: undefined,
      } : node)),
      edges: graph.edges
    }).then(({ nodes, edges }) => setGraph((graph) => ({ ...graph, nodes, edges })))
  }, [graph])

  return (
    createElement(ReactResizeDetector, {},
      ({ width, height }) => (
        createElement('div', { style: { width: '100%', height: '100%' } }, (
          createElement(Zoom, {
            top: 80,
            onZoomIn,
            onZoomOut,
          }, (
            createElement(Renderer, {
              width,
              height,
              nodes: graph.nodes,
              edges: graph.edges,
              x: graph.x,
              y: graph.y,
              zoom: graph.zoom,
              minZoom: graph.minZoom,
              maxZoom: graph.maxZoom,
              onNodePointerDown,
              onNodeDrag,
              onNodePointerEnter,
              onNodePointerLeave,
              onEdgePointerEnter,
              onEdgePointerLeave,
              onNodeDoubleClick,
              onContainerPointerUp,
              onWheel,
              onContainerDrag,
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
