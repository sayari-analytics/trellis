import { createElement, SFC, useState, useCallback, useEffect, useRef } from 'react'
import { render } from 'react-dom'
import Stats from 'stats.js'
import * as Graph from '../../src'
import { Renderer } from '../../src/renderers/pixi/bindings/react'
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
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: radius * 1.25 }
})
const createPersonStyle = (radius: number): Partial<NodeStyle> => ({
  color: '#7CBBF3',
  stroke: [{ color: '#90D7FB', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: radius * 1.25 }
})

let nodes: Node[] = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' },
  { id: 'f', label: 'F' }, { id: 'g', label: 'G' }, { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' },
  { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' }, { id: 'o', label: 'O' },
  { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map(({ id, label }, idx) => ({
    id,
    label,
    radius: id === 'a' ? 62 : (20 - idx) * 4,
    type: id === 'a' ? 'company' : 'person',
    style: id === 'a' ? createCompanyStyle(62) : createPersonStyle((20 - idx) * 4),
    subGraph: undefined,
  }))

let edges: Graph.Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'Related To' }, { id: 'ca', source: 'a', target: 'c', label: 'Related To' },
  { id: 'da', source: 'a', target: 'd', label: 'Related To' }, { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
  { id: 'fa', source: 'a', target: 'f', label: 'Related To' }, { id: 'ga', source: 'a', target: 'g', label: 'Related To' },
  { id: 'ha', source: 'a', target: 'h', label: 'Related To' }, { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
  { id: 'ja', source: 'b', target: 'j', label: 'Related To' }, { id: 'ka', source: 'b', target: 'k', label: 'Related To' },
  { id: 'la', source: 'b', target: 'l', label: 'Related To' }, { id: 'ma', source: 'l', target: 'm', label: 'Related To' },
  { id: 'na', source: 'c', target: 'n', label: 'Related To' }, { id: 'oa', source: 'c', target: 'o', label: 'Related To' },
  { id: 'pa', source: 'c', target: 'p', label: 'Related To' }, { id: 'qa', source: 'c', target: 'q', label: 'Related To' },
]


const force = Force.Layout()
const subGraph = SubGraph.Layout()


/**
 * Render React Layout and Renderer Components
 */
const App: SFC = () => {

  const ref = useRef<HTMLElement>()

  const [graph, setGraph] = useState<{ nodes: Graph.Node[], edges: Graph.Edge[] }>({ nodes: [], edges: [] })

  useEffect(() => {
    force({ nodes, edges }).then((graph) => setGraph(graph))
  }, [])

  const onNodePointerDown = useCallback((_: PIXI.InteractionEvent, { id }: Node, x: number, y: number) => {
    setGraph(({ nodes, edges }) => ({ nodes: nodes.map((node) => (node.id === id ? { ...node, x, y } : node)), edges }))
  }, [])
  const onNodeDrag = useCallback((_: PIXI.InteractionEvent, { id }: Node, x: number, y: number) => {
    setGraph(({ nodes, edges }) => ({ nodes: nodes.map((node) => (node.id === id ? { ...node, x, y } : node)), edges }))
  }, [])
  const onNodePointerEnter = useCallback((_: PIXI.InteractionEvent, { id }: Node) => {
    setGraph(({ nodes, edges }) => ({
      nodes: nodes.map((node) => (node.id === id ?
        { ...node, style: { ...node.style, stroke: [{ color: '#CCC', width: 4 }] } } :
        node
      )),
      edges
    }))
  }, [])
  const onNodePointerLeave = useCallback((_: PIXI.InteractionEvent, { id }: Node) => {
    setGraph(({ nodes, edges }) => ({
      nodes: nodes.map((node) => (node.id === id ?
        {
          ...node,
          style: {
            ...node.style,
            stroke: id === 'a' ? [{ color: '#F7CA4D', width: 4 }] : [{ color: '#90D7FB', width: 4 }]
          }
        } :
        node
      )),
      edges
    }))
  }, [])
  const onEdgePointerEnter = useCallback((_: PIXI.InteractionEvent, { id }: Graph.Edge) => {
    setGraph(({ nodes, edges }) => ({ nodes, edges: edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge)) }))
  }, [])
  const onEdgePointerLeave = useCallback((_: PIXI.InteractionEvent, { id }: Graph.Edge) => {
    setGraph(({ nodes, edges }) => ({ nodes, edges: edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge)) }))
  }, [])
  const onNodeDoubleClick = useCallback((_, { id }) => {
    subGraph({
      nodes: graph.nodes.map((node) => (node.id === id ? {
        ...node,
        style: { ...node.style, color: '#efefef', icon: undefined },
        subGraph: {
          nodes: [
            { id: `${node.id}a`, radius: 21, label: `${node.id.toUpperCase()}A`, style: createCompanyStyle(21) },
            { id: `${node.id}b`, radius: 21, label: `${node.id.toUpperCase()}B`, style: createCompanyStyle(21) },
            { id: `${node.id}c`, radius: 21, label: `${node.id.toUpperCase()}C`, style: createCompanyStyle(21) },
          ],
          edges: []
        },
      } : node)),
      edges: graph.edges
    }).then(setGraph)
  }, [graph])
  const onContainerPointerUp = useCallback(() => {
    subGraph({
      nodes: graph.nodes.map((node, idx) => (node.subGraph ? {
        ...node,
        radius: node.id === 'a' ? 62 : (20 - idx) * 4,
        style: node.id === 'a' ? createCompanyStyle(62) : createPersonStyle((20 - idx) * 4),
        subGraph: undefined,
      } : node)),
      edges: graph.edges
    }).then(setGraph)
  }, [graph])

  return (
    createElement('div', {
      ref,
      style: { height: '100%', width: '100%' },
      children: ref.current && (
        createElement(Renderer, {
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
          nodes: graph.nodes,
          edges: graph.edges,
          onNodePointerDown,
          onNodeDrag,
          onNodePointerEnter,
          onNodePointerLeave,
          onEdgePointerEnter,
          onEdgePointerLeave,
          onNodeDoubleClick,
          onContainerPointerUp,
        })
      )
    })
  )
}


render(
  createElement(App),
  document.querySelector('#graph')
)
