import * as PIXI from 'pixi.js'
import { install } from '@pixi/unsafe-eval'
import * as Graph from '../..'
import { animationFrameLoop, interpolate } from '../../utils'
import { NodeRenderer } from './node'
import { EdgeRenderer } from './edge'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import { Zoom } from './interaction/zoom'
import { ArrowSprite } from './sprites/arrowSprite'
import { CircleSprite } from './sprites/circleSprite'
import { ImageSprite } from './sprites/ImageSprite'
import { FontIconSprite } from './sprites/FontIconSprite'


install(PIXI)

export type TextIcon = {
  type: 'textIcon'
  family: string
  text: string
  color: string
  size: number
}

export type ImageIcon = {
  type: 'imageIcon'
  url: string
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export type NodeStyle = {
  color?: string
  stroke?: {
    color?: string
    width?: number
  }[]
  badge?: {
    position: number
    radius?: number
    color?: string
    stroke?: string
    strokeWidth?: number
    icon?: TextIcon | ImageIcon
  }[]
  icon?: TextIcon | ImageIcon
  labelFamily?: string
  labelColor?: string
  labelSize?: number
  labelWordWrap?: number
  labelBackground?: string
}

export type EdgeStyle = {
  width?: number
  stroke?: string
  strokeOpacity?: number
  labelFamily?: string
  labelColor?: string
  labelSize?: number
  labelWordWrap?: number
  arrow?: 'forward' | 'reverse' | 'both' | 'none'
}

export type Options<N extends Graph.Node = Graph.Node, E extends Graph.Edge = Graph.Edge> = {
  width?: number
  height?: number
  x?: number
  y?: number
  zoom?: number
  minZoom?: number
  maxZoom?: number
  animateGraph?: boolean
  animateViewport?: boolean
  nodesEqual?: (previous: N[], current: N[]) => boolean
  edgesEqual?: (previous: E[], current: E[]) => boolean
  onNodePointerEnter?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodePointerDown?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDrag?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDragEnd?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDragStart?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodePointerUp?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodePointerLeave?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDoubleClick?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onEdgePointerEnter?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgePointerDown?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgePointerUp?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgePointerLeave?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onContainerPointerEnter?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerPointerDown?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerPointerMove?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerDrag?: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void
  onContainerPointerUp?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerPointerLeave?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onWheel?: (e: WheelEvent, x: number, y: number, scale: number) => void
}


export const RENDERER_OPTIONS = {
  width: 800, height: 600, x: 0, y: 0, zoom: 1, minZoom: 0.1, maxZoom: 2.5,
  animateGraph: true, animateViewport: true, nodesEqual: () => false, edgesEqual: () => false,
}

const POSITION_ANIMATION_DURATION = 800

PIXI.utils.skipHello()


export class InternalRenderer<N extends Graph.Node, E extends Graph.Edge>{

  width = RENDERER_OPTIONS.width
  height = RENDERER_OPTIONS.height
  minZoom = RENDERER_OPTIONS.minZoom
  maxZoom = RENDERER_OPTIONS.maxZoom
  zoom = RENDERER_OPTIONS.zoom
  targetZoom = RENDERER_OPTIONS.zoom
  wheelZoom?: number
  interpolateZoom?: () => { value: number, done: boolean }
  x = RENDERER_OPTIONS.x
  targetX = RENDERER_OPTIONS.x
  dragX?: number
  interpolateX?: () => { value: number, done: boolean }
  y = RENDERER_OPTIONS.y
  targetY = RENDERER_OPTIONS.y
  dragY?: number
  interpolateY?: () => { value: number, done: boolean }
  animateGraph = RENDERER_OPTIONS.animateGraph
  animateViewport = RENDERER_OPTIONS.animateViewport
  hoveredNode?: NodeRenderer<N, E>
  clickedNode?: NodeRenderer<N, E>
  hoveredEdge?: EdgeRenderer<N, E>
  clickedEdge?: EdgeRenderer<N, E>
  dragging = false
  dirty = false
  viewportDirty = false
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
  arrow: ArrowSprite<N, E>
  circle: CircleSprite<N, E>
  image: ImageSprite
  fontIcon: FontIconSprite
  app: PIXI.Application
  root = new PIXI.Container()
  zoomInteraction: Zoom<N, E>
  dragInteraction: Drag<N, E>
  decelerateInteraction: Decelerate<N, E>

  private clickedContainer = false
  private previousTime = performance.now()
  private animationDuration = 0
  private debug?: { logPerformance?: boolean, stats?: Stats }
  private cancelAnimationLoop: () => void

  onContainerPointerEnter?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerPointerDown?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerDrag?: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void
  onContainerPointerMove?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerPointerUp?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerPointerLeave?: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onWheel?: (e: WheelEvent, x: number, y: number, scale: number) => void
  onNodePointerEnter?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodePointerDown?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDrag?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDragEnd?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDragStart?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodePointerUp?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodePointerLeave?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onNodeDoubleClick?: (event: PIXI.InteractionEvent, node: N, x: number, y: number) => void
  onEdgePointerEnter?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgePointerDown?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgePointerUp?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgePointerLeave?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  onEdgeDoubleClick?: (event: PIXI.InteractionEvent, edge: E, x: number, y: number) => void
  dataUrl?: (dataUrl: string) => void
  dataUrlScale = 2
  update: (graph: { nodes: N[], edges: E[], options?: Options<N, E> }) => void

  constructor(options: { container: HTMLDivElement, debug?: { logPerformance?: boolean, stats?: Stats } }) {
    if (!(options.container instanceof HTMLDivElement)) {
      throw new Error('container must be an instance of HTMLDivElement')
    }

    const view = document.createElement('canvas')
    options.container.appendChild(view)
    options.container.style.position = 'relative'

    this.app = new PIXI.Application({
      view,
      width: this.width,
      height: this.height,
      resolution: 2, // window.devicePixelRatio,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      transparent: true,
    })

    this.labelsLayer.interactiveChildren = false
    this.nodesLayer.sortableChildren = true // TODO - perf test

    this.app.stage.addChild(this.root)
    this.root.addChild(this.edgesGraphic)
    this.root.addChild(this.edgesLayer)
    this.root.addChild(this.nodesLayer)
    this.root.addChild(this.labelsLayer)
    this.root.addChild(this.frontNodeLayer)
    this.root.addChild(this.frontLabelLayer)

    this.zoomInteraction = new Zoom(this, (e, x, y, zoom) => this.onWheel?.(e, x, y, zoom))
    this.dragInteraction = new Drag(this, (e, x, y) => this.onContainerDrag?.(e, x, y))
    this.decelerateInteraction = new Decelerate(this, (x, y) => this.onContainerDrag?.(undefined, x, y))

    const pointerEnter = (event: PIXI.InteractionEvent) => {
      const { x, y } = this.root.toLocal(event.data.global)
      this.onContainerPointerEnter?.(event, x, y)
    }
    const pointerDown = (event: PIXI.InteractionEvent) => {
      this.dragInteraction.down(event)
      this.decelerateInteraction.down()

      if (this.hoveredNode === undefined && this.clickedNode === undefined  && this.hoveredEdge === undefined && this.clickedEdge === undefined) {
        this.clickedContainer = true
        const { x, y } = this.root.toLocal(event.data.global)
        this.onContainerPointerDown?.(event, x, y)
      }
    }
    const pointerMove = (event: PIXI.InteractionEvent) => {
      this.dragInteraction.move(event)
      this.decelerateInteraction.move()

      if (this.onContainerPointerMove) {
        const { x, y } = this.root.toLocal(event.data.global)
        this.onContainerPointerMove(event, x, y)
      }
    }
    const pointerUp = (event: PIXI.InteractionEvent) => {
      this.dragInteraction.up()
      this.decelerateInteraction.up()

      if (this.clickedContainer) {
        this.clickedContainer = false
        const { x, y } = this.root.toLocal(event.data.global)
        this.onContainerPointerUp?.(event, x, y)
      }
    }
    const pointerLeave = (event: PIXI.InteractionEvent) => {
      const { x, y } = this.root.toLocal(event.data.global)
      this.onContainerPointerLeave?.(event, x, y)
    }

    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointerenter', pointerEnter)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointerdown', pointerDown)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointermove', pointerMove)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointerup', pointerUp)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointerupoutside', pointerUp)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointercancel', pointerUp)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointerout', pointerUp)
    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager).on('pointerleave', pointerLeave)
    this.app.view.addEventListener('wheel', this.zoomInteraction.wheel)

    this.arrow = new ArrowSprite<N, E>(this)
    this.circle = new CircleSprite<N, E>(this)
    this.image = new ImageSprite()
    this.fontIcon = new FontIconSprite()

    this.debug = options.debug
    if (this.debug) {
      this.cancelAnimationLoop = animationFrameLoop(this.debugRender)
      this.update = this._debugUpdate
    } else {
      this.cancelAnimationLoop = animationFrameLoop(this.render)
      this.update = this._update
    }
  }

  private _update = ({
    nodes,
    edges,
    options: {
      width = RENDERER_OPTIONS.width, height = RENDERER_OPTIONS.height, x = RENDERER_OPTIONS.x, y = RENDERER_OPTIONS.y, zoom = RENDERER_OPTIONS.zoom,
      minZoom = RENDERER_OPTIONS.minZoom, maxZoom = RENDERER_OPTIONS.maxZoom, animateGraph = RENDERER_OPTIONS.animateGraph, animateViewport = RENDERER_OPTIONS.animateViewport,
      nodesEqual = RENDERER_OPTIONS.nodesEqual, edgesEqual = RENDERER_OPTIONS.edgesEqual,
      onNodePointerEnter, onNodePointerDown, onNodeDrag, onNodePointerUp, onNodePointerLeave, onNodeDoubleClick, onNodeDragEnd, onNodeDragStart,
      onEdgePointerEnter, onEdgePointerDown, onEdgePointerUp, onEdgePointerLeave,
      onContainerPointerEnter, onContainerPointerDown, onContainerDrag, onContainerPointerMove, onContainerPointerUp, onContainerPointerLeave, onWheel,
    } = RENDERER_OPTIONS
  }: { nodes: N[], edges: E[], options?: Options<N, E> }) => {
    this.onContainerPointerEnter = onContainerPointerEnter
    this.onContainerPointerDown = onContainerPointerDown
    this.onContainerDrag = onContainerDrag
    this.onContainerPointerMove = onContainerPointerMove
    this.onContainerPointerUp = onContainerPointerUp
    this.onContainerPointerLeave = onContainerPointerLeave
    this.onNodePointerEnter = onNodePointerEnter
    this.onNodePointerDown = onNodePointerDown
    this.onNodeDrag = onNodeDrag
    this.onNodeDragEnd = onNodeDragEnd
    this.onNodeDragStart = onNodeDragStart
    this.onNodePointerUp = onNodePointerUp
    this.onNodePointerLeave = onNodePointerLeave
    this.onNodeDoubleClick = onNodeDoubleClick
    this.onEdgePointerEnter = onEdgePointerEnter
    this.onEdgePointerDown = onEdgePointerDown
    this.onEdgePointerUp = onEdgePointerUp
    this.onEdgePointerLeave = onEdgePointerLeave
    this.onWheel = onWheel
    this.animateGraph = animateGraph
    this.animateViewport = animateViewport
    this.minZoom = minZoom
    this.maxZoom = maxZoom


    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.app.renderer.resize(this.width, this.height)
      this.viewportDirty = true
    }

    if (zoom !== this.targetZoom) {
      if (zoom === this.wheelZoom || !this.animateViewport) {
        this.interpolateZoom = undefined
        this.zoom = zoom
        this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))
      } else {
        this.interpolateZoom = interpolate(this.zoom, zoom, 600)
      }

      this.wheelZoom = undefined
      this.targetZoom = zoom
      this.viewportDirty = true
    }

    if (x !== this.targetX) {
      if (x === this.dragX || !this.animateViewport) {
        this.interpolateX = undefined
        this.x = x
      } else {
        this.interpolateX = interpolate(this.x, x, 600)
      }

      this.dragX = undefined
      this.targetX = x
      this.viewportDirty = true
    }

    if (y !== this.targetY) {
      if (y === this.dragY || !this.animateViewport) {
        this.interpolateY = undefined
        this.y = y
      } else {
        this.interpolateY = interpolate(this.y, y, 600)
      }

      this.dragY = undefined
      this.targetY = y
      this.viewportDirty = true
    }

    this.root.x = (this.x * this.zoom) + (this.width / 2)
    this.root.y = (this.y * this.zoom) + (this.height / 2)

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
     * Node enter/update/exit
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

    // this.root.getChildByName('bbox')?.destroy()
    // const bounds = Graph.getSelectionBounds(this.nodes, 0)
    // const bbox = new PIXI.Graphics()
    //   .lineStyle(1, 0xff0000, 0.5)
    //   .drawPolygon(new PIXI.Polygon([bounds.left, bounds.top, bounds.right, bounds.top, bounds.right, bounds.bottom, bounds.left, bounds.bottom]))
    // bbox.name = 'bbox'
    // this.root.addChild(bbox)

    // this.root.getChildByName('bboxCenter')?.destroy()
    // const viewport = Graph.boundsToViewport(bounds, { width: this.width, height: this.height })
    // const bboxCenter = new PIXI.Graphics().lineStyle(2, 0xff0000, 0.5).drawCircle(-viewport.x, -viewport.y, 5)
    // bboxCenter.name = 'bboxCenter'
    // this.root.addChild(bboxCenter)

    // this.root.getChildByName('origin')?.destroy()
    // const origin = new PIXI.Graphics().lineStyle(6, 0x000000, 1).drawCircle(0, 0, 3)
    // origin.name = 'origin'
    // this.root.addChild(origin)

    // this.root.getChildByName('screenCenter')?.destroy()
    // const screenCenter = new PIXI.Graphics().lineStyle(2, 0x0000ff, 0.5).drawCircle(-this.x, -this.y, 10)
    // screenCenter.name = 'screenCenter'
    // this.root.addChild(screenCenter)

    // this.root.getChildByName('viewportBbox')?.destroy()
    // const viewPortBounds = Graph.viewportToBounds({ x: this.x, y: this.y, zoom: this.zoom }, { width: this.width, height: this.height })
    // const viewportBbox = new PIXI.Graphics()
    //   .lineStyle(4, 0xff00ff, 0.5)
    //   .drawPolygon(new PIXI.Polygon([viewPortBounds.left, viewPortBounds.top, viewPortBounds.right, viewPortBounds.top, viewPortBounds.right, viewPortBounds.bottom, viewPortBounds.left, viewPortBounds.bottom]))
    // viewportBbox.name = 'viewportBbox'
    // this.root.addChild(viewportBbox)


    return this
  }

  private _debugUpdate = (graph: { nodes: N[], edges: E[], options?: Options<N, E> }) => {
    performance.mark('update')
    this._update(graph)
    performance.measure('update', 'update')
  }

  private render = (time: number) => {
    const elapsedTime = time - this.previousTime
    this.animationDuration += Math.min(20, Math.max(0, elapsedTime)) // clamp to 0 <= x <= 20 to smooth animations
    // this.animationDuration += elapsedTime
    this.animationPercent = this.animateGraph ?
      Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1) :
      1
    this.previousTime = time

    this.decelerateInteraction.update(elapsedTime)

    if (this.interpolateZoom) {
      const { value, done } = this.interpolateZoom()
      this.zoom = value
      this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))

      if (done) {
        this.interpolateZoom = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateX) {
      const { value, done } = this.interpolateX()
      this.x = value

      if (done) {
        this.interpolateX = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY()
      this.y = value

      if (done) {
        this.interpolateY = undefined
      }

      this.viewportDirty = true
    }

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      this.edgesGraphic.clear()
      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }
    }

    if (this.viewportDirty || this.dirty) {
      this.root.x = (this.x * this.zoom) + (this.width / 2)
      this.root.y = (this.y * this.zoom) + (this.height / 2)
      this.app.render()
    }

    this.viewportDirty = false
    this.dirty = this.animationPercent < 1

    if (this.dataUrl) {
      const bounds = Graph.viewportToBounds({ x: this.x, y: this.y, zoom: this.zoom }, { width: this.width, height: this.height })
      const background = new PIXI.Graphics()
        .beginFill(0xffffff)
        .drawPolygon(new PIXI.Polygon([bounds.left, bounds.top, bounds.right, bounds.top, bounds.right, bounds.bottom, bounds.left, bounds.bottom]))
        .endFill()

      this.root.addChildAt(background, 0)
      const imageTexture = this.app.renderer.generateTexture(this.root, PIXI.SCALE_MODES.LINEAR, this.dataUrlScale)
      const url = (this.app.renderer.plugins.extract as PIXI.Extract).base64(imageTexture)
      imageTexture.destroy()
      this.root.removeChild(background)
      background.destroy()

      this.dataUrl(url)
      this.dataUrl = undefined
    }
  }

  private _debugFirstRender = true
  private debugRender = (time: number) => {
    this.debug?.stats?.update()
    const elapsedTime = time - this.previousTime
    this.animationDuration += Math.min(20, Math.max(0, elapsedTime))
    // this.animationDuration += elapsedTime
    this.animationPercent = this.animateGraph ?
      Math.min(this.animationDuration / POSITION_ANIMATION_DURATION, 1) :
      1
    this.previousTime = time

    this.decelerateInteraction.update(elapsedTime)

    if (this.interpolateZoom) {
      const { value, done } = this.interpolateZoom()
      this.zoom = value
      this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))

      if (done) {
        this.interpolateZoom = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateX) {
      const { value, done } = this.interpolateX()
      this.x = value

      if (done) {
        this.interpolateX = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY()
      this.y = value

      if (done) {
        this.interpolateY = undefined
      }

      this.viewportDirty = true
    }

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
    }

    if (this.viewportDirty || this.dirty) {
      performance.mark('draw')
      this.root.x = (this.x * this.zoom) + (this.width / 2)
      this.root.y = (this.y * this.zoom) + (this.height / 2)
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

    if (this.dataUrl) {
      const bounds = Graph.viewportToBounds({ x: this.x, y: this.y, zoom: this.zoom }, { width: this.width, height: this.height })
      const background = new PIXI.Graphics()
        .beginFill(0xffffff)
        .drawPolygon(new PIXI.Polygon([bounds.left, bounds.top, bounds.right, bounds.top, bounds.right, bounds.bottom, bounds.left, bounds.bottom]))
        .endFill()

      this.root.addChildAt(background, 0)
      const imageTexture = this.app.renderer.generateTexture(this.root, PIXI.SCALE_MODES.LINEAR, this.dataUrlScale)
      const url = (this.app.renderer.plugins.extract as PIXI.Extract).base64(imageTexture)
      imageTexture.destroy()
      this.root.removeChild(background)
      background.destroy()

      this.dataUrl(url)
      this.dataUrl = undefined
    }

    performance.clearMarks()
    performance.clearMeasures()
    performance.mark('external')
  }

  delete = () => {
    this.cancelAnimationLoop()
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    this.circle.delete()
    this.arrow.delete()
    this.image.delete()
    this.fontIcon.delete()
  }

  base64 = (dataUrlScale?: number) => {
    this.dataUrlScale = dataUrlScale ?? 2
    return new Promise<string>((resolve) => this.dataUrl = resolve)
  }
}


export const Renderer = (options: { container: HTMLDivElement, debug?: { logPerformance?: boolean, stats?: Stats } }) => {
  const pixiRenderer = new InternalRenderer(options)

  const render = <N extends Graph.Node, E extends Graph.Edge>(graph: { nodes: N[], edges: E[], options?: Options<N, E> }) => {
    (pixiRenderer as unknown as InternalRenderer<N, E>).update(graph)
  }

  render.delete = pixiRenderer.delete

  return render
}
