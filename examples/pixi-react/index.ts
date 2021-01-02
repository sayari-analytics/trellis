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


const SUBGRAPH_STYLE: WebGL.NodeStyle = {
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 4 }],
  icon: { type: 'textIcon' as const, family: 'Material Icons', text: 'business', color: '#fff', size: 22 }
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
  const onNodePointerEnter = useCallback(({ target: { id } }: WebGL.NodePointerEvent) => {
    setGraph((graph) => ({ ...graph, hoverNode: id }))
  }, [])
  const onNodePointerLeave = useCallback(() => {
    setGraph((graph) => ({ ...graph, hoverNode: undefined }))
  }, [])
  const onNodeDrag = useCallback(({ nodeX, nodeY, target: { id, x = 0, y = 0 } }: WebGL.NodeDragEvent) => {
    const dx = nodeX - x
    const dy = nodeY - y

    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (
        node.id === id ? (
          { ...node, x: nodeX, y: nodeY }
        ) : graph.selectedNodes.has(node.id) ? (
          { ...node, x: (node.x ?? 0) + dx, y: (node.y ?? 0) + dy }
        ) : node
      )),
      selectedNodes: new Set([...graph.selectedNodes, id]),
    }))
  }, [])
  const onNodePointerUp = useCallback(({ metaKey, shiftKey, target: { id } }: WebGL.NodePointerEvent) => {
    setGraph((graph) => ({
      ...graph,
      selectedNodes: metaKey || shiftKey && graph.selectedNodes.has(id) ? (
        new Set(Array.from(graph.selectedNodes).filter((node) => node !== id))
      ) : metaKey || shiftKey ? (
        new Set([...graph.selectedNodes, id])
      ) : new Set<string>(id),
    }))
  }, [])
  const onNodeDoubleClick = useCallback(({ target }: WebGL.NodePointerEvent) => {
    const subgraphNodes = cluster((target.subgraph?.nodes ?? []).concat([
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 1}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 1}`, style: SUBGRAPH_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 2}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 2}`, style: SUBGRAPH_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 3}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 3}`, style: SUBGRAPH_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 4}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 4}`, style: SUBGRAPH_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 5}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 5}`, style: SUBGRAPH_STYLE },
      { id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 6}`, radius: 18, label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 6}`, style: SUBGRAPH_STYLE },
    ]))
    const radius = Subgraph.subgraphRadius(target.radius, subgraphNodes) + 20

    setGraph((graph) => ({
      ...graph,
      nodes: subgraph(
        graph.nodes,
        graph.nodes.map((node) => node.id === target.id ? {
          ...node,
          radius,
          subgraph: { nodes: subgraphNodes, edges: [] }
        } : node)
      )
    }))
  }, [])
  const onEdgePointerEnter = useCallback(({ target: { id } }: WebGL.EdgePointerEvent) => {
    setGraph((graph) => ({ ...graph, hoverEdge: id }))
  }, [])
  const onEdgePointerLeave = useCallback(() => {
    setGraph((graph) => ({ ...graph, hoverEdge: undefined }))
  }, [])
  const onViewportPointerUp = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      nodes: subgraph(
        graph.nodes,
        graph.nodes.map((node) => ({
          ...node,
          radius: 18,
          subgraph: undefined,
        }))
      ),
      selectedNodes: new Set()
    }))
  }, [])
  const onViewportDrag = useCallback(({ viewportX: x, viewportY: y }: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    setGraph((graph) => ({ ...graph, x, y }))
  }, [])
  const onViewportWheel = useCallback(({ viewportX: x, viewportY: y, viewportZoom: zoom }: WebGL.ViewportWheelEvent) => {
    setGraph((graph) => ({ ...graph, x, y, zoom }))
  }, [])
  const onSelection = useCallback(({ x, y, radius, metaKey, shiftKey }: SelectionChangeEvent) => {
    /**
     * TODO - move selection logic inside Selection component
     * - when shrinking selection area while holding shift/cmd, nodes no longer w/i selection radius should not be selected
     * - maybe move multiselect node move logic to Selection component as well?
     */
    setGraph((graph) => ({
      ...graph,
      selectedNodes: graph.nodes
        .filter((node) => Math.hypot((node.x ?? 0) - x, (node.y ?? 0) - y) <= radius)
        .reduce((selectedNodes, node) => {
          selectedNodes.add(node.id)
          return selectedNodes
        }, metaKey || shiftKey ? new Set(graph.selectedNodes) : new Set<string>())
    }))
  }, [])

  const styledNodes = useMemo(() => {
    return graph.nodes.map((node) => {
      let style: WebGL.NodeStyle

      if (node.subgraph !== undefined) {
        if (graph.selectedNodes.has(node.id) && node.id === graph.hoverNode) {
          style = { color: '#EFEFEF', stroke: [{ color: '#AAA', width: 4 }, { color: '#FFF', width: 2 }, { color: '#CCC', width: 2 }] }
        } else if (graph.selectedNodes.has(node.id)) {
          style = { color: '#EFEFEF', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 2 }, { color: '#CCC', width: 2 }] }
        } else if (node.id === graph.hoverNode) {
          style = { color: '#EFEFEF', stroke: [{ color: '#AAA', width: 4 }, { color: '#FFF', width: 4 }] }
        } else {
          style = { color: '#EFEFEF', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 4 }] }
        }
      } else if (node.type === 'person') {
        if (graph.selectedNodes.has(node.id) && node.id === graph.hoverNode) {
          style = { color: '#7CBBF3', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 2 }, { color: '#7CBBF3', width: 2 }], icon: PERSON_ICON }
        } else if (graph.selectedNodes.has(node.id)) {
          style = { color: '#7CBBF3', stroke: [{ color: '#90D7FB', width: 4 }, { color: '#FFF', width: 2 }, { color: '#7CBBF3', width: 2 }], icon: PERSON_ICON }
        } else if (node.id === graph.hoverNode) {
          style = { color: '#7CBBF3', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 4 }], icon: PERSON_ICON }
        } else {
          style = { color: '#7CBBF3', stroke: [{ color: '#90D7FB', width: 4 }, { color: '#FFF', width: 4 }], icon: PERSON_ICON }
        }
      } else {
        if (graph.selectedNodes.has(node.id) && node.id === graph.hoverNode) {
          style = { color: '#FFAF1D', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 2 }, { color: '#F7CA4D', width: 2 }], icon: COMPANY_ICON }
        } else if (graph.selectedNodes.has(node.id)) {
          style = { color: '#FFAF1D', stroke: [{ color: '#F7CA4D', width: 4 }, { color: '#FFF', width: 2 }, { color: '#F7CA4D', width: 2 }], icon: COMPANY_ICON }
        } else if (node.id === graph.hoverNode) {
          style = { color: '#FFAF1D', stroke: [{ color: '#CCC', width: 4 }, { color: '#FFF', width: 4 }], icon: COMPANY_ICON }
        } else {
          style = { color: '#FFAF1D', stroke: [{ color: '#F7CA4D', width: 4 }, { color: '#FFF', width: 4 }], icon: COMPANY_ICON }
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
            onViewportDrag,
            onSelection,
            children: ({ select, toggleSelect, annotation, cursor, onViewportPointerDown, onViewportDrag, onViewportDragEnd }) => (
              createElement(Fragment, {},
                createElement('div', { style: { position: 'absolute', top: 72, left: 12 } },
                  createElement(Button, { title: 'Select Tool', selected: select, onClick: toggleSelect }, '●'),
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
                  onNodePointerEnter,
                  onNodePointerUp,
                  onNodeDrag,
                  onNodeDoubleClick,
                  onNodePointerLeave,
                  onEdgePointerEnter,
                  onEdgePointerLeave,
                  onViewportPointerDown,
                  onViewportDrag,
                  onViewportDragEnd,
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
