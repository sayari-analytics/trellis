import { createElement, SFC, useState, useCallback } from 'react'
import { render } from 'react-dom'
import Stats from 'stats.js'
import { Layout } from '../../src/layout/force/bindings/react'
import { Node, Edge, PositionedNode } from '../../src/types'
import { NodeStyle } from '../../src/renderers/pixi'
import { Renderer } from '../../src/renderers/pixi/bindings/react'


const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

/**
 * Initialize Data
 */
type NodeDatum = Exclude<Node, 'style'> & { style: Partial<NodeStyle> }


const COMPANY_STYLE: Partial<NodeStyle> = { fill: '#FFAF1D', stroke: '#F7CA4D', strokeWidth: 4, icon: 'business' }
const PERSON_STYLE: Partial<NodeStyle> = { fill: '#7CBBF3', stroke: '#90D7FB', strokeWidth: 4, icon: 'person' }

let nodes: NodeDatum[] = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' }, { id: 'g', label: 'G' },
  { id: 'h', label: 'H' }, { id: 'i', label: 'I' }, { id: 'j', label: 'J' }, { id: 'k', label: 'K' }, { id: 'l', label: 'L' }, { id: 'm', label: 'M' }, { id: 'n', label: 'N' },
  { id: 'o', label: 'O' }, { id: 'p', label: 'P' }, { id: 'q', label: 'Q' },
]
  .map(({ id, label }, idx) => ({
    id,
    label,
    radius: id === 'a' ? 62 : (20 - idx) * 4,
    style: id === 'a' ? COMPANY_STYLE : PERSON_STYLE,
    subGraph: undefined,
  }))

let edges: Edge[] = [
  { id: 'ba', source: 'a', target: 'b', label: 'Related To' }, { id: 'ca', source: 'a', target: 'c', label: 'Related To' }, { id: 'da', source: 'a', target: 'd', label: 'Related To' }, { id: 'ea', source: 'a', target: 'e', label: 'Related To' },
  { id: 'fa', source: 'a', target: 'f', label: 'Related To' }, { id: 'ga', source: 'a', target: 'g', label: 'Related To' }, { id: 'ha', source: 'a', target: 'h', label: 'Related To' }, { id: 'ia', source: 'a', target: 'i', label: 'Related To' },
  { id: 'ja', source: 'b', target: 'j', label: 'Related To' }, { id: 'ka', source: 'b', target: 'k', label: 'Related To' }, { id: 'la', source: 'b', target: 'l', label: 'Related To' }, { id: 'ma', source: 'l', target: 'm', label: 'Related To' },
  { id: 'na', source: 'c', target: 'n', label: 'Related To' }, { id: 'oa', source: 'c', target: 'o', label: 'Related To' }, { id: 'pa', source: 'c', target: 'p', label: 'Related To' }, { id: 'qa', source: 'c', target: 'q', label: 'Related To' },
]


/**
 * Render React Layout and Renderer Components
 */
const App: SFC = () => {

  const [graph, setGraph] = useState({ nodes, edges })

  const onNodePointerDown = useCallback((_: PIXI.interaction.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
    setGraph(({ nodes, edges }) => ({ nodes: nodes.map((node) => (node.id === id ? { ...node, x, y } : node)), edges }))
  }, [])
  const onNodeDrag = useCallback((_: PIXI.interaction.InteractionEvent, { id }: PositionedNode, x: number, y: number) => {
    setGraph(({ nodes, edges }) => ({ nodes: nodes.map((node) => (node.id === id ? { ...node, x, y } : node)), edges }))
  }, [])
  const onNodePointerUp = useCallback((_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    setGraph(({ nodes, edges }) => ({ nodes: nodes.map((node) => (node.id === id ? { ...node, x: undefined, y: undefined } : node)), edges }))
  }, [])
  const onNodePointerEnter = useCallback((_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    setGraph(({ nodes, edges }) => ({ nodes: nodes.map((node) => (node.id === id ? { ...node, style: { ...node.style, stroke: '#CCC' } } : node)), edges }))
  }, [])
  const onNodePointerLeave = useCallback((_: PIXI.interaction.InteractionEvent, { id }: PositionedNode) => {
    setGraph(({ nodes, edges }) => ({
      nodes: nodes.map((node) => (node.id === id ?
        { ...node, style: { ...node.style, stroke: id === 'a' ? COMPANY_STYLE.stroke : PERSON_STYLE.stroke } } :
        node
      )),
      edges
    }))
  }, [])
  const onEdgePointerEnter = useCallback((_: PIXI.interaction.InteractionEvent, { id }: Edge) => {
    setGraph(({ nodes, edges }) => ({ nodes, edges: edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 3 } } : edge)) }))
  }, [])
  const onEdgePointerLeave = useCallback((_: PIXI.interaction.InteractionEvent, { id }: Edge) => {
    setGraph(({ nodes, edges }) => ({ nodes, edges: edges.map((edge) => (edge.id === id ? { ...edge, style: { ...edge.style, width: 1 } } : edge)) }))
  }, [])
  const onNodeDoubleClick = useCallback((_, { id }) => {
    setGraph(({ nodes, edges }) => ({
      nodes: nodes.map((node) => (node.id === id ? {
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
      } : node)),
      edges
    }))
  }, [])
  const onContainerPointerUp = useCallback(() => {
    setGraph(({ nodes, edges }) => ({
      nodes: nodes.map((node, idx) => (node.subGraph ? {
        ...node,
        style: node.id === 'a' ? COMPANY_STYLE : { ...PERSON_STYLE, width: (20 - idx) * 8 },
        subGraph: undefined,
      } : node)),
      edges
    }))
  }, [])


  return (
    createElement(Layout, {
      nodes: graph.nodes,
      edges: graph.edges,
      options: { nodeStrength: -500 },
      children: ({ nodes, edges }) => (
        createElement(Renderer, {
          nodes,
          edges,
          options: {
            onNodePointerDown,
            onNodeDrag,
            onNodePointerUp,
            onNodePointerEnter,
            onNodePointerLeave,
            onEdgePointerEnter,
            onEdgePointerLeave,
            onNodeDoubleClick,
            onContainerPointerUp,
          }
        })
      ),
    })
  )
}


render(
  createElement(App),
  document.querySelector('#graph')
)
