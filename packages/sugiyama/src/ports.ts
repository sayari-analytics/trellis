import type { EdgeRef, NodeRef } from '@sayari/trellis'
import type { LayeredGraph } from './layered'

export type PortOptions = {
  enabled: boolean
  degreeThreshold: number
  spacing: number
}

export type PortGroup = {
  node: NodeRef
  incoming: EdgeRef[]
  outgoing: EdgeRef[]
}

// Phase 4: port grouping widens high-degree nodes so incident edges share stable anchor bands.
export const applyPortGroups = (layered: LayeredGraph, options: PortOptions): PortGroup[] => {
  if (!options.enabled) return []

  const edgeRefsByNode: { incoming: EdgeRef[]; outgoing: EdgeRef[] }[] = []
  for (const node of layered.nodes) edgeRefsByNode[node.ref] = { incoming: [], outgoing: [] }
  for (const edge of layered.edges) {
    edgeRefsByNode[edge.target]?.incoming.push(edge.originalEdgeRef)
    edgeRefsByNode[edge.source]?.outgoing.push(edge.originalEdgeRef)
  }

  const groups: PortGroup[] = []
  for (const node of layered.nodes) {
    if (node.dummy || node.originalRef === undefined) continue
    const { incoming, outgoing } = edgeRefsByNode[node.ref] ?? { incoming: [], outgoing: [] }
    if (incoming.length + outgoing.length < options.degreeThreshold) continue
    groups.push({ node: node.originalRef, incoming, outgoing })
  }

  for (const group of groups) {
    const node = layered.nodeByRef[group.node]
    if (node === undefined) continue
    node.breadth += Math.min(40, Math.max(group.incoming.length, group.outgoing.length) * options.spacing * 0.1)
  }

  return groups
}
