import { Simulation, LayoutResultEvent, TypedMessageEvent, RunEvent, UpdateEvent, LAYOUT_OPTIONS } from './simulation'
import { Node, Edge, PositionNode } from '../../types'
import { noop } from '../../utils'


export type LayoutOptions = {
  nodeStrength: number
  linkDistance: number
  linkStrength?: number
  centerStrength: number
  nodePadding: number
  tick: number
}


const optionsEqual = (a: Partial<LayoutOptions>, b: Partial<LayoutOptions>) => {
  return a.nodeStrength === b.nodeStrength && a.linkDistance === b.linkDistance && a.linkStrength === b.linkStrength &&
    a.centerStrength === b.centerStrength && a.nodePadding === b.nodePadding && a.tick === b.tick
}


/**
 * TODO - how to simplify?  purpose: diff current graph against previous graph, rerunning simulation if certain cases are met
 * - do we need to always lookup by id?  instead, assume stable node/edge order and lookup by index?  then, only need to maintain: nodes, edges, positionedNodes
 * - make diff generic
 */
export class ForceLayout<N extends Node<E>, E extends Edge>{

  worker: Worker
  dispose: () => void
  handler: (graph: { nodes: PositionNode<N, E>[], edges: E[] }) => void

  nodes: N[] = []
  edges: E[] = []
  nodesById: { [id: string]: N } = {}
  edgesById: { [id: string]: E } = {}
  positionedNodes: PositionNode<N, E>[] = []
  positionedNodesById: { [id: string]: PositionNode<N, E> } = {}
  private options: Partial<LayoutOptions> = {}
  private run = false

  constructor(handler: (graph: { nodes: PositionNode<N, E>[], edges: E[] }) => void = noop) {
    this.handler = handler
    const { worker, dispose } = Simulation()
    this.worker = worker
    this.dispose = dispose
    this.worker.onmessage = (event: TypedMessageEvent<LayoutResultEvent<PositionNode<N, E>, E>>) => {
      const positionedNodes: PositionNode<N, E>[] = []
      const positionedNodesById: { [id: string]: PositionNode<N, E> } = {}

      for (const node of event.data.nodes) {
        if (this.positionedNodesById[node.id]) {
          positionedNodes.push(node)
          positionedNodesById[node.id] = node
        }
      }

      this.positionedNodes = positionedNodes
      this.positionedNodesById = positionedNodesById

      this.handler({ nodes: positionedNodes, edges: this.edges })
    }
  }

  apply = ({
    nodes, edges, options = LAYOUT_OPTIONS
  }: {
    nodes: N[], edges: E[], options?: Partial<LayoutOptions>
  }) => {
    const nodesById: { [id: string]: N } = {}
    const edgesById: { [id: string]: E } = {}
    const positionedNodes: PositionNode<N, E>[] = []
    const positionedNodesById: { [id: string]: PositionNode<N, E> } = {}
    const updateNodes: PositionNode<N, E>[] = []

    /**
     * run simulation on node enter/exit, node update radius/subGraph
     * update simulation on node move
     */
    if (nodes !== this.nodes) {
      for (const node of nodes) {
        if (this.nodesById[node.id] === undefined) {
          // node enter [and subgraph enter]
          nodesById[node.id] = node
          const positionedNode = { ...node, x: node.x ?? 0, y: node.y ?? 0 }
          positionedNodes.push(positionedNode)
          positionedNodesById[node.id] = positionedNode
          this.run = true
        } else if (this.nodesById[node.id] !== node) {
          // node update
          nodesById[node.id] = node
          const positionedNode = {
            ...node,
            x: node.x ?? this.positionedNodesById[node.id].x,
            y: node.y ?? this.positionedNodesById[node.id].y,
            radius: node.subGraph !== undefined ? this.positionedNodesById[node.id].radius : node.radius,
          }

          // TODO - make recursive (currently doesn't handle subgraphs at depth > 1)
          if (node.subGraph) {
            if (node.subGraph !== this.nodesById[node.id].subGraph) {
              // subgraph update
              positionedNode.subGraph = { nodes: [], edges: node.subGraph.edges }
              for (let i = 0; i < node.subGraph.nodes.length; i++) {
                const subnode = node.subGraph.nodes[i]
                const prevSubnode = this.positionedNodesById[node.id].subGraph?.nodes[i]

                positionedNode.subGraph?.nodes.push({
                  ...subnode,
                  x: subnode.x ?? prevSubnode?.x,
                  y: subnode.y ?? prevSubnode?.y,
                })

                if (subnode.radius !== prevSubnode?.radius || subnode.subGraph !== prevSubnode.subGraph) {
                  this.run = true
                } else if (subnode.x !== prevSubnode.x || subnode.y !== prevSubnode.y) {
                  // TODO - track parent ids.  otherwise, won't be found
                  updateNodes.push(positionedNode)
                }
              }
            } else {
              positionedNode.subGraph = this.positionedNodesById[node.id].subGraph
            }
          }
          // subgraph exit [noop]

          positionedNodes.push(positionedNode)
          positionedNodesById[node.id] = positionedNode

          /**
           * TODO - if subGraphs have changed, but nothing else has, then rather than rerunning the entire simulation,
           * could instead just rerun the subGraph repositioning: more efficient and less disruptive
           */
          if (node.radius !== this.nodesById[node.id].radius || node.subGraph !== this.nodesById[node.id].subGraph) {
            this.run = true
          } else if (node.x !== this.nodesById[node.id].x || node.y !== this.nodesById[node.id].y) {
            updateNodes.push(positionedNode)
          }
        } else {
          nodesById[node.id] = node
          const positionedNode = this.positionedNodesById[node.id]
          positionedNodes.push(positionedNode)
          positionedNodesById[node.id] = positionedNode
        }
      }

      /**
       * TODO - if ((number of node updates) < this.nodes.length) { this.run = true }
       */
      for (const nodeId in this.nodesById) {
        if (nodesById[nodeId] === undefined) {
          // node exit
          this.run = true
        }
      }

      this.nodes = nodes
      this.nodesById = nodesById
      this.positionedNodes = positionedNodes
      this.positionedNodesById = positionedNodesById
    }

    /**
     * run simulation on edge enter/exit
     */
    if (edges !== this.edges) {
      for (const edge of edges) {
        edgesById[edge.id] = edge
        if (this.edgesById[edge.id] === undefined) {
          // edge enter
          this.run = true
        }
        // no edge update
      }

      /**
       * TODO - if ((number of edge updates) < this.edge.length) { this.run = true }
       */
      for (const edgeId in this.edgesById) {
        if (edgesById[edgeId] === undefined) {
          // edge exit
          this.run = true
        }
      }

      this.edges = edges
      this.edgesById = edgesById
    }

    /**
     * run simulation on options update
     */
    if (!optionsEqual(options, this.options)) {
      // update options
      this.options = options
      this.run = true
    }


    if (this.run) {
      this.worker.postMessage({ type: 'run', nodes: nodes, edges: edges, options } as RunEvent<N, E>)
    } else if (updateNodes.length > 0) {
      this.worker.postMessage({ type: 'update', nodes: updateNodes } as UpdateEvent<PositionNode<N, E>, E>)
      this.handler({ nodes: this.positionedNodes, edges: this.edges })
    } else {
      this.handler({ nodes: this.positionedNodes, edges: this.edges })
    }


    this.run = false

    return this
  }
}


export const Layout = <N extends Node<E>, E extends Edge>(handler: (graph: { nodes: PositionNode<N, E>[], edges: E[] }) => void = noop) => {
  const forceLayout = new ForceLayout<N, E>(handler)

  const apply = (graph: { nodes: N[], edges: E[], options?: Partial<LayoutOptions> }) => forceLayout.apply(graph)
  apply.nodes = () => forceLayout.positionedNodes
  apply.edges = () => forceLayout.edges

  return apply
}
