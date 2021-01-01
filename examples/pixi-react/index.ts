import { createElement, FunctionComponent, useState, useCallback, useEffect, Fragment, useMemo } from 'react'
import { render } from 'react-dom'
import ReactResizeDetector from 'react-resize-detector'
import Stats from 'stats.js'
import { Selection, SelectionChangeEvent } from '../../src/renderers/webgl/bindings/react/selection'
import { Button } from '../../src/renderers/webgl/bindings/react/button'
import { Renderer, Props } from '../../src/renderers/webgl/bindings/react/renderer'
import { Zoom } from '../../src/renderers/webgl/bindings/react/zoom'
import * as Graph from '../../src'
import * as Force from '../../src/layout/force'
import * as Cluster from '../../src/layout/cluster'
import * as Subgraph from '../../src/layout/subgraph'
import * as WebGL from '../../src/renderers/webgl'
import { clampZoom } from '../../src/controls/zoom'


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
const PERSON_ICON = { type: 'textIcon' as const, family: 'Material Icons', text: 'person', color: '#fff', size: 22 }
const COMPANY_ICON = { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: 22 }

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
const MIN_ZOOM = 0.1
const MAX_ZOOM = 2.5


/**
 * Render React Layout and Renderer Components
 */
const App: FunctionComponent = () => {

  const [graph, setGraph] = useState<{ nodes: Node[], edges: Edge[], x: number, y: number, zoom: number, selectedNodes: Set<string>, hoverNode?: string, hoverEdge?: string }>({
    nodes: [],
    edges: [],
    x: 0,
    y: 0,
    zoom: 1,
    selectedNodes: new Set(),
  })

  useEffect(() => {
    force({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => setGraph((graph) => ({ ...graph, nodes, edges })))
  }, [])

  const onZoomIn = useCallback(() => {
    setGraph((graph) => ({ ...graph, zoom: clampZoom(MIN_ZOOM, MAX_ZOOM, graph.zoom / 0.6) }))
  }, [])
  const onZoomOut = useCallback(() => {
    setGraph((graph) => ({ ...graph, zoom: clampZoom(MIN_ZOOM, MAX_ZOOM, graph.zoom * 0.6) }))
  }, [])
  const onNodeDrag = useCallback(({ nodeX: x, nodeY: y, target: { id } }: WebGL.NodeDragEvent) => {
    setGraph((graph) => ({ ...graph, nodes: graph.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)) }))
  }, [])
  const onNodePointerEnter = useCallback(({ target: { id } }: WebGL.NodePointerEvent) => {
    setGraph((graph) => ({ ...graph, hoverNode: id }))
  }, [])
  const onNodePointerLeave = useCallback(() => {
    setGraph((graph) => ({ ...graph, hoverNode: undefined }))
  }, [])
  const onEdgePointerEnter = useCallback(({ target: { id } }: WebGL.EdgePointerEvent) => {
    setGraph((graph) => ({ ...graph, hoverEdge: id }))
  }, [])
  const onEdgePointerLeave = useCallback(() => {
    setGraph((graph) => ({ ...graph, hoverEdge: undefined }))
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
  }, [])
  const onViewportPointerDown = useCallback(() => {
    setGraph((graph) => ({ ...graph, selectedNodes: new Set() }))
  }, [])
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
      ),
    }))
  }, [])
  const onViewportDrag = useCallback(({ viewportX: x, viewportY: y }: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    setGraph((graph) => ({ ...graph, x, y }))
  }, [])
  const onViewportWheel = useCallback(({ viewportX: x, viewportY: y, viewportZoom: zoom }: WebGL.ViewportWheelEvent) => {
    setGraph((graph) => ({ ...graph, x, y, zoom }))
  }, [])
  const onSelection = useCallback(({ x, y, radius }: SelectionChangeEvent) => {
    // TODO - shift select
    // - add onClick selection
    // - multiselect drag
    setGraph((graph) => ({
      ...graph,
      selectedNodes: graph.nodes
        .filter((node) => Math.hypot((node.x ?? 0) - x, (node.y ?? 0) - y) <= radius)
        .reduce((selectedNodes, node) => {
          selectedNodes.add(node.id)
          return selectedNodes
        }, new Set<string>())
        // }, new Set(graph.selectedNodes))
    }))
  }, [])

  const styledNodes = useMemo(() => {
    return graph.nodes.map((node) => {
      let style: WebGL.NodeStyle

      if (node.type === 'person') {
        if (graph.selectedNodes.has(node.id) && node.id === graph.hoverNode) {
          style = { color: '#7CBBF3', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 2 }, { color: '#7CBBF3', width: 2 }], icon: PERSON_ICON }
        } else if (graph.selectedNodes.has(node.id)) {
          style = { color: '#7CBBF3', stroke: [{ color: '#90D7FB', width: 4 }, { color: '#FFF', width: 2 }, { color: '#7CBBF3', width: 2 }], icon: PERSON_ICON }
        } else if (node.id === graph.hoverNode) {
          style = { color: '#7CBBF3', stroke: [{ color: '#CCC', width: 4 }], icon: PERSON_ICON }
        } else {
          style = { color: '#7CBBF3', stroke: [{ color: '#90D7FB', width: 4 }], icon: PERSON_ICON }
        }
      } else {
        if (graph.selectedNodes.has(node.id) && node.id === graph.hoverNode) {
          style = { color: '#FFAF1D', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 2 }, { color: '#F7CA4D', width: 2 }], icon: COMPANY_ICON }
        } else if (graph.selectedNodes.has(node.id)) {
          style = { color: '#FFAF1D', stroke: [{ color: '#F7CA4D', width: 4 }, { color: '#FFF', width: 2 }, { color: '#F7CA4D', width: 2 }], icon: COMPANY_ICON }
        } else if (node.id === graph.hoverNode) {
          style = { color: '#FFAF1D', stroke: [{ color: '#CCC', width: 4 }], icon: COMPANY_ICON }
        } else {
          style = { color: '#FFAF1D', stroke: [{ color: '#F7CA4D', width: 4 }], icon: COMPANY_ICON }
        }
      }

      return { ...node, style }
    })
  }, [graph.nodes, graph.selectedNodes, graph.hoverNode])

  const styledEdges = useMemo(() => {
    return graph.edges.map((edge) => {
      return { ...edge, style: edge.id === graph.hoverEdge ? { width: 3 } : { width: 1 } }
    })
  }, [graph.edges, graph.hoverEdge])

  return (
    createElement(ReactResizeDetector, {},
      ({ width, height }: { width?: number, height?: number }) => (
        createElement('div', { style: { width: '100%', height: '100%' } }, (
          createElement(Selection, {
            onViewportPointerUp,
            onViewportDrag,
            onViewportPointerDown,
            onSelection,
            children: ({ select, toggleSelect, annotation, cursor, onViewportPointerDown, onViewportDrag, onViewportPointerUp }) => (
              createElement(Fragment, {},
                createElement('div', { style: { position: 'absolute', top: 72, left: 12 } },
                  createElement(Button, { selected: select, onClick: toggleSelect }, '●'),
                  createElement(Zoom, { onZoomIn, onZoomOut })
                ),
                createElement<Props<Node, Edge>>(Renderer, {
                  width,
                  height,
                  nodes: styledNodes,
                  edges: styledEdges,
                  annotations: annotation ? [annotation] : undefined,
                  x: graph.x,
                  y: graph.y,
                  zoom: graph.zoom,
                  minZoom: MIN_ZOOM,
                  maxZoom: MAX_ZOOM,
                  cursor,
                  onNodeDrag,
                  onNodePointerEnter,
                  onNodePointerLeave,
                  onEdgePointerEnter,
                  onEdgePointerLeave,
                  onNodeDoubleClick,
                  onViewportPointerDown,
                  onViewportDrag,
                  onViewportPointerUp,
                  onViewportWheel,
                  debug: { stats }
                })
              )
            )
          })
        ))
      )
    )
  )
}


render(
  createElement(App),
  document.querySelector('#graph')
)
