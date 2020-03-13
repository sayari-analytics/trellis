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

  onNodeMouseEnter?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseDown?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeDrag?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseUp?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseLeave?: (node: PositionedNode, details: { x: number, y: number }) => void
  onEdgeMouseEnter?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseDown?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseUp?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseLeave?: (node: PositionedEdge, details: { x: number, y: number }) => void

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

  app: PIXI.Application
  viewport: Viewport

  constructor({
    id, width = 800, height = 600, debug,
    onNodeMouseEnter = noop, onNodeMouseDown = noop, onNodeDrag = noop, onNodeMouseUp = noop, onNodeMouseLeave = noop,
    onEdgeMouseEnter = noop, onEdgeMouseDown = noop, onEdgeMouseUp = noop, onEdgeMouseLeave = noop,
    onContainerMouseEnter, onContainerMouseDown, onContainerMouseMove, onContainerMouseUp, onContainerMouseLeave,
  }: RendererOptions) {
    this.width = width
    this.height = height
    this.onNodeMouseEnter = onNodeMouseEnter
    this.onNodeMouseDown = onNodeMouseDown
    this.onNodeDrag = onNodeDrag
    this.onNodeMouseUp = onNodeMouseUp
    this.onNodeMouseLeave = onNodeMouseLeave
    this.onEdgeMouseEnter = onEdgeMouseEnter
    this.onEdgeMouseDown = onEdgeMouseDown
    this.onEdgeMouseUp = onEdgeMouseUp
    this.onEdgeMouseLeave = onEdgeMouseLeave
    this.debug = debug

    const container = document.getElementById(id)
    if (container === null) {
      throw new Error(`Element #${id} not found`)
    }

    /**
     * TODO - max out render performance, even on machines w/o dedicated GPU
     * just twist all the knobs...
     */
    this.app = new PIXI.Application({
      width: this.width,
      height: this.height,
      resolution: window.devicePixelRatio,
      transparent: true,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      powerPreference: 'high-performance',
    })

    if (onContainerMouseEnter) {
      this.app.view.onmouseenter = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerMouseEnter({ x: e.x, y: e.y })
        }
      }
    }
    if (onContainerMouseDown) {
      this.app.view.onmousedown = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerMouseDown({ x: e.x, y: e.y })
        }
      }
    }
    if (onContainerMouseMove) {
      this.app.view.onmousemove = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerMouseMove({ x: e.x, y: e.y })
        }
      }
    }
    if (onContainerMouseUp) {
      this.app.view.onmouseup = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerMouseUp({ x: e.x, y: e.y })
        }
      }
    }
    if (onContainerMouseLeave) {
      this.app.view.onmouseleave = (e) => {
        if (this.hoveredNode === undefined && this.clickedNode === undefined) {
          onContainerMouseLeave({ x: e.x, y: e.y })
        }
      }
    }

    this.labelsLayer.interactiveChildren = false

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

    container.appendChild(this.app.view)

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
      this.debug?.logRenderTime &&  console.timeEnd('render data change')
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      this.debug?.logRenderTime && console.time('render viewport change')
      this.app.render()
      this.debug?.logRenderTime && console.timeEnd('render viewport change')
    }
  }
}


export const PixiRenderer = (options: RendererOptions) => new Renderer(options)
