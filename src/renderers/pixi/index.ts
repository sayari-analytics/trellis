import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import FontFaceObserver from 'fontfaceobserver'
import { PositionedNode, Edge as PositionedEdge } from '../../types'
import { animationFrameLoop, noop } from '../../utils'
import { Node } from './node'
import { Edge } from './edge'


export type Event = PIXI.interaction.InteractionEvent

export type NodeStyle = {
  strokeWidth: number
  fill: string
  stroke: string
  fillOpacity: number
  strokeOpacity: number
  icon?: string
}

export type EdgeStyle = {
  width: number
  stroke: string
  strokeOpacity: number
}

export type RendererOptions = {
  width: number
  height: number
  onNodePointerEnter: (event: Event, node: PositionedNode, x: number, y: number) => void
  onNodePointerDown: (event: Event, node: PositionedNode, x: number, y: number) => void
  onNodeDrag: (event: Event, node: PositionedNode, x: number, y: number) => void
  onNodePointerUp: (event: Event, node: PositionedNode, x: number, y: number) => void
  onNodePointerLeave: (event: Event, node: PositionedNode, x: number, y: number) => void
  onNodeDoubleClick: (event: Event, node: PositionedNode, x: number, y: number) => void
  onEdgePointerEnter: (event: Event, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerDown: (event: Event, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerUp: (event: Event, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerLeave: (event: Event, edge: PositionedEdge, x: number, y: number) => void
  onContainerPointerEnter: (event: PointerEvent) => void
  onContainerPointerDown: (event: PointerEvent) => void
  onContainerPointerMove: (event: PointerEvent) => void
  onContainerPointerUp: (event: PointerEvent) => void
  onContainerPointerLeave: (event: PointerEvent) => void
}


export const RENDERER_OPTIONS: RendererOptions = {
  width: 800, height: 600,
  onNodePointerEnter: noop, onNodePointerDown: noop, onNodeDrag: noop, onNodePointerUp: noop, onNodePointerLeave: noop, onNodeDoubleClick: noop,
  onEdgePointerEnter: noop, onEdgePointerDown: noop, onEdgePointerUp: noop, onEdgePointerLeave: noop,
  onContainerPointerEnter: noop, onContainerPointerDown: noop, onContainerPointerMove: noop, onContainerPointerUp: noop, onContainerPointerLeave: noop,
}

new FontFaceObserver('Material Icons').load()

const POSITION_ANIMATION_DURATION = 800

PIXI.utils.skipHello()


export class PIXIRenderer<NodeProps extends object = any, EdgeProps extends object = any>{

  hoveredNode?: Node
  clickedNode?: Node
  dirty = false
  renderTime = Date.now()
  animationDuration = 0
  animationPercent = 0
  restartAnimation = false
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  nodes: PositionedNode<NodeProps, Partial<NodeStyle>>[] | undefined
  edges: PositionedEdge<EdgeProps, Partial<EdgeStyle>>[] | undefined
  nodesById: { [id: string]: Node } = {}
  edgesById: { [id: string]: Edge } = {}
  forwardEdgeIndex: { [source: string]: { [target: string]: Set<string> } } = {}
  reverseEdgeIndex: { [target: string]: { [source: string]: Set<string> } } = {}

  onNodePointerEnter: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void = noop
  onNodePointerDown: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void = noop
  onNodeDrag: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void = noop
  onNodePointerUp: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void = noop
  onNodePointerLeave: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void = noop
  onNodeDoubleClick: (event: Event, node: PositionedNode<NodeProps, Partial<NodeStyle>>, x: number, y: number) => void = noop
  onEdgePointerEnter: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void = noop
  onEdgePointerDown: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void = noop
  onEdgePointerUp: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void = noop
  onEdgePointerLeave: (event: Event, edge: PositionedEdge<EdgeProps, Partial<EdgeStyle>>, x: number, y: number) => void = noop
  width = RENDERER_OPTIONS.width
  height = RENDERER_OPTIONS.height
  app: PIXI.Application
  viewport: Viewport
  debug: { logPerformance?: boolean, stats?: Stats }

  constructor({ container, debug = {} }: { container: HTMLCanvasElement, debug?: { logPerformance?: boolean, stats?: Stats } }) {
    if (!(container instanceof HTMLCanvasElement)) {
      throw new Error('container must be an instance of HTMLCanvasElement')
    }

    this.debug = debug

    this.app = new PIXI.Application({
      view: container,
      width: this.width,
      height: this.height,
      resolution: window.devicePixelRatio,
      transparent: true,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      powerPreference: 'high-performance',
    })

    this.labelsLayer.interactiveChildren = false
    this.nodesLayer.sortableChildren = true // TODO - perf test

    this.viewport = new Viewport({
      interaction: this.app.renderer.plugins.interaction
    })
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clampZoom({ minScale: 0.02, maxScale: 2.5 })
      .setZoom(0.6, true)
      .on('drag-start', () => container.style.cursor = 'move')
      .on('drag-end', () => container.style.cursor = 'auto')
    this.viewport.center = new PIXI.Point(0, 0)
    this.viewport.addChild(this.edgesLayer)
    this.viewport.addChild(this.nodesLayer)
    this.viewport.addChild(this.labelsLayer)
    this.viewport.addChild(this.frontNodeLayer)
    this.viewport.addChild(this.frontLabelLayer)
    this.app.stage.addChild(this.viewport)

    // this.nodesLayer.addChild(
    //   new PIXI.Graphics().lineStyle(1, 0x666666).moveTo(-10000, 0).lineTo(10000, 0).endFill(),
    //   new PIXI.Graphics().lineStyle(1, 0x666666).moveTo(0, -10000).lineTo(0, 10000).endFill()
    // )

    this.app.view.addEventListener('wheel', (event) => { event.preventDefault() })

    animationFrameLoop(this.debug ? this.debugRender : this.render)
  }

  /**
   * TODO
   * - handle case where apply is called while previous apply is still being interpolated
   * current approach essentially cancels previous apply and runs a new one
   * maybe instead stage new one, overwriting stagged apply if new applys are called, and don't run until previous interpolation is done
   * - do a better job diffing against existing nodes/edges/options
   */
  apply = ({
    nodes,
    edges,
    options: {
      width = RENDERER_OPTIONS.width, height = RENDERER_OPTIONS.height,
      onNodePointerEnter = noop, onNodePointerDown = noop, onNodeDrag = noop, onNodePointerUp = noop, onNodePointerLeave = noop, onNodeDoubleClick = noop,
      onEdgePointerEnter = noop, onEdgePointerDown = noop, onEdgePointerUp = noop, onEdgePointerLeave = noop,
      onContainerPointerEnter = noop, onContainerPointerDown = noop, onContainerPointerMove = noop, onContainerPointerUp = noop, onContainerPointerLeave = noop,
    } = RENDERER_OPTIONS
  }: { nodes: PositionedNode<NodeProps, Partial<NodeStyle>>[], edges: PositionedEdge<EdgeProps, Partial<EdgeStyle>>[], options?: Partial<RendererOptions> }) => {
    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.app.renderer.resize(width, height)
    }

    // TODO - these shouldn't fire on edge hover or click either
    this.app.view.onpointerenter = (e) => this.hoveredNode === undefined && this.clickedNode === undefined && onContainerPointerEnter(e)
    this.app.view.onpointerdown = (e) => this.hoveredNode === undefined && this.clickedNode === undefined && onContainerPointerDown(e)
    this.app.view.onpointermove = (e) => this.hoveredNode === undefined && this.clickedNode === undefined && onContainerPointerMove(e)
    this.app.view.onpointerup = (e) => this.hoveredNode === undefined && this.clickedNode === undefined && onContainerPointerUp(e)
    this.app.view.onpointerleave = (e) => this.hoveredNode === undefined && this.clickedNode === undefined && onContainerPointerLeave(e)
    this.onNodePointerEnter = onNodePointerEnter
    this.onNodePointerDown = onNodePointerDown
    this.onNodeDrag = onNodeDrag
    this.onNodePointerUp = onNodePointerUp
    this.onNodePointerLeave = onNodePointerLeave
    this.onNodeDoubleClick = onNodeDoubleClick
    this.onEdgePointerEnter = onEdgePointerEnter
    this.onEdgePointerDown = onEdgePointerDown
    this.onEdgePointerUp = onEdgePointerUp
    this.onEdgePointerLeave = onEdgePointerLeave


    /**
     * restart animation whenever a new layout is calculated: nodes/edges are added/removed from graph, subGraph is added/removed from graph
     */
    this.restartAnimation = false
    const nodesById: { [id: string]: Node } = {}
    const edgesById: { [id: string]: Edge } = {}


    /**
     * Build edge indices
     * TODO - is it possible to build edge indices and enter/update/exit edge containers in one pass?
     */
    if (edges !== this.edges) {
      for (const edge of edges) {
        const id = edge.id,
          source = edge.source,
          target = edge.target

        if (this.forwardEdgeIndex[source] === undefined) {
          this.forwardEdgeIndex[source] = {}
        }
        if (this.forwardEdgeIndex[source][target] === undefined) {
          this.forwardEdgeIndex[source][target] = new Set()
        }
        this.forwardEdgeIndex[source][target].add(id)

        if (this.reverseEdgeIndex[target] === undefined) {
          this.reverseEdgeIndex[target] = {}
        }
        if (this.reverseEdgeIndex[target][source] === undefined) {
          this.reverseEdgeIndex[target][source] = new Set()
        }
        this.reverseEdgeIndex[target][source].add(id)
      }
    }


    /**
     * Ndge enter/update/exit
     */
    if (nodes !== this.nodes) {
      for (const node of nodes) {
        if (this.nodesById[node.id] === undefined) {
          // node enter
          this.dirty = true
          this.restartAnimation = true
          let adjacentNode: Node | undefined

          if (this.reverseEdgeIndex[node.id]) {
            // nodes w edges from existing nodes enter from one of those nodes
            adjacentNode = this.nodesById[Object.keys(this.reverseEdgeIndex[node.id])[0]]
          } else if (this.forwardEdgeIndex[node.id]) {
            // nodes w edges to existing nodes enter from one of those nodes
            adjacentNode = this.nodesById[Object.keys(this.forwardEdgeIndex[node.id])[0]]
          }

          nodesById[node.id] = new Node(this, node, adjacentNode?.x ?? 0, adjacentNode?.y ?? 0)
        } else { // TODO - if node can't be mutated, only set node if (node !== this.nodesById[node.id].node)
          // node update
          /**
           * TODO - unclear whether or not node can get mutated by layout
           */
          this.dirty = true
          if (node.subGraph !== this.nodesById[node.id].node.subGraph || node.radius !== this.nodesById[node.id].node.radius) {
            this.restartAnimation = true
          }

          nodesById[node.id] = this.nodesById[node.id].set(node)
        }
      }

      for (const nodeId in this.nodesById) {
        if (nodesById[nodeId] === undefined) {
          // node exit
          this.dirty = true
          this.restartAnimation = true
          this.nodesById[nodeId].delete()
        }
      }

      this.nodesById = nodesById
      this.nodes = nodes
    }


    /**
     * Edge enter/update/exit
     */
    if (edges !== this.edges) {
      for (const edge of edges) {
        const id = edge.id
        if (this.edgesById[id] === undefined) {
          // edge enter
          this.dirty = true
          this.restartAnimation = true
          edgesById[id] = new Edge(this, this.edgesLayer).set(edge)
        } else if (edge !== this.edgesById[id].edge) {
          // edge update
          this.dirty = true
          edgesById[id] = this.edgesById[id].set(edge)
        } else {
          this.dirty = true
          edgesById[id] = this.edgesById[id].set(edge)
        }
      }

      for (const edgeId in this.edgesById) {
        if (edgesById[edgeId] === undefined) {
          // edge exit
          this.dirty = true
          this.restartAnimation = true
          this.edgesById[edgeId].delete()
        }
      }

      this.edgesById = edgesById
      this.edges = edges
    }


    if (this.restartAnimation) {
      this.restartAnimation = false
      this.animationDuration = 0
      this.animationPercent = 0
    }
  }

  private render = () => {
    const now = Date.now()
    // this.animationDuration += Math.min(16, Math.max(0, now - this.renderTime)) // clamp to 0 <= x <= 16 to make animations appear slower and smoother
    this.animationDuration += now - this.renderTime
    this.animationPercent = Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1)
    this.renderTime = now

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }

      this.dirty = this.animationPercent < 1
      this.viewport.dirty = false
      this.app.render()
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      this.app.render()
    }
  }

  private debugRender = () => {
    this.debug?.stats?.update()

    const now = Date.now()
    // this.animationDuration += Math.min(16, Math.max(0, now - this.renderTime))
    this.animationDuration += now - this.renderTime
    this.animationPercent = Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1)
    this.renderTime = now

    if (this.dirty) {
      performance.mark('update')
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }
      performance.measure('update', 'update')

      this.dirty = this.animationPercent < 1
      this.viewport.dirty = false

      performance.mark('render')
      this.app.render()
      performance.measure('render', 'render')
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      performance.mark('render')
      this.app.render()
      performance.measure('render', 'render')
    }

    const measurements = performance.getEntriesByType('measure')

    if (this.debug?.logPerformance && measurements.length === 1) {
      const total = measurements[0].duration
      console.log(
        `%c${total.toFixed(2)}ms %c(update: 0.00, render: ${measurements[0].duration.toFixed(2)})`,
        `color: ${total < 17 ? '#6c6' : total < 25 ? '#f88' : total < 40 ? '#e22' : '#a00'}`,
        'color: #666'
      )
    } else if (this.debug?.logPerformance && measurements.length === 2) {
      const total = measurements[0].duration + measurements[1].duration
      console.log(
        `%c${total.toFixed(2)}ms %c(${measurements.map(({ name, duration }) => `${name}: ${duration.toFixed(2)}`).join(', ')}}`,
        `color: ${total < 17 ? '#6c6' : total < 25 ? '#f88' : total < 40 ? '#e22' : '#a00'}`,
        'color: #666'
      )
    }

    performance.clearMarks()
    performance.clearMeasures()
  }
}


export const Renderer = <NodeProps extends object = {}, EdgeProps extends object = {}>(options: { container: HTMLCanvasElement, debug?: { logPerformance?: boolean, stats?: Stats } }) => {
  const pixiRenderer = new PIXIRenderer(options)
  const apply = (graph: { nodes: PositionedNode<NodeProps, Partial<NodeStyle>>[], edges: PositionedEdge<EdgeProps, Partial<EdgeStyle>>[], options?: Partial<RendererOptions> }) => pixiRenderer.apply(graph)
  apply.nodes = () => pixiRenderer.nodes
  apply.edges = () => pixiRenderer.edges

  return apply
}
