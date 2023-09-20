import { createElement, FunctionComponent, useState, useCallback, useEffect, Fragment, useMemo } from 'react'
import { render } from 'react-dom'
import ReactResizeDetector from 'react-resize-detector'
import Stats from 'stats.js'
import graphData from '../../data/tmp-data'
import * as Trellis from '../../src'

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

type Node = Trellis.Node & { type: string }
type Edge = Trellis.Edge

const SUBGRAPH_STYLE: Trellis.NodeStyle = {
  color: '#FFAF1D',
  stroke: [{ color: '#F7CA4D', width: 4 }],
  icon: {
    type: 'textIcon' as const,
    family: 'Material Icons',
    text: 'business',
    color: '#fff',
    size: 22
  }
}
const PERSON_ICON = {
  type: 'textIcon' as const,
  family: 'Material Icons',
  text: 'person',
  color: '#fff',
  size: 22
}
const COMPANY_ICON = {
  type: 'textIcon' as const,
  family: 'Material Icons',
  text: 'business',
  color: '#fff',
  size: 22
}
const arabicLabel = 'مدالله بن علي\nبن سهل الخالدي'
const thaiLabel = 'บริษัท ไทยยูเนียนรับเบอร์\nจำกัด'
const russianLabel = 'ВИКТОР ФЕЛИКСОВИЧ ВЕКСЕЛЬБЕРГ'
const data = {
  nodes: Object.values(graphData.nodes)
    .map((node, idx) => ({
      ...node,
      label: idx % 4 === 0 ? arabicLabel : idx % 4 === 1 ? thaiLabel : idx % 4 === 2 ? russianLabel : node.label
    }))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_2` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_3` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_4` })))
    .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_5` })))
    // .concat(Object.values(graphData.nodes).map((node) => ({ ...node, id: `${node.id}_6` })))
    .map<Node>(({ id, label, type }) => ({
      id,
      label,
      radius: 18,
      type
    })),
  edges: Object.entries<{ field: string; source: string; target: string }>(graphData.edges)
    .concat(
      Object.entries(graphData.edges).map(([id, edge]) => [`${id}_2`, { ...edge, source: `${edge.source}_2`, target: `${edge.target}_2` }])
    )
    .concat(
      Object.entries(graphData.edges).map(([id, edge]) => [`${id}_3`, { ...edge, source: `${edge.source}_3`, target: `${edge.target}_3` }])
    )
    .concat(
      Object.entries(graphData.edges).map(([id, edge]) => [`${id}_4`, { ...edge, source: `${edge.source}_4`, target: `${edge.target}_4` }])
    )
    // .concat(Object.entries(graphData.edges).map(([id, edge]) => [`${id}_5`, { ...edge, source: `${edge.source}_5`, target: `${edge.target}_5` }]))
    .concat([
      [
        'connect_a',
        {
          field: 'related_to',
          source: Object.values(graphData.nodes)[0].id,
          target: `${Object.values(graphData.nodes)[0].id}_2`
        }
      ],
      [
        'connect_d',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[15].id}`,
          target: `${Object.values(graphData.nodes)[15].id}_2`
        }
      ],
      [
        'connect_g',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[30].id}`,
          target: `${Object.values(graphData.nodes)[30].id}_2`
        }
      ],
      [
        'connect_b',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[5].id}_2`,
          target: `${Object.values(graphData.nodes)[5].id}_3`
        }
      ],
      [
        'connect_e',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[20].id}_2`,
          target: `${Object.values(graphData.nodes)[20].id}_3`
        }
      ],
      [
        'connect_h',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[35].id}_2`,
          target: `${Object.values(graphData.nodes)[35].id}_3`
        }
      ],
      [
        'connect_c',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[10].id}_3`,
          target: `${Object.values(graphData.nodes)[10].id}_4`
        }
      ],
      [
        'connect_f',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[25].id}_3`,
          target: `${Object.values(graphData.nodes)[25].id}_4`
        }
      ],
      [
        'connect_i',
        {
          field: 'related_to',
          source: `${Object.values(graphData.nodes)[40].id}_3`,
          target: `${Object.values(graphData.nodes)[40].id}_4`
        }
      ]
    ])
    .map<Trellis.Edge>(([id, { field, source, target }]) => ({
      id,
      source,
      target,
      label: field.replace(/_/g, ' ')
    }))
}

const force = Trellis.Force.Layout()
const cluster = Trellis.Cluster.Layout()
const fisheye = Trellis.Fisheye.Layout()
const MIN_ZOOM = 0.1
const MAX_ZOOM = 2.5

/**
 * Render React Layout and Renderer Components
 */
const App: FunctionComponent = () => {
  const [graph, setGraph] = useState<{
    nodes: Node[]
    edges: Edge[]
    x: number
    y: number
    zoom: number
    selected: Set<string>
    hoverNode?: string
    hoverEdge?: string
  }>({
    nodes: [],
    edges: [],
    x: 0,
    y: 0,
    zoom: 1,
    selected: new Set()
  })

  useEffect(() => {
    force({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => setGraph((graph) => ({ ...graph, nodes, edges })))
  }, [])

  const onZoomIn = useCallback(() => {
    setGraph((graph) => ({ ...graph, zoom: Trellis.clampZoom(MIN_ZOOM, MAX_ZOOM, graph.zoom / 0.6) }))
  }, [])
  const onZoomOut = useCallback(() => {
    setGraph((graph) => ({ ...graph, zoom: Trellis.clampZoom(MIN_ZOOM, MAX_ZOOM, graph.zoom * 0.6) }))
  }, [])
  const onNodePointerEnter = useCallback(({ target: { id } }: Trellis.NodePointerEvent) => {
    setGraph((graph) => ({ ...graph, hoverNode: id }))
  }, [])
  const onNodePointerLeave = useCallback(() => {
    setGraph((graph) => ({ ...graph, hoverNode: undefined }))
  }, [])
  const onNodeDrag = useCallback(({ nodeX, nodeY, target: { id, x = 0, y = 0 } }: Trellis.NodeDragEvent) => {
    const dx = nodeX - x
    const dy = nodeY - y

    setGraph((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === id
          ? { ...node, x: nodeX, y: nodeY }
          : graph.selected.has(node.id)
          ? { ...node, x: (node.x ?? 0) + dx, y: (node.y ?? 0) + dy }
          : node
      )
    }))
  }, [])
  const onNodePointerUp = useCallback(({ metaKey, shiftKey, target: { id } }: Trellis.NodePointerEvent) => {
    setGraph((graph) => ({
      ...graph,
      selected:
        graph.selected.has(id) && (metaKey || shiftKey)
          ? new Set(Array.from(graph.selected).filter((node) => node !== id))
          : metaKey || shiftKey
          ? new Set([...graph.selected, id])
          : new Set<string>([id])
    }))
  }, [])
  const onNodeDragStart = useCallback(({ metaKey, shiftKey, target: { id } }) => {
    setGraph((graph) => ({
      ...graph,
      selected:
        !graph.selected.has(id) && (metaKey || shiftKey)
          ? new Set([...graph.selected, id])
          : !graph.selected.has(id)
          ? new Set([id])
          : graph.selected
    }))
  }, [])
  const onNodeDoubleClick = useCallback(({ target }: Trellis.NodePointerEvent) => {
    const subgraphNodes = cluster(
      (target.subgraph?.nodes ?? []).concat([
        {
          id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 1}`,
          radius: 18,
          label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 1}`,
          style: SUBGRAPH_STYLE
        },
        {
          id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 2}`,
          radius: 18,
          label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 2}`,
          style: SUBGRAPH_STYLE
        },
        {
          id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 3}`,
          radius: 18,
          label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 3}`,
          style: SUBGRAPH_STYLE
        },
        {
          id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 4}`,
          radius: 18,
          label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 4}`,
          style: SUBGRAPH_STYLE
        },
        {
          id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 5}`,
          radius: 18,
          label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 5}`,
          style: SUBGRAPH_STYLE
        },
        {
          id: `${target.id}_${(target.subgraph?.nodes.length ?? 0) + 6}`,
          radius: 18,
          label: `${target.id.toUpperCase()} ${target.subgraph?.nodes.length ?? 0 + 6}`,
          style: SUBGRAPH_STYLE
        }
      ])
    )
    const radius =
      subgraphNodes
        .map(({ x = 0, y = 0, radius }) => Trellis.distance(x, y, 0, 0) + radius)
        .reduce((maxDistance, distance) => Math.max(maxDistance, distance), target.radius) + 20

    setGraph((graph) => ({
      ...graph,
      nodes: fisheye(
        graph.nodes,
        graph.nodes.map((node) =>
          node.id === target.id
            ? {
                ...node,
                radius,
                subgraph: { nodes: subgraphNodes, edges: [] }
              }
            : node
        )
      )
    }))
  }, [])
  const onEdgePointerEnter = useCallback(({ target: { id } }: Trellis.EdgePointerEvent) => {
    setGraph((graph) => ({ ...graph, hoverEdge: id }))
  }, [])
  const onEdgePointerLeave = useCallback(() => {
    setGraph((graph) => ({ ...graph, hoverEdge: undefined }))
  }, [])
  const onViewportPointerUp = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      nodes: fisheye(
        graph.nodes,
        graph.nodes.map((node) => ({
          ...node,
          radius: 18,
          subgraph: undefined
        }))
      ),
      selected: new Set()
    }))
  }, [])
  const onViewportDrag = useCallback(({ viewportX: x, viewportY: y }: Trellis.ViewportDragEvent | Trellis.ViewportDragDecelerateEvent) => {
    setGraph((graph) => ({ ...graph, x, y }))
  }, [])
  const onViewportWheel = useCallback(({ viewportX: x, viewportY: y, viewportZoom: zoom }: Trellis.ViewportWheelEvent) => {
    setGraph((graph) => ({ ...graph, x, y, zoom }))
  }, [])
  const onSelection = useCallback(({ selection, shiftKey, metaKey }: Trellis.ReactSelectionChangeEvent) => {
    setGraph((graph) => ({
      ...graph,
      selected: shiftKey || metaKey ? new Set([...graph.selected, ...selection]) : selection
    }))
  }, [])

  const styledNodes = useMemo(() => {
    return graph.nodes.map((node) => {
      let style: Trellis.NodeStyle

      if (node.subgraph !== undefined) {
        if (graph.selected.has(node.id) && node.id === graph.hoverNode) {
          style = {
            color: '#EFEFEF',
            stroke: [
              { color: '#AAA', width: 4 },
              { color: '#FFF', width: 2 },
              { color: '#CCC', width: 2 }
            ]
          }
        } else if (graph.selected.has(node.id)) {
          style = {
            color: '#EFEFEF',
            stroke: [
              { color: '#CCC', width: 4 },
              { color: '#FFF', width: 2 },
              { color: '#CCC', width: 2 }
            ]
          }
        } else if (node.id === graph.hoverNode) {
          style = {
            color: '#EFEFEF',
            stroke: [
              { color: '#AAA', width: 4 },
              { color: '#FFF', width: 4 }
            ]
          }
        } else {
          style = {
            color: '#EFEFEF',
            stroke: [
              { color: '#CCC', width: 4 },
              { color: '#FFF', width: 4 }
            ]
          }
        }
      } else if (node.type === 'person') {
        if (graph.selected.has(node.id) && node.id === graph.hoverNode) {
          style = {
            color: '#7CBBF3',
            stroke: [
              { color: '#CCC', width: 4 },
              { color: '#FFF', width: 2 },
              { color: '#7CBBF3', width: 2 }
            ],
            icon: PERSON_ICON
          }
        } else if (graph.selected.has(node.id)) {
          style = {
            color: '#7CBBF3',
            stroke: [
              { color: '#90D7FB', width: 4 },
              { color: '#FFF', width: 2 },
              { color: '#7CBBF3', width: 2 }
            ],
            icon: PERSON_ICON
          }
        } else if (node.id === graph.hoverNode) {
          style = {
            color: '#7CBBF3',
            stroke: [
              { color: '#CCC', width: 4 },
              { color: '#FFF', width: 4 }
            ],
            icon: PERSON_ICON
          }
        } else {
          style = {
            color: '#7CBBF3',
            stroke: [
              { color: '#90D7FB', width: 4 },
              { color: '#FFF', width: 4 }
            ],
            icon: PERSON_ICON
          }
        }
      } else {
        if (graph.selected.has(node.id) && node.id === graph.hoverNode) {
          style = {
            color: '#FFAF1D',
            stroke: [
              { color: '#CCC', width: 4 },
              { color: '#FFF', width: 2 },
              { color: '#F7CA4D', width: 2 }
            ],
            icon: COMPANY_ICON
          }
        } else if (graph.selected.has(node.id)) {
          style = {
            color: '#FFAF1D',
            stroke: [
              { color: '#F7CA4D', width: 4 },
              { color: '#FFF', width: 2 },
              { color: '#F7CA4D', width: 2 }
            ],
            icon: COMPANY_ICON
          }
        } else if (node.id === graph.hoverNode) {
          style = {
            color: '#FFAF1D',
            stroke: [
              { color: '#CCC', width: 4 },
              { color: '#FFF', width: 4 }
            ],
            icon: COMPANY_ICON
          }
        } else {
          style = {
            color: '#FFAF1D',
            stroke: [
              { color: '#F7CA4D', width: 4 },
              { color: '#FFF', width: 4 }
            ],
            icon: COMPANY_ICON
          }
        }
      }

      return { ...node, style }
    })
  }, [graph.nodes, graph.selected, graph.hoverNode])

  const styledEdges = useMemo(() => {
    return graph.edges.map<Trellis.Edge>((edge) => ({
      ...edge,
      style: edge.id === graph.hoverEdge ? { width: 3, arrow: 'forward' as const } : { width: 1, arrow: 'forward' as const }
    }))
  }, [graph.edges, graph.hoverEdge])

  return createElement(ReactResizeDetector, {}, ({ width, height }: { width?: number; height?: number }) =>
    createElement(
      'div',
      { style: { width: '100%', height: '100%' } },
      createElement(Trellis.ReactSelection, {
        nodes: styledNodes,
        onViewportDrag,
        onSelection,
        children: ({ select, toggleSelect, annotation, cursor, onViewportDragStart, onViewportDrag, onViewportDragEnd }) =>
          createElement(
            Fragment,
            {},
            createElement(
              'div',
              { style: { position: 'absolute', top: 72, left: 12 } },
              createElement(Trellis.ReactButton, { title: 'Select Tool', selected: select, onClick: toggleSelect }, '■'),
              createElement(Trellis.ReactZoom, { onZoomIn, onZoomOut })
            ),
            createElement(Trellis.ReactRenderer, {
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
              onNodeDragStart,
              onNodeDrag,
              onNodeDoubleClick,
              onNodePointerLeave,
              onEdgePointerEnter,
              onEdgePointerLeave,
              onViewportDragStart,
              onViewportDrag,
              onViewportDragEnd,
              onViewportPointerUp,
              onViewportWheel,
              debug: { stats }
            })
          )
      })
    )
  )
}

render(createElement(App), document.querySelector('#graph'))
