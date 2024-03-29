import { TWO_PI } from '../renderers/webgl/utils'
import type { Node, Annotation, Edge, Bounds, Viewport, Dimensions } from '../types'

export const getSelectionBounds = (elements: (Node | Annotation)[], padding: number = 0): Bounds => {
  let left = 0
  let top = 0
  let right = 0
  let bottom = 0

  for (const el of elements) {
    if ('radius' in el) {
      const elementLeft = (el.x ?? 0) - el.radius
      const elementTop = (el.y ?? 0) - el.radius
      const elementRight = (el.x ?? 0) + el.radius
      const elementBottom = (el.y ?? 0) + el.radius
      if (elementLeft < left) left = elementLeft
      if (elementTop < top) top = elementTop
      if (elementRight > right) right = elementRight
      if (elementBottom > bottom) bottom = elementBottom
    } else if ('width' in el && 'height' in el) {
      const elementLeft = el.x ?? 0
      const elementTop = el.y ?? 0
      const elementRight = (el.x ?? 0) + el.width
      const elementBottom = (el.x ?? 0) + el.height
      if (elementLeft < left) left = elementLeft
      if (elementTop < top) top = elementTop
      if (elementRight > right) right = elementRight
      if (elementBottom > bottom) bottom = elementBottom
    }
  }

  return {
    left: left - padding,
    top: top - padding,
    right: right + padding,
    bottom: bottom + padding
  }
}

export const mergeBounds = (a: Bounds, b: Bounds, padding: number = 0): Bounds => {
  return {
    left: Math.min(a.left, b.left) - padding,
    top: Math.min(a.top, b.top) - padding,
    right: Math.max(a.right, b.right) + padding,
    bottom: Math.max(a.bottom, b.bottom) + padding
  }
}

export const viewportToBounds = ({ x, y, zoom }: Viewport, { width, height }: Dimensions): Bounds => {
  const xOffset = width / 2 / zoom
  const yOffset = height / 2 / zoom
  return {
    left: -(x + xOffset),
    top: -(y + yOffset),
    right: -(x - xOffset),
    bottom: -(y - yOffset)
  }
}

export const boundsToViewport = ({ left, top, right, bottom }: Bounds, { width, height }: Dimensions): Viewport => {
  const targetWidth = right - left
  const targetHeight = bottom - top
  const x = targetWidth / 2 - right
  const y = targetHeight / 2 - bottom

  if (targetWidth / targetHeight > width / height) {
    // fit to width
    return { x, y, zoom: width / targetWidth }
  } else {
    // fit to height
    return { x, y, zoom: height / targetHeight }
  }
}

export const boundsToDimensions = ({ left, top, right, bottom }: Bounds, zoom: number): Dimensions => {
  return {
    width: (right - left) / zoom,
    height: (bottom - top) / zoom
  }
}

export const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value))

export const equals = <T>(a: T, b: T) => {
  if (a === b) {
    return true
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i])) {
        return false
      }
    }

    return true
  } else if (typeof a === 'object' && typeof b === 'object') {
    if (Object.keys(a ?? {}).length !== Object.keys(b ?? {}).length) {
      return false
    }

    for (const key in a) {
      if (!equals(a[key], b?.[key])) {
        return false
      }
    }

    return true
  }

  return false
}

export const connectedComponents = <N extends Node, E extends Edge>(graph: { nodes: N[]; edges: E[] }): { nodes: N[]; edges: E[] }[] => {
  const adjacencyList: Record<string, Record<string, E[]>> = Object.create(null)
  const nodes: Record<string, N> = {}
  const visited = new Set<string>()
  const components: { nodes: Record<string, N>; edges: Record<string, E> }[] = []

  for (const edge of graph.edges) {
    if (adjacencyList[edge.source] === undefined) {
      adjacencyList[edge.source] = {}
    }
    if (adjacencyList[edge.source][edge.target] === undefined) {
      adjacencyList[edge.source][edge.target] = []
    }
    if (adjacencyList[edge.target] === undefined) {
      adjacencyList[edge.target] = {}
    }
    if (adjacencyList[edge.target][edge.source] === undefined) {
      adjacencyList[edge.target][edge.source] = []
    }

    adjacencyList[edge.source][edge.target].push(edge)
    adjacencyList[edge.target][edge.source].push(edge)
  }

  for (const node of graph.nodes) {
    nodes[node.id] = node
  }

  for (const { id } of graph.nodes) {
    if (visited.has(id)) {
      continue
    }

    visited.add(id)
    const toVisit = [id]
    const component: { nodes: Record<string, N>; edges: Record<string, E> } = {
      nodes: { [id]: nodes[id] },
      edges: {}
    }

    while (toVisit.length > 0) {
      const next = adjacencyList[toVisit.pop()!]
      if (next === undefined) {
        continue
      }

      for (const [adjacentNode, edges] of Object.entries(next)) {
        for (const edge of edges) {
          component.edges[edge.id] = edge
        }
        component.nodes[adjacentNode] = nodes[adjacentNode]

        if (!visited.has(adjacentNode)) {
          toVisit.push(adjacentNode)
          visited.add(adjacentNode)
        }
      }
    }

    components.push(component)
  }

  return components.map(({ nodes, edges }) => ({
    nodes: Object.values(nodes),
    edges: Object.values(edges)
  }))
}

export function* bfs<N extends Node, E extends Edge>(
  predicate: (node: N) => boolean,
  graph: { nodes: N[]; edges: E[] }
): Generator<N, void, void> {
  const adjacencyList: Record<string, string[]> = Object.create(null)
  const nodes: Record<string, N> = {}
  const visited = new Set<string>()
  const queue = [graph.nodes[0].id]

  for (const edge of graph.edges) {
    if (adjacencyList[edge.source] === undefined) {
      adjacencyList[edge.source] = []
    }
    if (adjacencyList[edge.target] === undefined) {
      adjacencyList[edge.target] = []
    }

    adjacencyList[edge.source].push(edge.target)
    adjacencyList[edge.target].push(edge.source)
  }

  for (const node of graph.nodes) {
    nodes[node.id] = node
  }

  while (queue.length > 0) {
    const node = queue.shift()!

    if (visited.has(node)) {
      continue
    }

    visited.add(node)

    if (predicate(nodes[node])) {
      yield nodes[node]
    }

    if (adjacencyList[node]) {
      for (const adjacentNode of adjacencyList[node]) {
        if (!visited.has(adjacentNode)) {
          queue.push(adjacentNode)
        }
      }
    }
  }
}

export const distance = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0)

export const angle = (x0: number, y0: number, x1: number, y1: number) => {
  const angle = Math.atan2(y0 - y1, x0 - x1)
  return angle < 0 ? angle + TWO_PI : angle
}
