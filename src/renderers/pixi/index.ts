import * as PIXI from 'pixi.js'
import { Node, Edge } from '../../'
import { animationFrameLoop, noop } from '../../utils'
import { NodeRenderer } from './node'
import { EdgeRenderer } from './edge'
import { ArrowRenderer } from './edgeArrow'
import { CircleRenderer } from './circle'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import { Zoom } from './interaction/zoom'


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
  badge: {
    position: number
    radius?: number
    color?: string
    stroke?: string
    strokeWidth?: number
    icon?: TextIcon | ImageIcon
  }[]
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
  x: number
  y: number
  zoom: number
  minZoom: number
  maxZoom: number
  nodesEqual: (previous: N[], current: N[]) => boolean
  edgesEqual: (previous: E[], current: E[]) => boolean
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
  onContainerDrag: (event: Event | undefined, x: number, y: number) => void
  onContainerPointerUp: (event: PointerEvent) => void
  onContainerPointerLeave: (event: PointerEvent) => void
  onWheel: (e: WheelEvent, x: number, y: number, scale: number) => void
}


export const RENDERER_OPTIONS: RendererOptions<Node, Edge> = {
  width: 800, height: 600, x: 0, y: 0, zoom: 1, minZoom: 0.1, maxZoom: 2.5,
  nodesEqual: () => false, edgesEqual: () => false,
  onNodePointerEnter: noop, onNodePointerDown: noop, onNodeDrag: noop, onNodePointerUp: noop, onNodePointerLeave: noop, onNodeDoubleClick: noop,
  onEdgePointerEnter: noop, onEdgePointerDown: noop, onEdgePointerUp: noop, onEdgePointerLeave: noop,
  onContainerPointerEnter: noop, onContainerPointerDown: noop, onContainerDrag: noop,
  onContainerPointerMove: noop, onContainerPointerUp: noop, onContainerPointerLeave: noop, onWheel: noop
}

const POSITION_ANIMATION_DURATION = 800

PIXI.utils.skipHello()


export class PIXIRenderer<N extends Node, E extends Edge>{

  update: (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => void
  hoveredNode?: NodeRenderer<N, E>
  clickedNode?: NodeRenderer<N, E>
  hoveredEdge?: EdgeRenderer<N, E>
  clickedEdge?: EdgeRenderer<N, E>
  dirty = false
  viewportDirty = false
  previousRenderTime = Date.now()
  animationDuration = 0
  animationPercent = 0
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  edgesGraphic = new PIXI.Graphics()
  nodes: N[] = []
  edges: E[] = []
  nodesById: { [id: string]: NodeRenderer<N, E> } = {}
  edgesById: { [id: string]: EdgeRenderer<N, E> } = {}
  edgeIndex: { [edgeA: string]: { [edgeB: string]: Set<string> } } = {}
  arrow: ArrowRenderer<N, E>
  circle: CircleRenderer<N, E>
  zoomInteraction: Zoom<N, E>
  dragInteraction: Drag<N, E>
  decelerateInteraction: Decelerate<N, E>

  onContainerPointerEnter: (event: PointerEvent) => void = noop
  onContainerPointerDown: (event: PointerEvent) => void = noop
  onContainerDrag: (event: Event | undefined, x: number, y: number) => void = noop
  onContainerPointerMove: (event: PointerEvent) => void = noop
  onContainerPointerUp: (event: PointerEvent) => void = noop
  onContainerPointerLeave: (event: PointerEvent) => void = noop
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
  onEdgeDoubleClick: (event: Event, edge: E, x: number, y: number) => void = noop
  onWheel: (e: WheelEvent, x: number, y: number, scale: number) => void = noop
  width = RENDERER_OPTIONS.width
  height = RENDERER_OPTIONS.height
  zoom = RENDERER_OPTIONS.zoom
  minZoom = RENDERER_OPTIONS.minZoom
  maxZoom = RENDERER_OPTIONS.maxZoom
  x = RENDERER_OPTIONS.x
  y = RENDERER_OPTIONS.y
  app: PIXI.Application
  root = new PIXI.Container()
  debug?: { logPerformance?: boolean, stats?: Stats }

  constructor({ container, debug }: { container: HTMLDivElement, debug?: { logPerformance?: boolean, stats?: Stats } }) {
    if (!(container instanceof HTMLDivElement)) {
      throw new Error('container must be an instance of HTMLDivElement')
    }

    const view = document.createElement('canvas')
    container.appendChild(view)
    container.style.position = 'relative'

    this.app = new PIXI.Application({
      view,
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

    this.root.pivot.x = this.width / this.zoom / -2
    this.root.pivot.y = this.height / this.zoom / -2
    this.app.stage.addChild(this.root)
    this.root.addChild(this.edgesGraphic)
    this.root.addChild(this.edgesLayer)
    this.root.addChild(this.nodesLayer)
    this.root.addChild(this.labelsLayer)
    this.root.addChild(this.frontNodeLayer)
    this.root.addChild(this.frontLabelLayer)

    this.arrow = new ArrowRenderer<N, E>(this)
    this.circle = new CircleRenderer<N, E>(this)

    this.zoomInteraction = new Zoom(this, (e, x, y, zoom) => this.onWheel(e, x, y, zoom))
    this.app.view.addEventListener('wheel', this.zoomInteraction.wheel)

    this.dragInteraction = new Drag(this, (e, x, y) => this.onContainerDrag(e, x, y))
    this.app.renderer.plugins.interaction.on('pointerdown', this.dragInteraction.down)
    this.app.renderer.plugins.interaction.on('pointermove', this.dragInteraction.move)
    this.app.renderer.plugins.interaction.on('pointerup', this.dragInteraction.up)
    this.app.renderer.plugins.interaction.on('pointerupoutside', this.dragInteraction.up)
    this.app.renderer.plugins.interaction.on('pointercancel', this.dragInteraction.up)
    this.app.renderer.plugins.interaction.on('pointerout', this.dragInteraction.up)

    this.decelerateInteraction = new Decelerate(this, (x, y) => this.onContainerDrag(undefined, x, y))
    this.app.renderer.plugins.interaction.on('pointerdown', this.decelerateInteraction.down)
    this.app.renderer.plugins.interaction.on('pointermove', this.decelerateInteraction.move)
    this.app.renderer.plugins.interaction.on('pointerup', this.decelerateInteraction.up)
    this.app.renderer.plugins.interaction.on('pointerupoutside', this.decelerateInteraction.up)
    this.app.renderer.plugins.interaction.on('pointercancel', this.decelerateInteraction.up)
    this.app.renderer.plugins.interaction.on('pointerout', this.decelerateInteraction.up)

    this.app.view.onpointerenter = (e) => this.hoveredNode === undefined && this.clickedNode === undefined && this.hoveredEdge === undefined && this.clickedEdge === undefined && this.onContainerPointerEnter(e)
    this.app.view.onpointerdown = (e) => this.hoveredNode === undefined && this.clickedNode === undefined  && this.hoveredEdge === undefined && this.clickedEdge === undefined && this.onContainerPointerDown(e)
    this.app.view.onpointermove = (e) => this.hoveredNode === undefined && this.clickedNode === undefined  && this.hoveredEdge === undefined && this.clickedEdge === undefined && this.onContainerPointerMove(e)
    this.app.view.onpointerup = (e) => this.hoveredNode === undefined && this.clickedNode === undefined  && this.hoveredEdge === undefined && this.clickedEdge === undefined && this.onContainerPointerUp(e)
    this.app.view.onpointerleave = (e) => this.hoveredNode === undefined && this.clickedNode === undefined  && this.hoveredEdge === undefined && this.clickedEdge === undefined && this.onContainerPointerLeave(e)

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
      width = RENDERER_OPTIONS.width, height = RENDERER_OPTIONS.height, x = RENDERER_OPTIONS.x, y = RENDERER_OPTIONS.y, zoom = RENDERER_OPTIONS.zoom,
      minZoom = RENDERER_OPTIONS.minZoom, maxZoom = RENDERER_OPTIONS.maxZoom,
      nodesEqual = RENDERER_OPTIONS.nodesEqual, edgesEqual = RENDERER_OPTIONS.edgesEqual,
      onNodePointerEnter = noop, onNodePointerDown = noop, onNodeDrag = noop, onNodePointerUp = noop, onNodePointerLeave = noop, onNodeDoubleClick = noop,
      onEdgePointerEnter = noop, onEdgePointerDown = noop, onEdgePointerUp = noop, onEdgePointerLeave = noop,
      onContainerPointerEnter = noop, onContainerPointerDown = noop, onContainerDrag = noop,
      onContainerPointerMove = noop, onContainerPointerUp = noop, onContainerPointerLeave = noop, onWheel = noop,
    } = RENDERER_OPTIONS
  }: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => {
    this.onContainerPointerEnter = onContainerPointerEnter
    this.onContainerPointerDown = onContainerPointerDown
    this.onContainerDrag = onContainerDrag
    this.onContainerPointerMove = onContainerPointerMove
    this.onContainerPointerUp = onContainerPointerUp
    this.onContainerPointerLeave = onContainerPointerLeave
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
    this.onWheel = onWheel
    this.zoomInteraction.minZoom = minZoom
    this.zoomInteraction.maxZoom = maxZoom

    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.root.pivot.x = this.width / zoom / -2
      this.root.pivot.y = this.height / zoom / -2
      this.app.renderer.resize(this.width, this.height)
      this.viewportDirty = true
    }

    if (x !== this.x) {
      this.x = this.root.x = x
      this.viewportDirty = true
    }

    if (y !== this.y) {
      this.y = this.root.y = y
      this.viewportDirty = true
    }

    if (zoom !== this.zoom) {
      this.zoom = zoom
      this.root.pivot.x = (this.width / zoom) / -2
      this.root.pivot.y = (this.height / zoom) / -2
      this.root.scale.set(zoom) // TODO - interpolate zoom
      this.viewportDirty = true
    }

    const edgesAreEqual = edgesEqual(this.edges, edges)
    const nodesAreEqual = nodesEqual(this.nodes, nodes)


    /**
     * Build edge indices
     */
    if (!edgesAreEqual) {
      for (const edge of edges) {
        if (this.edgeIndex[edge.source] === undefined) {
          this.edgeIndex[edge.source] = {}
        }
        if (this.edgeIndex[edge.target] === undefined) {
          this.edgeIndex[edge.target] = {}
        }
        if (this.edgeIndex[edge.source][edge.target] === undefined) {
          this.edgeIndex[edge.source][edge.target] = new Set()
        }
        if (this.edgeIndex[edge.target][edge.source] === undefined) {
          this.edgeIndex[edge.target][edge.source] = new Set()
        }

        this.edgeIndex[edge.source][edge.target].add(edge.id)
        this.edgeIndex[edge.target][edge.source].add(edge.id)
      }
    }


    /**
     * Ndge enter/update/exit
     */
    if (!nodesAreEqual) {
      this.nodes = nodes

      const nodesById: { [id: string]: NodeRenderer<N, E> } = {}

      for (const node of nodes) {
        if (this.nodesById[node.id] === undefined) {
          // node enter
          let adjacentNode: string | undefined

          if (this.edgeIndex[node.id]) {
            // nodes w edges from existing positioned nodes enter from one of those nodes
            adjacentNode = Object.keys(this.edgeIndex[node.id]).find((adjacentNodeId) => (
              this.nodesById[adjacentNodeId]?.node.x !== undefined && this.nodesById[adjacentNodeId]?.node.y !== undefined
            ))
          }

          nodesById[node.id] = new NodeRenderer(this, node, this.nodesById[adjacentNode ?? '']?.x ?? 0, this.nodesById[adjacentNode ?? '']?.y ?? 0, node.radius)
          /**
           * alternatively, don't animate entering nodes
           */
          // nodesById[node.id] = new NodeRenderer(this, node, this.nodesById[adjacentNode]?.x ?? node.x ?? 0, this.nodesById[adjacentNode]?.y ?? node.y ?? 0, node.radius)
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

      this.animationDuration = 0
      this.nodesById = nodesById
      this.dirty = true
    }


    /**
     * Edge enter/update/exit
     */
    if (!edgesAreEqual) {
      this.edges = edges

      const edgesById: { [id: string]: EdgeRenderer<N, E> } = {}

      for (const edge of edges) {
        const id = edge.id
        if (this.edgesById[id] === undefined) {
          // edge enter
          edgesById[id] = new EdgeRenderer(this, edge)
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

      this.edgesById = edgesById
      this.dirty = true
    }


    return this
  }

  private _debugUpdate = (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => {
    performance.mark('update')
    this._update(graph)
    performance.measure('update', 'update')
  }

  private render = () => {
    const currentRenderTime = Date.now()
    const elapsedRenderTime = currentRenderTime - this.previousRenderTime
    this.animationDuration += Math.min(16, Math.max(0, elapsedRenderTime)) // clamp to 0 <= x <= 16 to smooth animations
    // this.animationDuration += elapsedRenderTime
    this.animationPercent = Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1)
    this.previousRenderTime = currentRenderTime

    this.decelerateInteraction.update(elapsedRenderTime)

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      this.edgesGraphic.clear()
      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }

      this.app.render()
      this.dirty = this.animationPercent < 1
    } else if (this.viewportDirty) {
      this.app.render()
      this.viewportDirty = false
    }
  }

  private _debugFirstRender = true
  private debugRender = () => {
    const currentRenderTime = Date.now()
    const elapsedRenderTime = currentRenderTime - this.previousRenderTime
    this.animationDuration += Math.min(16, Math.max(0, elapsedRenderTime))
    // this.animationDuration += elapsedRenderTime
    this.animationPercent = Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1)
    this.previousRenderTime = currentRenderTime

    this.decelerateInteraction.update(elapsedRenderTime)

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

      performance.mark('draw')
      this.app.render()
      performance.measure('draw', 'draw')
    } else if (this.viewportDirty) {
      performance.mark('draw')
      this.app.render()
      performance.measure('draw', 'draw')
    }

    if (this.debug?.logPerformance && (this.dirty || this.viewportDirty)) {
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

    this.dirty = this.animationPercent < 1
    this.viewportDirty = false

    performance.clearMarks()
    performance.clearMeasures()
    performance.mark('external')
  }

  delete = () => {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    this.circle.delete()
    this.arrow.delete()
  }
}


export const Renderer = <N extends Node, E extends Edge>(options: { container: HTMLDivElement, debug?: { logPerformance?: boolean, stats?: Stats } }) => {
  const pixiRenderer = new PIXIRenderer<N, E>(options)

  const render = (graph: { nodes: N[], edges: E[], options?: Partial<RendererOptions<N, E>> }) => {
    pixiRenderer.update(graph)
  }

  render.delete = pixiRenderer.delete

  return render
}
