import { FunctionComponent, useCallback, useEffect, useReducer } from 'react'
import * as Graph from '@trellis/index'
import { Trellis } from '@trellis/bindings/react/renderer'
import * as Renderer from '@trellis/renderers/webgl'

const sampleCoordinatePlane = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample) * step
  let i = 0

  for (let x = -(side / 2); x < side / 2; x += step) {
    for (let y = -(side / 2); y < side / 2; y += step) {
      if (i >= count) {
        return
      }

      if (Math.random() > sample) {
        i++
        yield [x, y]
      }
    }
  }
}

const PURPLE = '#7A5DC5'
const LIGHT_PURPLE = '#CAD'
const ARIAL_PINK = 'ArialPink'
const TEXT_ICON: Graph.TextIcon = {
  type: 'textIcon',
  content: 'T',
  style: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '400'
  }
}

const NODE_STYLE: Graph.NodeStyle = {
  color: PURPLE,
  stroke: [{ width: 2, color: LIGHT_PURPLE }],
  icon: TEXT_ICON,
  label: {
    position: 'bottom',
    fontName: ARIAL_PINK,
    fontFamily: 'Roboto',
    margin: 2
  }
}

const NODE_HOVER_STYLE: Graph.NodeStyle = {
  color: '#f66',
  stroke: [{ width: 2, color: '#fcc' }],
  label: { position: 'bottom', color: '#fcc' },
  icon: TEXT_ICON
}

const EDGE_STYLE: Graph.EdgeStyle = {
  width: 1,
  stroke: '#aaa',
  arrow: 'reverse'
}

const EDGE_HOVER_STYLE: Graph.EdgeStyle = {
  width: 2,
  stroke: '#f66',
  arrow: 'reverse'
}

type AppState = {
  nodes: Graph.Node[]
  edges: Graph.Edge[]
  x: number
  y: number
  zoom: number
}

type Action =
  | { type: 'SET_GRAPH'; nodes: Graph.Node[]; edges: Graph.Edge[] }
  | { type: 'VIEWPORT_DRAG'; dx: number; dy: number }
  | { type: 'VIEWPORT_WHEEL'; dx: number; dy: number; dz: number }
  | { type: 'NODE_POINTER_ENTER'; target: Graph.Node }
  | { type: 'NODE_DRAG'; target: Graph.Node; dx: number; dy: number }
  | { type: 'NODE_POINTER_LEAVE'; target: Graph.Node }
  | { type: 'EDGE_POINTER_ENTER'; target: Graph.Edge }
  | { type: 'EDGE_POINTER_LEAVE'; target: Graph.Edge }

const App: FunctionComponent = () => {
  const [state, dispatch] = useReducer(
    (state: AppState, action: Action) => {
      switch (action.type) {
        case 'SET_GRAPH': {
          return { ...state, nodes: action.nodes, edges: action.edges }
        }
        case 'VIEWPORT_DRAG': {
          return {
            ...state,
            x: state.x + action.dx,
            y: state.y + action.dy
            // nodes: state.nodes.map((node) => ({ ...node })),
            // edges: state.edges.map((edge) => ({ ...edge }))
          }
        }
        case 'VIEWPORT_WHEEL': {
          return { ...state, x: state.x + action.dx, y: state.y + action.dy, zoom: state.zoom + action.dz }
        }
        case 'NODE_POINTER_ENTER': {
          return {
            ...state,
            nodes: state.nodes.map((node) =>
              node.id === action.target.id ? { ...node, label: node.label + ' 北京', style: NODE_HOVER_STYLE } : node
            ),
            edges: state.edges.map((edge) =>
              edge.source === action.target.id || edge.target === action.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge
            )
          }
        }
        case 'NODE_DRAG': {
          return {
            ...state,
            nodes: state.nodes.map((node) =>
              node.id === action.target.id ? { ...node, x: (node.x ?? 0) + action.dx, y: (node.y ?? 0) + action.dy } : node
            )
          }
        }
        case 'NODE_POINTER_LEAVE': {
          return {
            ...state,
            nodes: state.nodes.map((node) =>
              node.id === action.target.id ? { ...node, label: node.label?.slice(0, node.label.length - 3), style: NODE_STYLE } : node
            ),
            edges: state.edges.map((edge) =>
              edge.source === action.target.id || edge.target === action.target.id ? { ...edge, style: EDGE_STYLE } : edge
            )
          }
        }
        case 'EDGE_POINTER_ENTER': {
          return {
            ...state,
            edges: state.edges.map((edge) => (edge.id === action.target.id ? { ...edge, style: EDGE_HOVER_STYLE } : edge))
          }
        }
        case 'EDGE_POINTER_LEAVE': {
          return { ...state, edges: state.edges.map((edge) => (edge.id === action.target.id ? { ...edge, style: EDGE_STYLE } : edge)) }
        }
        default: {
          return state
        }
      }
    },
    { nodes: [], edges: [], x: 0, y: 0, zoom: 1 }
  )

  useEffect(() => {
    // simulate network request for data
    const timeout = setTimeout(() => {
      const nodes: Graph.Node[] = []
      const edges: Graph.Edge[] = []
      const step = 50
      const coordinates: Record<number, Set<number>> = {}

      for (const [_x, _y] of sampleCoordinatePlane(40000, step, 0.5)) {
        const x = Math.round(_x)
        const y = Math.round(_y)
        nodes.push({ id: `${x}|${y}`, x: _x, y: _y, radius: 10, label: `${x}|${y}`, style: NODE_STYLE })

        if (coordinates[x] === undefined) {
          coordinates[x] = new Set()
        }
        coordinates[x].add(y)

        for (const adjacentX of [x - step, x]) {
          for (const adjacentY of [y - step, y, y + step]) {
            if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
              edges.push({
                id: `${x}|${y}|${adjacentX}|${adjacentY}`,
                source: `${x}|${y}`,
                target: `${adjacentX}|${adjacentY}`,
                style: EDGE_STYLE
              })
            }
          }
        }
      }

      dispatch({ type: 'SET_GRAPH', nodes, edges })
    }, 2000)

    return () => clearTimeout(timeout)
  }, [])

  const onViewportDrag = useCallback(
    (event: Renderer.ViewportDragEvent | Renderer.ViewportDragDecelerateEvent) => {
      dispatch({ type: 'VIEWPORT_DRAG', dx: event.dx, dy: event.dy })
    },
    [dispatch]
  )

  const onViewportWheel = useCallback(
    (event: Renderer.ViewportWheelEvent) => {
      dispatch({ type: 'VIEWPORT_WHEEL', dx: event.dx, dy: event.dy, dz: event.dz })
    },
    [dispatch]
  )

  const onNodePointerEnter = useCallback(
    (event: Renderer.NodePointerEvent) => {
      dispatch({ type: 'NODE_POINTER_ENTER', target: event.target })
    },
    [dispatch]
  )

  const onNodeDrag = useCallback(
    (event: Renderer.NodeDragEvent) => {
      dispatch({ type: 'NODE_DRAG', target: event.target, dx: event.dx, dy: event.dy })
    },
    [dispatch]
  )

  const onNodePointerLeave = useCallback(
    (event: Renderer.NodePointerEvent) => {
      dispatch({ type: 'NODE_POINTER_LEAVE', target: event.target })
    },
    [dispatch]
  )

  const onEdgePointerEnter = useCallback(
    (event: Renderer.EdgePointerEvent) => {
      dispatch({ type: 'EDGE_POINTER_ENTER', target: event.target })
    },
    [dispatch]
  )

  const onEdgePointerLeave = useCallback(
    (event: Renderer.EdgePointerEvent) => {
      dispatch({ type: 'EDGE_POINTER_LEAVE', target: event.target })
    },
    [dispatch]
  )

  return (
    <Trellis
      nodes={state.nodes}
      edges={state.edges}
      x={state.x}
      y={state.y}
      zoom={state.zoom}
      minZoom={0.025}
      width={1700}
      height={940}
      debug={true}
      onViewportDrag={onViewportDrag}
      onViewportWheel={onViewportWheel}
      onNodePointerEnter={onNodePointerEnter}
      onNodeDrag={onNodeDrag}
      onNodePointerLeave={onNodePointerLeave}
      onEdgePointerEnter={onEdgePointerEnter}
      onEdgePointerLeave={onEdgePointerLeave}
    />
  )
}

export default App
