import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import FontFaceObserver from 'fontfaceobserver'
import { RendererOptions, RendererLayoutOptions } from '../options'
import { PositionedNode, PositionedEdge } from '../../index'
import { animationFrameLoop, noop } from '../../utils'
import { NodeContainer } from './nodeContainer'
import { EdgeContainer } from './edgeContainer'


new FontFaceObserver('Material Icons').load()
export const POSITION_ANIMATION_DURATION = 800


export class Renderer {

  width: number
  height: number
  debug: RendererOptions['debug']
  hoveredNode?: string
  clickedNode?: string
  dirty = false
  renderTime = Date.now()
  animationDuration = 0
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  nodesById: { [id: string]: NodeContainer } = {}
  edgesById: { [id: string]: EdgeContainer } = {}
  forwardEdgeIndex: { [source: string]: { [target: string]: Set<string> } } = {}
  reverseEdgeIndex: { [target: string]: { [source: string]: Set<string> } } = {}

  onNodePointerEnter: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodePointerDown: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodeDrag: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodePointerUp: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodePointerLeave: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onNodeDoubleClick: (event: PIXI.interaction.InteractionEvent, node: PositionedNode, x: number, y: number) => void
  onEdgePointerEnter: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerDown: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerUp: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void
  onEdgePointerLeave: (event: PIXI.interaction.InteractionEvent, edge: PositionedEdge, x: number, y: number) => void

  app: PIXI.Application
  viewport: Viewport

  constructor({
    container, width = 800, height = 600, debug,
    onNodePointerEnter = noop, onNodePointerDown = noop, onNodeDrag = noop, onNodePointerUp = noop, onNodePointerLeave = noop, onNodeDoubleClick = noop,
    onEdgePointerEnter = noop, onEdgePointerDown = noop, onEdgePointerUp = noop, onEdgePointerLeave = noop,
    onContainerPointerEnter, onContainerPointerDown, onContainerPointerMove, onContainerPointerUp, onContainerPointerLeave,
  }: RendererOptions) {
    this.width = width
    this.height = height
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
    this.debug = debug

    if (!(container instanceof HTMLCanvasElement)) {
      throw new Error('container must be an instance of HTMLCanvasElement')
    }

    /**
     * TODO - max out render performance, even on machines w/o dedicated GPU
     * just twist all the knobs...
     */
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

    if (onContainerPointerEnter) {
      this.app.view.onpointerenter = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerPointerEnter(e)
        }
      }
    }
    if (onContainerPointerDown) {
      this.app.view.onpointerdown = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerPointerDown(e)
        }
      }
    }
    if (onContainerPointerMove) {
      this.app.view.onpointermove = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerPointerMove(e)
        }
      }
    }
    if (onContainerPointerUp) {
      this.app.view.onpointerup = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerPointerUp(e)
        }
      }
    }
    if (onContainerPointerLeave) {
      this.app.view.onpointerleave = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerPointerLeave(e)
        }
      }
    }

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

    this.app.view.addEventListener('wheel', (event) => { event.preventDefault() })

    animationFrameLoop(this.debug ? this.debugRender : this.render)

    this.viewport.width
  }

  /**
   * TODO - handle case where layout is called while previous layout is still being interpolated
   * current approach essentially cancels previous layout and runs a new one
   * maybe instead stage new one, overwriting stagged layout if new layouts are called, and don't run until previous interpolation is done
   */
  layout = ({ nodes, edges, options }: {
    nodes: PositionedNode[],
    edges: PositionedEdge[],
    options?: RendererLayoutOptions
  }) => {
    if (
      (options?.width !== undefined && options.width !== this.width) ||
      (options?.height !== undefined && options.height !== this.height)
    ) {
      this.width = options.width ?? this.width
      this.height = options.height ?? this.height
      this.app.renderer.resize(this.width, this.height)
    }

    this.animationDuration = 0
    const nodesById: { [id: string]: NodeContainer } = {}
    const edgesById: { [id: string]: EdgeContainer } = {}


    /**
     * Build edge indices
     * TODO - is it possible to build edge indices and enter/update/exit edge containers in one pass?
     */
    for (const edge of edges) {
      const id = edge.id,
        source = edge.source.id,
        target = edge.target.id

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


    /**
     * Ndge enter/update/exit
     */
    for (const node of nodes) {
      if (this.nodesById[node.id] === undefined) {
        // node enter
        if (this.reverseEdgeIndex[node.id]) {
          // nodes w edges from existing nodes enter from one of those nodes
          const adjacentNode = this.nodesById[Object.keys(this.reverseEdgeIndex[node.id])[0]]
          nodesById[node.id] = adjacentNode === undefined ?
            new NodeContainer(this, node, 0, 0) :
            new NodeContainer(this, node, adjacentNode.x, adjacentNode.y)
        } else if (this.forwardEdgeIndex[node.id]) {
          // nodes w edges to existing nodes enter from one of those nodes
          const adjacentNode = this.nodesById[Object.keys(this.forwardEdgeIndex[node.id])[0]]
          nodesById[node.id] = adjacentNode === undefined ?
            new NodeContainer(this, node, 0, 0) :
            new NodeContainer(this, node, adjacentNode.x, adjacentNode.y)
        } else {
          // nodes w/o edges to an existing node enter from origin
          nodesById[node.id] = new NodeContainer(this, node, 0, 0)
        }
        this.dirty = true
      } else {
        // node update
        nodesById[node.id] = this.nodesById[node.id].set(node)
        this.dirty = true
      }
    }

    for (const nodeId in this.nodesById) {
      if (nodesById[nodeId] === undefined) {
        // node exit
        this.nodesById[nodeId].delete()
        this.dirty = true
      }
    }


    /**
     * Edge enter/update/exit
     */
    for (const edge of edges) {
      const id = edge.id
      if (this.edgesById[id] === undefined) {
        // edge enter
        edgesById[id] = new EdgeContainer(this, this.edgesLayer).set(edge)
        this.dirty = true
      } else {
        // edge update
        edgesById[id] = this.edgesById[id].set(edge)
        this.dirty = true
      }
    }

    for (const edgeId in this.edgesById) {
      if (edgesById[edgeId] === undefined) {
        // edge exit
        this.edgesById[edgeId].delete()
        this.dirty = true
      }
    }


    this.nodesById = nodesById
    this.edgesById = edgesById
  }

  private render = () => {
    const now = Date.now()
    // this.animationDuration += Math.min(16, Math.max(0, now - this.renderTime))
    this.animationDuration += now - this.renderTime
    this.renderTime = now

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }

      this.dirty = this.animationDuration < POSITION_ANIMATION_DURATION
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
    this.renderTime = now

    if (this.dirty) {
      this.debug?.logRenderTime && console.time('update data')
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }

      this.dirty = this.animationDuration < POSITION_ANIMATION_DURATION
      this.viewport.dirty = false
      this.debug?.logRenderTime && console.timeEnd('update data')
      this.debug?.logRenderTime && console.time('render data change')
      this.app.render()
      this.debug?.logRenderTime && console.timeEnd('render data change')
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      this.debug?.logRenderTime && console.time('render viewport change')
      this.app.render()
      this.debug?.logRenderTime && console.timeEnd('render viewport change')
    }
  }
}


export const PixiRenderer = (options: RendererOptions) => new Renderer(options)
