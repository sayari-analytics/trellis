import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { Node, Edge } from '../../types'
import { animationFrameLoop, noop } from '../../utils'
import { NodeRenderer } from './node'
import { EdgeRenderer } from './edge'
import { ArrowRenderer } from './edgeArrow'
import { CircleRenderer } from './circle'


export type Event = PIXI.InteractionEvent

export type TextIcon = {
  type: 'textIcon'
  family: string
  text: string
  color: string
  size: number
}

export type ImageIcon = {
  type: 'imageIcon'
  image: string
}

export type NodeStyle = {
  color: string
  stroke: Partial<{
    color: string
    width: number
  }>[]
  icon: TextIcon | ImageIcon
  labelFamily: string
  labelColor: string
  labelSize: number
}

export type EdgeStyle = {
  width: number
  stroke: string
  strokeOpacity: number
  labelFamily: string
  labelColor: string
  labelSize: number
  arrow: 'forward' | 'reverse' | 'both' | 'none'
}

export type RendererOptions<N extends Node = Node, E extends Edge = Edge> = {
  width: number
  height: number
  onNodePointerEnter: (event: Event, node: N, x: number, y: number) => void
  onNodePointerDown: (event: Event, node: N, x: number, y: number) => void
  onNodeDrag: (event: Event, node: N, x: number, y: number) => void
  onNodePointerUp: (event: Event, node: N, x: number, y: number) => void
  onNodePointerLeave: (event: Event, node: N, x: number, y: number) => void
  onNodeDoubleClick: (event: Event, node: N, x: number, y: number) => void
  onEdgePointerEnter: (event: Event, edge: E, x: number, y: number) => void
  onEdgePointerDown: (event: Event, edge: E, x: number, y: number) => void
  onEdgePointerUp: (event: Event, edge: E, x: number, y: number) => void
  onEdgePointerLeave: (event: Event, edge: E, x: number, y: number) => void
  onContainerPointerEnter: (event: PointerEvent) => void
  onContainerPointerDown: (event: PointerEvent) => void
  onContainerPointerMove: (event: PointerEvent) => void
  onContainerPointerUp: (event: PointerEvent) => void
  onContainerPointerLeave: (event: PointerEvent) => void
}


export const RENDERER_OPTIONS: RendererOptions<Node, Edge> = {
  width: 800, height: 600,
  onNodePointerEnter: noop, onNodePointerDown: noop, onNodeDrag: noop, onNodePointerUp: noop, onNodePointerLeave: noop, onNodeDoubleClick: noop,
  onEdgePointerEnter: noop, onEdgePointerDown: noop, onEdgePointerUp: noop, onEdgePointerLeave: noop,
  onContainerPointerEnter: noop, onContainerPointerDown: noop, onContainerPointerMove: noop, onContainerPointerUp: noop, onContainerPointerLeave: noop,
}

const POSITION_ANIMATION_DURATION = 800

PIXI.utils.skipHello()


export class PIXIRenderer<N extends Node, E extends Edge>{

  update: (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => void
  hoveredNode?: NodeRenderer<N, E>
  clickedNode?: NodeRenderer<N, E>
  dirty = false
  previousRenderTime = Date.now()
  animationDuration = 0
  animationPercent = 0
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  edgesGraphic = new PIXI.Graphics()
  nodesById: { [id: string]: NodeRenderer<N, E> } = {}
  edgesById: { [id: string]: EdgeRenderer<N, E> } = {}
  forwardEdgeIndex: { [source: string]: { [target: string]: Set<string> } } = {}
  reverseEdgeIndex: { [target: string]: { [source: string]: Set<string> } } = {}
  arrow: ArrowRenderer<N, E>
  circle: CircleRenderer<N, E>

  onNodePointerEnter: (event: Event, node: N, x: number, y: number) => void = noop
  onNodePointerDown: (event: Event, node: N, x: number, y: number) => void = noop
  onNodeDrag: (event: Event, node: N, x: number, y: number) => void = noop
  onNodePointerUp: (event: Event, node: N, x: number, y: number) => void = noop
  onNodePointerLeave: (event: Event, node: N, x: number, y: number) => void = noop
  onNodeDoubleClick: (event: Event, node: N, x: number, y: number) => void = noop
  onEdgePointerEnter: (event: Event, edge: E, x: number, y: number) => void = noop
  onEdgePointerDown: (event: Event, edge: E, x: number, y: number) => void = noop
  onEdgePointerUp: (event: Event, edge: E, x: number, y: number) => void = noop
  onEdgePointerLeave: (event: Event, edge: E, x: number, y: number) => void = noop
  width = RENDERER_OPTIONS.width
  height = RENDERER_OPTIONS.height
  app: PIXI.Application
  viewport: Viewport
  debug?: { logPerformance?: boolean, stats?: Stats }

  constructor({ container, debug }: { container: HTMLCanvasElement, debug?: { logPerformance?: boolean, stats?: Stats } }) {
    if (!(container instanceof HTMLCanvasElement)) {
      throw new Error('container must be an instance of HTMLCanvasElement')
    }

    this.app = new PIXI.Application({
      view: container,
      width: this.width,
      height: this.height,
      resolution: 2, // window.devicePixelRatio,
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
    this.viewport.addChild(this.edgesGraphic)
    this.viewport.addChild(this.edgesLayer)
    this.viewport.addChild(this.nodesLayer)
    this.viewport.addChild(this.labelsLayer)
    this.viewport.addChild(this.frontNodeLayer)
    this.viewport.addChild(this.frontLabelLayer)
    this.app.stage.addChild(this.viewport)

    this.arrow = new ArrowRenderer<N, E>(this)
    this.circle = new CircleRenderer<N, E>(this)

    this.app.view.addEventListener('wheel', (event) => { event.preventDefault() })

    this.debug = debug
    if (this.debug) {
      animationFrameLoop(this.debugRender)
      this.update = this._debugUpdate
    } else {
      animationFrameLoop(this.render)
      this.update = this._update
    }
  }

  private _update = ({
    nodes,
    edges,
    options: {
      width = RENDERER_OPTIONS.width, height = RENDERER_OPTIONS.height,
      onNodePointerEnter = noop, onNodePointerDown = noop, onNodeDrag = noop, onNodePointerUp = noop, onNodePointerLeave = noop, onNodeDoubleClick = noop,
      onEdgePointerEnter = noop, onEdgePointerDown = noop, onEdgePointerUp = noop, onEdgePointerLeave = noop,
      onContainerPointerEnter = noop, onContainerPointerDown = noop, onContainerPointerMove = noop, onContainerPointerUp = noop, onContainerPointerLeave = noop,
    } = RENDERER_OPTIONS
  }: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => {
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

    const nodesById: { [id: string]: NodeRenderer<N, E> } = {}
    const edgesById: { [id: string]: EdgeRenderer<N, E> } = {}


    /**
     * Build edge indices
     */
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


    /**
     * Ndge enter/update/exit
     */
    for (const node of nodes) {
      if (this.nodesById[node.id] === undefined) {
        // node enter
        let adjacentNode: NodeRenderer<N, E> | undefined

        if (this.reverseEdgeIndex[node.id]) {
          // nodes w edges from existing nodes enter from one of those nodes
          adjacentNode = this.nodesById[Object.keys(this.reverseEdgeIndex[node.id])[0]]
        } else if (this.forwardEdgeIndex[node.id]) {
          // nodes w edges to existing nodes enter from one of those nodes
          adjacentNode = this.nodesById[Object.keys(this.forwardEdgeIndex[node.id])[0]]
        }

        nodesById[node.id] = new NodeRenderer(this, node, adjacentNode?.x ?? 0, adjacentNode?.y ?? 0, node.radius)
        /**
         * alternatively, don't animate graph on load
         */
        // nodesById[node.id] = new NodeRenderer(this, node, adjacentNode?.x ?? node.x ?? 0, adjacentNode?.y ?? node.y ?? 0, node.radius)
      } else {
        nodesById[node.id] = this.nodesById[node.id].update(node)
      }
    }

    for (const nodeId in this.nodesById) {
      if (nodesById[nodeId] === undefined) {
        // node exit
        this.nodesById[nodeId].delete()
      }
    }


    /**
     * Edge enter/update/exit
     */
    for (const edge of edges) {
      const id = edge.id
      if (this.edgesById[id] === undefined) {
        // edge enter
        edgesById[id] = new EdgeRenderer(this, this.edgesLayer).update(edge)
      } else {
        // edge update
        edgesById[id] = this.edgesById[id].update(edge)
      }
    }

    for (const edgeId in this.edgesById) {
      if (edgesById[edgeId] === undefined) {
        // edge exit
        this.edgesById[edgeId].delete()
      }
    }

    this.dirty = true
    this.nodesById = nodesById
    this.edgesById = edgesById
    this.animationDuration = 0

    return this
  }

  private _debugUpdate = (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => {
    performance.mark('update')
    this._update(graph)
    performance.measure('update', 'update')
  }

  private render = () => {
    const currentRenderTime = Date.now()
    this.animationDuration += Math.min(16, Math.max(0, currentRenderTime - this.previousRenderTime)) // clamp to 0 <= x <= 16 to smooth animations
    // this.animationDuration += currentRenderTime - this.previousRenderTime
    this.animationPercent = Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1)
    this.previousRenderTime = currentRenderTime

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      this.edgesGraphic.clear()
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

  private _debugFirstRender = true
  private debugRender = () => {
    const currentRenderTime = Date.now()
    this.animationDuration += Math.min(16, Math.max(0, currentRenderTime - this.previousRenderTime))
    // this.animationDuration += currentRenderTime - this.previousRenderTime
    this.animationPercent = Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1)
    this.previousRenderTime = currentRenderTime

    this.debug?.stats?.update()
    if (!this._debugFirstRender) {
      performance.measure('external', 'external')
    } else {
      this._debugFirstRender = false
    }

    if (this.dirty) {
      performance.mark('render')
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      this.edgesGraphic.clear()
      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }
      performance.measure('render', 'render')

      this.dirty = this.animationPercent < 1

      performance.mark('draw')
      this.app.render()
      performance.measure('draw', 'draw')
    } else if (this.viewport.dirty) {
      performance.mark('draw')
      this.app.render()
      performance.measure('draw', 'draw')
    }

    if (this.debug?.logPerformance && (this.dirty || this.viewport.dirty)) {
      let external = 0
      let update = 0
      let render = 0
      let draw = 0
      let total = 0
      for (const measurement of performance.getEntriesByType('measure')) {
        if (measurement.name === 'update') {
          update = measurement.duration
          total += measurement.duration
        } else if (measurement.name === 'render') {
          render = measurement.duration
          total += measurement.duration
        } else if (measurement.name === 'draw') {
          draw = measurement.duration
          total += measurement.duration
        } else if (measurement.name === 'external') {
          external = measurement.duration
          total += measurement.duration
        }
      }

      // green: 50+ frames/sec, pink: 30 frames/sec, red: 20 frames/sec
      console.log(
        `%c${total.toFixed(1)}ms%c (update: %c${update.toFixed(1)}%c, render: %c${render.toFixed(1)}%c, draw: %c${draw.toFixed(1)}%c, external: %c${external.toFixed(1)}%c)`,
        `color: ${total <= 20 ? '#6c6' : total <= 33 ? '#f88' : total <= 50 ? '#e22' : '#a00'}`,
        'color: #666',
        `color: ${update <= 5 ? '#6c6' : update <= 10 ? '#f88' : update <= 20 ? '#e22' : '#a00'}`,
        'color: #666',
        `color: ${render <= 5 ? '#6c6' : render <= 10 ? '#f88' : render <= 20 ? '#e22' : '#a00'}`,
        'color: #666',
        `color: ${draw <= 5 ? '#6c6' : draw <= 10 ? '#f88' : draw <= 20 ? '#e22' : '#a00'}`,
        'color: #666',
        `color: ${external <= 5 ? '#6c6' : external <= 10 ? '#f88' : external <= 20 ? '#e22' : '#a00'}`,
        'color: #666',
      )
    }

    this.viewport.dirty = false

    performance.clearMarks()
    performance.clearMeasures()
    performance.mark('external')
  }

  delete = () => {
    this.app.destroy(false, { children: true, texture: true, baseTexture: true })
    this.circle.delete()
    this.arrow.delete()
  }
}


export const Renderer = <N extends Node, E extends Edge>(options: { container: HTMLCanvasElement, debug?: { logPerformance?: boolean, stats?: Stats } }) => {
  const pixiRenderer = new PIXIRenderer<N, E>(options)

  const render = (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => {
    pixiRenderer.update(graph)
  }

  render.delete = pixiRenderer.delete

  return render
}
