import type { Id, Node, Edge } from '@sayari/trellis'

/**
 * Connected components of an (undirected) graph.
 *
 * Edges are treated as undirected, so this finds weakly-connected components — the standard "which nodes
 * are reachable from one another" partition. Implemented with a union-find (disjoint-set) structure with
 * path compression + union by size, so it runs in near-linear O(n + e·α(n)) time and scales to the large
 * generated graphs. Isolated nodes form their own singleton component; an edge that references a node not
 * present in `nodes` is ignored (consistent with the generators' tolerance of dangling endpoints).
 *
 * Takes the same `{ nodes, edges }` shape the generators produce and GraphState consumes, and reports
 * results keyed by node id.
 */
export type ConnectedComponents = {
  count: number // number of components
  componentByNode: Map<Id, number> // node id -> its component index in [0, count)
  components: Id[][] // component index -> the node ids it contains
}

export const connectedComponents = <N extends Node, E extends Edge>({ nodes, edges }: { nodes: N[]; edges: E[] }): ConnectedComponents => {
  // dense index per node id, so the union-find can use flat typed arrays
  const indexById = new Map<Id, number>()
  for (let i = 0; i < nodes.length; i++) indexById.set(nodes[i].id, i)

  const parent = new Int32Array(nodes.length)
  const size = new Int32Array(nodes.length)
  for (let i = 0; i < nodes.length; i++) {
    parent[i] = i
    size[i] = 1
  }

  const find = (x: number): number => {
    let root = x
    while (parent[root] !== root) root = parent[root]
    while (parent[x] !== root) {
      // path compression: point every node on the way up directly at the root
      const next = parent[x]
      parent[x] = root
      x = next
    }
    return root
  }

  const union = (a: number, b: number) => {
    let ra = find(a)
    let rb = find(b)
    if (ra === rb) return
    if (size[ra] < size[rb]) {
      const t = ra
      ra = rb
      rb = t
    }
    parent[rb] = ra // attach the smaller tree under the larger
    size[ra] += size[rb]
  }

  for (const edge of edges) {
    const a = indexById.get(edge.source)
    const b = indexById.get(edge.target)
    if (a === undefined || b === undefined) continue // endpoint not in the node set — skip
    union(a, b)
  }

  // assign each root a dense component label, then bucket node ids by it
  const labelByRoot = new Map<number, number>()
  const components: Id[][] = []
  const componentByNode = new Map<Id, number>()
  for (let i = 0; i < nodes.length; i++) {
    const root = find(i)
    let label = labelByRoot.get(root)
    if (label === undefined) {
      label = components.length
      labelByRoot.set(root, label)
      components.push([])
    }
    components[label].push(nodes[i].id)
    componentByNode.set(nodes[i].id, label)
  }

  return { count: components.length, componentByNode, components }
}

/**
 * Split a graph into one independent subgraph per connected component, preserving the original node and
 * edge objects (referenced, not cloned). Each edge lands in its endpoints' component; edges with an
 * endpoint outside `nodes` are dropped (same tolerance as `connectedComponents`).
 *
 * This is the bridge between `connectedComponents` and the layouts + `packComponents` (see ./packing):
 * split a graph, lay out each subgraph independently (cheaper and more compact than laying out the whole
 * disconnected graph at once), then pack the results back into a single non-overlapping scene.
 */
export const subgraphs = <N extends Node, E extends Edge>({ nodes, edges }: { nodes: N[]; edges: E[] }): { nodes: N[]; edges: E[] }[] => {
  const { count, componentByNode } = connectedComponents({ nodes, edges })
  const result: { nodes: N[]; edges: E[] }[] = Array.from({ length: count }, () => ({ nodes: [], edges: [] }))
  for (const node of nodes) result[componentByNode.get(node.id)!].nodes.push(node)
  for (const edge of edges) {
    const component = componentByNode.get(edge.source)
    if (component === undefined || component !== componentByNode.get(edge.target)) continue
    result[component].edges.push(edge)
  }
  return result
}
