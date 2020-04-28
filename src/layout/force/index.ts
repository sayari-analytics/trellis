import { Simulation, LayoutResultEvent, TypedMessageEvent, RunEvent, UpdateEvent, LAYOUT_OPTIONS } from './simulation'
import { Node, PositionedNode, Edge } from '../../types'
import { noop } from '../../utils'


export type LayoutOptions = {
  nodeStrength: number
  linkDistance: number
  linkStrength?: number
  centerStrength: number
  nodePadding: number
  tick: number
}


export class ForceLayout<NodeProps extends object = any, EdgeProps extends object = any, NodeStyle extends object = any, EdgeStyle extends object = any>{

  worker: Worker
  dispose: () => void
  handler: (graph: { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge[] }) => void

  nodes: Node<NodeProps, NodeStyle>[] = []
  edges: Edge<EdgeProps,EdgeStyle>[] = []
  nodesById: { [id: string]: Node<NodeProps, NodeStyle> } = {}
  edgesById: { [id: string]: Edge<EdgeProps, EdgeStyle> } = {}
  positionedNodes: PositionedNode<NodeProps, NodeStyle>[] = []
  positionedNodesById: { [id: string]: PositionedNode<NodeProps, NodeStyle> } = {}
  private options: Partial<LayoutOptions> = {}
  private run = false

  constructor(handler: (graph: { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge[] }) => void = noop) {
    this.handler = handler
    const { worker, dispose } = Simulation()
    this.worker = worker
    this.dispose = dispose
    this.worker.onmessage = (event: TypedMessageEvent<LayoutResultEvent>) => {
      const positionedNodes: PositionedNode<NodeProps, NodeStyle>[] = []
      const positionedNodesById: { [id: string]: PositionedNode<NodeProps, NodeStyle> } = {}

      for (const node of event.data.nodes) {
        if (this.positionedNodesById[node.id]) {
          positionedNodes.push(node as PositionedNode<NodeProps, NodeStyle>)
          positionedNodesById[node.id] = node as PositionedNode<NodeProps, NodeStyle>
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
    nodes: Node[], edges: Edge[], options?: Partial<LayoutOptions>
  }) => {
    const nodesById: { [id: string]: Node } = {}
    const edgesById: { [id: string]: Edge } = {}
    const positionedNodes: PositionedNode<NodeProps, NodeStyle>[] = []
    const positionedNodesById: { [id: string]: PositionedNode<NodeProps, NodeStyle> } = {}
    const updateNodes: PositionedNode<NodeProps, NodeStyle>[] = []

    /**
     * run simulation on node enter/exit, node update radius/subGraph
     * update simulation on node move
     */
    if (nodes !== this.nodes) {
      for (const node of nodes) {
        if (this.nodesById[node.id] === undefined) {
          // node enter
          nodesById[node.id] = node
          const positionedNode = { ...node, x: node.x ?? 0, y: node.y ?? 0 } as PositionedNode<NodeProps, NodeStyle>
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
            radius: node.subGraph !== undefined ? this.positionedNodesById[node.id].radius : node.radius
          } as PositionedNode<NodeProps, NodeStyle>
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
    if (options !== this.options) { // TODO - shallow equals
      // update options
      this.options = options
      this.run = true
    }


    if (this.run) {
      this.worker.postMessage({ type: 'run', nodes: nodes, edges: edges, options } as RunEvent)
    } else if (updateNodes.length > 0) {
      this.worker.postMessage({ type: 'update', nodes: updateNodes } as UpdateEvent)
      this.handler({ nodes: this.positionedNodes, edges: this.edges })
    } else {
      this.handler({ nodes: this.positionedNodes, edges: this.edges })
    }


    this.run = false

    return this
  }
}



export const Layout = <NodeProps extends object = any, EdgeProps extends object = any, NodeStyle extends object = any, EdgeStyle extends object = any>(handler: (graph: { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge<EdgeProps, EdgeStyle>[] }) => void = noop) => {
  const forceLayout = new ForceLayout(handler)
  const apply = (graph: { nodes: Node[], edges: Edge[], options?: Partial<LayoutOptions> }) => forceLayout.apply(graph)
  apply.nodes = () => forceLayout.positionedNodes
  apply.edges = () => forceLayout.edges

  return apply
}

// TODO - simpler?
// export const Layout2 = <N extends Node, E extends Edge>(handler: (graph: { nodes: PositionedNode<NodeProps, NodeStyle>[], edges: Edge<EdgeProps, EdgeStyle>[] }) => void = noop) => {}
