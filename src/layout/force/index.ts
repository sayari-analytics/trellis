import { Simulation, LayoutResultEvent, TypedMessageEvent, RunEvent, UpdateEvent, DEFAULT_SIMULATION_OPTIONS } from './simulation'
import { NodeStyle, EdgeStyle } from '../../renderers/options'
import { noop } from '../../utils'


// TODO - move these to types, as they're shared across renderers and layouts
export type Node = {
  id: string
  radius: number
  x?: number
  y?: number
  label?: string
  style?: Partial<NodeStyle>
  subGraph?: {
    nodes: Node[],
    edges: Edge[],
    options?: Partial<LayoutOptions>
  }
}
export type Edge = {
  id: string
  label?: string
  source: string
  target: string
  style?: Partial<EdgeStyle>
}

export type PositionedNode = {
  id: string
  radius: number
  x: number
  y: number
  label?: string
  style?: Partial<NodeStyle>
  subGraph?: {
    nodes: PositionedNode[],
    edges: Edge[],
    options?: Partial<LayoutOptions>
  }
}

export type LayoutOptions = {
  nodeStrength: number
  linkDistance: number
  linkStrength?: number
  centerStrength: number
  nodePadding: number
  tick: number
}


export class Layout {

  worker: Worker
  dispose: () => void
  handler: (graph: { nodes: PositionedNode[], edges: Edge[] }) => void

  private nodes: Node[] = []
  private edges: Edge[] = []
  private nodesById: { [id: string]: Node } = {}
  private edgesById: { [id: string]: Edge } = {}
  private positionedNodes: PositionedNode[] = []
  private positionedNodesById: { [id: string]: PositionedNode } = {}
  private options: Partial<LayoutOptions> = {}
  private run = false

  constructor(handler: (graph: { nodes: PositionedNode[], edges: Edge[] }) => void = noop) {
    this.handler = handler
    const { worker, dispose } = Simulation()
    this.worker = worker
    this.dispose = dispose
    this.worker.onmessage = (event: TypedMessageEvent<LayoutResultEvent>) => {
      for (let node of event.data.nodes) {
        // TODO - is it safe to mutate node?  or should this be an immutable update?  does layout need to depend on diffing update nodes by equality?
        this.positionedNodesById[node.id].x = node.x
        this.positionedNodesById[node.id].y = node.y
        this.positionedNodesById[node.id].radius = node.radius
        this.positionedNodesById[node.id].subGraph = node.subGraph
      }
      this.handler({ nodes: this.positionedNodes, edges: this.edges })
    }
  }

  layout = ({
    nodes,
    edges,
    options = DEFAULT_SIMULATION_OPTIONS
  }: {
    nodes: Node[],
    edges: Edge[],
    options?: Partial<LayoutOptions>
  }) => {
    const nodesById: { [id: string]: Node } = {}
    const edgesById: { [id: string]: Edge } = {}
    const positionedNodes: PositionedNode[] = []
    const positionedNodesById: { [id: string]: PositionedNode } = {}
    const updateNodes: PositionedNode[] = []

    /**
     * run simulation on node enter/exit, node update radius/subGraph
     * update simulation on node move
     */
    if (nodes !== this.nodes) {
      for (const node of nodes) {
        if (this.nodesById[node.id] === undefined) {
          // node enter
          nodesById[node.id] = node
          const positionedNode = { ...node, x: node.x ?? 0, y: node.y ?? 0 } as PositionedNode
          positionedNodes.push(positionedNode)
          positionedNodesById[node.id] = positionedNode
          this.run = true
        } else if (this.nodesById[node.id] !== node) {
          // node update
          nodesById[node.id] = node
          const positionedNode = { ...node, x: node.x ?? this.positionedNodesById[node.id].x, y: node.y ?? this.positionedNodesById[node.id].y } as PositionedNode
          positionedNodes.push(positionedNode)
          positionedNodesById[node.id] = positionedNode

          /**
           * TODO - if subGraphs have changed, but nothing else has, then rather than rerunning the entire simulation,
           * could instead just rerun the subGraph repositioning
           * more efficient and less disruptive
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
