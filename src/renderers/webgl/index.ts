import * as PIXI from 'pixi.js-legacy'
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
import { FontLoader, ImageLoader } from './Loader'
import { CircleAnnotationRenderer } from './annotations/circle'
import { clientPositionFromEvent, pointerKeysFromEvent } from './utils'
import { AnnotationRenderer } from './annotations'
import { RectangleAnnotationRenderer } from './annotations/rectangle'


install(PIXI)


export type NodePointerEvent = { type: 'nodePointer', x: number, y: number, clientX: number, clientY: number, target: Graph.Node, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type NodeDragEvent = { type: 'nodeDrag', x: number, y: number, clientX: number, clientY: number, nodeX: number, nodeY: number, target: Graph.Node, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type EdgePointerEvent = { type: 'edgePointer', x: number, y: number, clientX: number, clientY: number, target: Graph.Edge, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type AnnotationPointerEvent = { type: 'annotationPointer', x: number, y: number, clientX: number, clientY: number, target: Graph.Annotation, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type AnnotationResizePointerEvent = { type: 'annotationPointer', position: 'nw' | 'ne' | 'se' | 'sw', x: number, y: number, clientX: number, clientY: number, target: Graph.Annotation, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type AnnotationDragEvent = { type: 'annotationDrag',  x: number, y: number, clientX: number, clientY: number, annotationX: number, annotationY: number,  target: Graph.Annotation, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type AnnotationResizeEvent = { type: 'annotationResize', position: 'nw' | 'ne' | 'se' | 'sw',  x: number, y: number, width: number, height: number,  target: Graph.Annotation, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type ViewportPointerEvent = { type: 'viewportPointer', x: number, y: number, clientX: number, clientY: number, target: Graph.Viewport, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type ViewportDragEvent = { type: 'viewportDrag', x: number, y: number, clientX: number, clientY: number, viewportX: number, viewportY: number, target: Graph.Viewport, altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }


export type ViewportDragDecelerateEvent = { type: 'viewportDragDecelarate', viewportX: number, viewportY: number, target: Graph.Viewport }


export type ViewportWheelEvent = { type: 'viewportWheel', x: number, y: number, clientX: number, clientY: number, viewportX: number, viewportY: number, viewportZoom: number, target: Graph.Viewport }


export type Options<N extends Graph.Node = Graph.Node, E extends Graph.Edge = Graph.Edge> = {
  width?: number
  height?: number
  x?: number
  y?: number
  zoom?: number
  minZoom?: number
  maxZoom?: number
  animateViewportPosition?: number | boolean
  animateViewportZoom?: number | boolean
  animateNodePosition?: number | boolean
  animateNodeRadius?: number | boolean
  cursor?: string
  dragInertia?: number
  nodesEqual?: (previous: N[], current: N[]) => boolean
  edgesEqual?: (previous: E[], current: E[]) => boolean
  nodeIsEqual?: (previous: N, current: N) => boolean
  edgeIsEqual?: (previous: E, current: E) => boolean

  onNodePointerEnter?: (event: NodePointerEvent) => void
  onNodePointerDown?: (event: NodePointerEvent) => void
  onNodeDragStart?: (event: NodeDragEvent) => void
  onNodeDrag?: (event: NodeDragEvent) => void
  onNodeDragEnd?: (event: NodeDragEvent) => void
  onNodePointerUp?: (event: NodePointerEvent) => void
  onNodeClick?: (event: NodePointerEvent) => void
  onNodeDoubleClick?: (event: NodePointerEvent) => void
  onNodePointerLeave?: (event: NodePointerEvent) => void

  onEdgePointerEnter?: (event: EdgePointerEvent) => void
  onEdgePointerDown?: (event: EdgePointerEvent) => void
  onEdgePointerUp?: (event: EdgePointerEvent) => void
  onEdgePointerLeave?: (event: EdgePointerEvent) => void
  onEdgeClick?: (event: EdgePointerEvent) => void
  onEdgeDoubleClick?: (event: EdgePointerEvent) => void

  onAnnotationPointerEnter?: (event: AnnotationPointerEvent) => void
  onAnnotationPointerDown?: (event: AnnotationPointerEvent) => void
  onAnnotationDragStart?: (event: AnnotationDragEvent) => void
  onAnnotationDrag?: (event: AnnotationDragEvent) => void
  onAnnotationDragEnd?: (event: AnnotationDragEvent) => void
  onAnnotationPointerUp?: (event: AnnotationPointerEvent) => void
  onAnnotationPointerLeave?: (event: AnnotationPointerEvent) => void
  onAnnotationClick?: (event: AnnotationPointerEvent) => void
  onAnnotationDoubleClick?: (event: AnnotationPointerEvent) => void
  
  onAnnotationResizePointerUp?: (event: AnnotationResizePointerEvent) => void
  onAnnotationResizePointerLeave?: (event: AnnotationResizePointerEvent) => void
  onAnnotationResize?: (event: AnnotationResizeEvent) => void
  onAnnotationResizePointerEnter?: (event: AnnotationResizePointerEvent) => void
  onAnnotationResizePointerDown?: (event: AnnotationResizePointerEvent) => void


  onViewportPointerEnter?: (event: ViewportPointerEvent) => void
  onViewportPointerDown?: (event: ViewportPointerEvent) => void
  onViewportPointerMove?: (event: ViewportPointerEvent) => void
  onViewportDragStart?: (event: ViewportDragEvent) => void
  onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportDragEnd?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportPointerUp?: (event: ViewportPointerEvent) => void
  onViewportClick?: (event: ViewportPointerEvent) => void
  onViewportDoubleClick?: (event: ViewportPointerEvent) => void
  onViewportPointerLeave?: (event: ViewportPointerEvent) => void
  onViewportWheel?: (event: ViewportWheelEvent) => void
}


export const RENDERER_OPTIONS = {
  width: 800, height: 600, x: 0, y: 0, zoom: 1, minZoom: 0.1, maxZoom: 2.5,
  animateViewportPosition: 600, animateViewportZoom: 600, animateNodePosition: 800, animateNodeRadius: 800, dragInertia: 0.88,
  nodesEqual: () => false, edgesEqual: () => false, nodeIsEqual: () => false, edgeIsEqual: () => false,
}

PIXI.utils.skipHello()


export class InternalRenderer<N extends Graph.Node, E extends Graph.Edge>{

  width = RENDERER_OPTIONS.width
  height = RENDERER_OPTIONS.height
  minZoom = RENDERER_OPTIONS.minZoom
  maxZoom = RENDERER_OPTIONS.maxZoom
  x = RENDERER_OPTIONS.x
  expectedViewportXPosition?: number
  y = RENDERER_OPTIONS.y
  expectedViewportYPosition?: number
  zoom = RENDERER_OPTIONS.zoom
  expectedViewportZoom?: number
  animateViewportPosition: number | false = RENDERER_OPTIONS.animateViewportPosition
  animateViewportZoom: number | false = RENDERER_OPTIONS.animateViewportZoom
  animateNodePosition: number | false = RENDERER_OPTIONS.animateNodePosition
  animateNodeRadius: number | false = RENDERER_OPTIONS.animateNodeRadius
  dragInertia = RENDERER_OPTIONS.dragInertia
  hoveredNode?: NodeRenderer<N, E>
  clickedNode?: NodeRenderer<N, E>
  hoveredEdge?: EdgeRenderer<N, E>
  clickedEdge?: EdgeRenderer<N, E>
  hoveredAnnotation?: AnnotationRenderer
  clickedAnnotation?: AnnotationRenderer
  dragging = false
  dirty = false
  viewportDirty = false
  time = performance.now()
  annotationsBottomLayer = new PIXI.Container()
  annotationsLayer = new PIXI.Container()
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  edgesGraphic = new PIXI.Graphics()
  nodes: N[] = []
  edges: E[] = []
  annotations?: Graph.Annotation[]
  nodesById: { [id: string]: NodeRenderer<N, E> } = {}
  edgesById: { [id: string]: EdgeRenderer<N, E> } = {}
  annotationsById: { [id: string]: AnnotationRenderer } = {}
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
  fontLoader = FontLoader()
  imageLoader = ImageLoader()
  altKey = false
  ctrlKey = false
  metaKey = false
  shiftKey = false
  container: HTMLDivElement

  private clickedContainer = false
  private previousTime = performance.now()
  private debug?: { logPerformance?: boolean, stats?: Stats }
  private cancelAnimationLoop: () => void
  private interpolateX?: (time: number) => { value: number, done: boolean }
  private targetX = RENDERER_OPTIONS.x
  private interpolateY?: (time: number) => { value: number, done: boolean }
  private targetY = RENDERER_OPTIONS.y
  private interpolateZoom?: (time: number) => { value: number, done: boolean }
  private targetZoom = RENDERER_OPTIONS.zoom
  private firstRender = true
  private doubleClickTimeout?: number
  private doubleClick = false
  private onKeyDown = ({ altKey, ctrlKey, metaKey, shiftKey }: KeyboardEvent) => {
    this.altKey = altKey
    this.ctrlKey = ctrlKey
    this.metaKey = metaKey
    this.shiftKey = shiftKey
  }
  private onKeyUp = () => {
    this.altKey = false
    this.ctrlKey = false
    this.metaKey = false
    this.shiftKey = false
  }

  onNodePointerEnter?: (event: NodePointerEvent) => void
  onNodePointerDown?: (event: NodePointerEvent) => void
  onNodeDragStart?: (event: NodeDragEvent) => void
  onNodeDrag?: (event: NodeDragEvent) => void
  onNodeDragEnd?: (event: NodeDragEvent) => void
  onNodePointerUp?: (event: NodePointerEvent) => void
  onNodeClick?: (event: NodePointerEvent) => void
  onNodeDoubleClick?: (event: NodePointerEvent) => void
  onNodePointerLeave?: (event: NodePointerEvent) => void
  onEdgePointerEnter?: (event: EdgePointerEvent) => void
  onEdgePointerDown?: (event: EdgePointerEvent) => void
  onEdgePointerUp?: (event: EdgePointerEvent) => void
  onEdgePointerLeave?: (event: EdgePointerEvent) => void
  onEdgeClick?: (event: EdgePointerEvent) => void
  onEdgeDoubleClick?: (event: EdgePointerEvent) => void
  onAnnotationPointerEnter?: (event: AnnotationPointerEvent) => void
  onAnnotationPointerDown?: (event: AnnotationPointerEvent) => void
  onAnnotationDragStart?: (event: AnnotationDragEvent) => void
  onAnnotationDrag?: (event: AnnotationDragEvent) => void
  onAnnotationDragEnd?: (event: AnnotationDragEvent) => void
  onAnnotationPointerUp?: (event: AnnotationPointerEvent) => void
  onAnnotationPointerLeave?: (event: AnnotationPointerEvent) => void
  onAnnotationClick?: (event: AnnotationPointerEvent) => void
  onAnnotationDoubleClick?: (event: AnnotationPointerEvent) => void
  onAnnotationResize?: (event: AnnotationResizeEvent) => void
  onViewportPointerEnter?: (event: ViewportPointerEvent) => void
  onViewportPointerDown?: (event: ViewportPointerEvent) => void
  onViewportPointerMove?: (event: ViewportPointerEvent) => void
  onViewportDragStart?: (event: ViewportDragEvent) => void
  onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportDragEnd?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportPointerUp?: (event: ViewportPointerEvent) => void
  onViewportClick?: (event: ViewportPointerEvent) => void
  onViewportDoubleClick?: (event: ViewportPointerEvent) => void
  onViewportPointerLeave?: (event: ViewportPointerEvent) => void
  onViewportWheel?: (event: ViewportWheelEvent) => void

  update: (graph: { nodes: N[], edges: E[], options?: Options<N, E>, annotations?: Graph.Annotation[] }) => void

  constructor(options: { container: HTMLDivElement, debug?: { logPerformance?: boolean, stats?: Stats } }) {
    if (!(options.container instanceof HTMLDivElement)) {
      throw new Error('container must be an instance of HTMLDivElement')
    }

    const view = document.createElement('canvas')
    view.onselectstart = () => false
    options.container.appendChild(view)
    this.container = options.container

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
    this.annotationsBottomLayer.sortableChildren = true

    this.app.stage.addChild(this.root)
    this.root.addChild(this.annotationsBottomLayer)
    this.root.addChild(this.annotationsLayer)
    this.root.addChild(this.edgesGraphic)
    this.root.addChild(this.edgesLayer)
    this.root.addChild(this.nodesLayer)
    this.root.addChild(this.labelsLayer)
    this.root.addChild(this.frontNodeLayer)
    this.root.addChild(this.frontLabelLayer)

    this.zoomInteraction = new Zoom(this)
    this.dragInteraction = new Drag(this)
    this.decelerateInteraction = new Decelerate(this)

    ;(this.app.renderer.plugins.interaction as PIXI.InteractionManager)
      .on('pointerenter', this.pointerEnter)
      .on('pointerdown', this.pointerDown)
      .on('pointermove', this.pointerMove)
      .on('pointerup', this.pointerUp)
      .on('pointerupoutside', this.pointerUp)
      .on('pointercancel', this.pointerUp)
      .on('pointerleave', this.pointerLeave)

    this.app.view.addEventListener('wheel', this.zoomInteraction.wheel)

    this.arrow = new ArrowSprite<N, E>(this)
    this.circle = new CircleSprite<N, E>(this)
    this.image = new ImageSprite()
    this.fontIcon = new FontIconSprite()

    document.body.addEventListener('keydown', this.onKeyDown)
    document.body.addEventListener('keyup', this.onKeyUp)

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
      minZoom = RENDERER_OPTIONS.minZoom, maxZoom = RENDERER_OPTIONS.maxZoom, cursor,
      animateNodePosition = RENDERER_OPTIONS.animateNodePosition, animateNodeRadius = RENDERER_OPTIONS.animateNodeRadius,
      animateViewportPosition = RENDERER_OPTIONS.animateViewportPosition, animateViewportZoom = RENDERER_OPTIONS.animateViewportZoom, dragInertia = RENDERER_OPTIONS.dragInertia,
      nodesEqual = RENDERER_OPTIONS.nodesEqual, edgesEqual = RENDERER_OPTIONS.edgesEqual, nodeIsEqual = RENDERER_OPTIONS.nodeIsEqual, edgeIsEqual = RENDERER_OPTIONS.edgeIsEqual,
      onNodePointerEnter, onNodePointerDown, onNodeDragStart, onNodeDrag, onNodeDragEnd, onNodePointerUp, onNodeClick, onNodeDoubleClick, onNodePointerLeave,
      onEdgePointerEnter, onEdgePointerDown, onEdgePointerUp, onEdgeClick, onEdgeDoubleClick, onEdgePointerLeave,
      onAnnotationPointerEnter, onAnnotationPointerDown, onAnnotationDragStart, onAnnotationDrag, onAnnotationDragEnd, onAnnotationResize, onAnnotationPointerUp, onAnnotationClick, onAnnotationDoubleClick, onAnnotationPointerLeave,
      onViewportPointerEnter, onViewportPointerDown, onViewportDragStart, onViewportDrag, onViewportDragEnd, onViewportPointerMove, onViewportPointerUp, onViewportClick, onViewportDoubleClick, onViewportPointerLeave, onViewportWheel,
    } = RENDERER_OPTIONS,
    annotations
  }: { nodes: N[], edges: E[], options?: Options<N, E>, annotations?: Graph.Annotation[] }) => {
    this.onNodePointerEnter = onNodePointerEnter
    this.onNodePointerDown = onNodePointerDown
    this.onNodeDragStart = onNodeDragStart
    this.onNodeDrag = onNodeDrag
    this.onNodeDragEnd = onNodeDragEnd
    this.onNodePointerUp = onNodePointerUp
    this.onNodeClick = onNodeClick
    this.onNodeDoubleClick = onNodeDoubleClick
    this.onNodePointerLeave = onNodePointerLeave
    this.onEdgePointerEnter = onEdgePointerEnter
    this.onEdgePointerDown = onEdgePointerDown
    this.onEdgePointerUp = onEdgePointerUp
    this.onEdgeClick = onEdgeClick
    this.onEdgeDoubleClick = onEdgeDoubleClick
    this.onEdgePointerLeave = onEdgePointerLeave
    this.onAnnotationPointerEnter = onAnnotationPointerEnter
    this.onAnnotationPointerDown = onAnnotationPointerDown
    this.onAnnotationDragStart = onAnnotationDragStart
    this.onAnnotationDrag = onAnnotationDrag
    this.onAnnotationDragEnd = onAnnotationDragEnd
    this.onAnnotationResize = onAnnotationResize
    this.onAnnotationPointerUp = onAnnotationPointerUp
    this.onAnnotationPointerLeave = onAnnotationPointerLeave
    this.onAnnotationClick = onAnnotationClick
    this.onAnnotationDoubleClick = onAnnotationDoubleClick
    this.onViewportPointerEnter = onViewportPointerEnter
    this.onViewportPointerDown = onViewportPointerDown
    this.onViewportDragStart = onViewportDragStart
    this.onViewportDrag = onViewportDrag
    this.onViewportDragEnd = onViewportDragEnd
    this.onViewportPointerMove = onViewportPointerMove
    this.onViewportClick = onViewportClick
    this.onViewportDoubleClick = onViewportDoubleClick
    this.onViewportPointerUp = onViewportPointerUp
    this.onViewportPointerLeave = onViewportPointerLeave
    this.onViewportWheel = onViewportWheel
    this.animateViewportPosition = animateViewportPosition === true ? RENDERER_OPTIONS.animateViewportPosition : animateViewportPosition
    this.animateViewportZoom = animateViewportZoom === true ? RENDERER_OPTIONS.animateViewportZoom : animateViewportZoom
    this.animateNodePosition = animateNodePosition === true ? RENDERER_OPTIONS.animateNodePosition : animateNodePosition
    this.animateNodeRadius = animateNodeRadius === true ? RENDERER_OPTIONS.animateNodeRadius : animateNodeRadius
    this.dragInertia = dragInertia
    this.minZoom = minZoom
    this.maxZoom = maxZoom

    if (cursor !== undefined) {
      this.container.style.cursor = cursor
    }

    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.app.renderer.resize(this.width, this.height)
      this.viewportDirty = true
    }

    if (zoom !== this.targetZoom) {
      if (zoom === this.expectedViewportZoom || !this.animateViewportZoom || this.firstRender) {
        this.interpolateZoom = undefined
        this.zoom = zoom
        this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))
      } else {
        this.interpolateZoom = interpolate(this.zoom, zoom, this.animateViewportZoom, this.time)
      }

      this.expectedViewportZoom = undefined
      this.targetZoom = zoom
      this.viewportDirty = true
    }

    if (x !== this.targetX) {
      if (x === this.expectedViewportXPosition || !this.animateViewportPosition || this.firstRender) {
        this.interpolateX = undefined
        this.x = x
      } else {
        this.interpolateX = interpolate(this.x, x, this.animateViewportPosition, this.time)
      }

      this.expectedViewportXPosition = undefined
      this.targetX = x
      this.viewportDirty = true
    }

    if (y !== this.targetY) {
      if (y === this.expectedViewportYPosition || !this.animateViewportPosition || this.firstRender) {
        this.interpolateY = undefined
        this.y = y
      } else {
        this.interpolateY = interpolate(this.y, y, this.animateViewportPosition, this.time)
      }

      this.expectedViewportYPosition = undefined
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
      this.edgeIndex = { }

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
          this.dirty = true
        } else if (!nodeIsEqual(this.nodesById[node.id].node, node)) {
          // node update
          nodesById[node.id] = this.nodesById[node.id].update(node)
          this.dirty = true
        } else {
          nodesById[node.id] = this.nodesById[node.id]
        }
      }

      for (const nodeId in this.nodesById) {
        if (nodesById[nodeId] === undefined) {
          // node exit
          this.nodesById[nodeId].delete()
          this.dirty = true
        }
      }

      this.nodesById = nodesById
    }


    /**
     * Edge enter/update/exit
     */
    if (!edgesAreEqual) {
      this.edges = edges

      const edgesById: { [id: string]: EdgeRenderer<N, E> } = {}

      for (const edge of edges) {
        if (this.edgesById[edge.id] === undefined) {
          // edge enter
          edgesById[edge.id] = new EdgeRenderer(this, edge)
          this.dirty = true
        } else if (!edgeIsEqual(this.edgesById[edge.id].edge, edge)) {
          // edge update
          edgesById[edge.id] = this.edgesById[edge.id].update(edge)
          this.dirty = true
        } else {
          edgesById[edge.id] = this.edgesById[edge.id]
        }
      }

      for (const edgeId in this.edgesById) {
        if (edgesById[edgeId] === undefined) {
          // edge exit
          this.edgesById[edgeId].delete()
          this.dirty = true
        }
      }

      this.edgesById = edgesById
    }


    /**
     * Annotation enter/update/exit
     */
    this.annotations = annotations

    const annotationsById: { [id: string]: AnnotationRenderer } = {}

    for (const annotation of this.annotations ?? []) {
      const id = `${annotation.type}${annotation.id}`

      if (this.annotationsById[id] === undefined) {
        // annotation enter
        if (annotation.type === 'circle') {
          annotationsById[id] = new CircleAnnotationRenderer(this, annotation)
        } else if (annotation.type === 'rectangle' || annotation.type === 'text') {
          annotationsById[id] = new RectangleAnnotationRenderer(this, annotation)
        }

        this.dirty = true
      } else {
        // annotation update
        if (annotation.type === 'circle') {
          annotationsById[id] = (this.annotationsById[id] as CircleAnnotationRenderer).update(annotation)
        } else if (annotation.type === 'rectangle' || annotation.type === 'text') {
          annotationsById[id] = (this.annotationsById[id] as RectangleAnnotationRenderer).update(annotation)
        }

        this.dirty = true
      }
    }

    for (const annotationId in this.annotationsById) {
      if (annotationsById[annotationId] === undefined) {
        // annotation exit
        this.annotationsById[annotationId].delete()
        this.dirty = true
      }
    }

    this.annotationsById = annotationsById

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

    this.firstRender = false

    return this
  }

  private render = (time: number) => {
    this.time = time
    const elapsedTime = this.time - this.previousTime
    this.previousTime = this.time

    this.decelerateInteraction.update(elapsedTime)

    if (this.interpolateZoom) {
      const { value, done } = this.interpolateZoom(this.time)
      this.zoom = value
      this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))

      if (done) {
        this.interpolateZoom = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateX) {
      const { value, done } = this.interpolateX(this.time)
      this.x = value

      if (done) {
        this.interpolateX = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY(this.time)
      this.y = value

      if (done) {
        this.interpolateY = undefined
      }

      this.viewportDirty = true
    }


    let dirty = false

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        if (this.nodesById[nodeId].dirty) {
          this.nodesById[nodeId].render()
          dirty = dirty || this.nodesById[nodeId].dirty
        }
      }

      this.edgesGraphic.clear()
      for (const edgeId in this.edgesById) {
        /**
         * TODO - only render dirty edges [this is a harder thing to check than a node's dirty status]
         * an edge is dirty if:
         * - it has been added/updated
         * - any multiedge (edge that shares source/target) has been added/updated/deleted
         * - the position or radius of its source/target node has been updated
         * additionally, the way edges are drawn will need to change:
         * rather than clearing all edges via `this.edgesGraphic.clear()` and rerendering each,
         * each edge might need to be its own PIXI.Graphics object
         */
        this.edgesById[edgeId].render()
      }
    }

    if (this.viewportDirty || this.dirty) {
      this.root.x = (this.x * this.zoom) + (this.width / 2)
      this.root.y = (this.y * this.zoom) + (this.height / 2)
      this.app.render()
    }

    this.viewportDirty = false
    this.dirty = dirty
  }

  private _measurePerformance?: true
  private _debugUpdate = (graph: { nodes: N[], edges: E[], options?: Options<N, E>, annotations?: Graph.Annotation[] }) => {
    if (this._measurePerformance) {
      performance.measure('external', 'external')
    }

    performance.mark('update')
    this._update(graph)
    performance.measure('update', 'update')
  }

  private debugRender = (time: number) => {
    this.debug?.stats?.update()
    this.time = time
    const elapsedTime = this.time - this.previousTime
    this.previousTime = this.time

    this.decelerateInteraction.update(elapsedTime)

    if (this.interpolateZoom) {
      const { value, done } = this.interpolateZoom(this.time)
      this.zoom = value
      this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))

      if (done) {
        this.interpolateZoom = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateX) {
      const { value, done } = this.interpolateX(this.time)
      this.x = value

      if (done) {
        this.interpolateX = undefined
      }

      this.viewportDirty = true
    }

    if (this.interpolateY) {
      const { value, done } = this.interpolateY(this.time)
      this.y = value

      if (done) {
        this.interpolateY = undefined
      }

      this.viewportDirty = true
    }


    let dirty = false

    if (this.dirty) {
      performance.mark('render')
      for (const nodeId in this.nodesById) {
        if (this.nodesById[nodeId].dirty) {
          this.nodesById[nodeId].render()
          dirty = dirty || this.nodesById[nodeId].dirty
        }
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

    if (this._measurePerformance) {
      performance.measure('total', 'total')
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
        } else if (measurement.name === 'render') {
          render = measurement.duration
        } else if (measurement.name === 'draw') {
          draw = measurement.duration
        } else if (measurement.name === 'external') {
          external = measurement.duration
        } else if (measurement.name === 'total') {
          total = measurement.duration
        }
      }

      // green: 50+ frames/sec, pink: 30 frames/sec, red: 20 frames/sec
      // eslint-disable-next-line no-console
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

    this.viewportDirty = false
    this.dirty = dirty

    performance.clearMarks()
    performance.clearMeasures()
    performance.mark('external')
    performance.mark('total')
    this._measurePerformance = true
  }

  delete = () => {
    if (this.doubleClickTimeout) {
      clearTimeout(this.doubleClickTimeout)
      this.doubleClickTimeout = undefined
    }

    document.body.removeEventListener('keydown', this.onKeyDown)
    document.body.removeEventListener('keyup', this.onKeyUp)

    this.cancelAnimationLoop()
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
    this.circle.delete()
    this.arrow.delete()
    this.image.delete()
    this.fontIcon.delete()
  }

  base64 = (resolution: number = 2, mimetype: string = 'image/jpeg') => {
    return new Promise<string>((resolve, reject) => {
      const cancelAnimationFrame = animationFrameLoop((time) => {
        if (this.fontLoader.loading() || this.imageLoader.loading()) {
          return
        }

        cancelAnimationFrame()

        try {
          this.render(time)
          // const bounds = Graph.viewportToBounds({ x: this.x, y: this.y, zoom: this.zoom }, { width: this.width, height: this.height })
          const background = new PIXI.Graphics()
            .beginFill(0xffffff)
            .drawRect((-this.x * this.zoom) - (this.width / 2), (-this.y * this.zoom) - (this.height / 2), this.width, this.height)
            .endFill()

          this.root.addChildAt(background, 0)

          // what causes this to throw on some machines? https://github.com/sayari-analytics/graph-ui/issues/1557
          const imageTexture = this.app.renderer.generateTexture(
            this.root,
            PIXI.SCALE_MODES.LINEAR,
            resolution ?? 2,
            // new PIXI.Rectangle(this.x, this.y, this.width, this.height) // TODO - crop to background
          )

          const dataURL = (this.app.renderer.plugins.extract as PIXI.Extract).base64(imageTexture, mimetype)
          imageTexture.destroy()
          this.root.removeChild(background)
          background.destroy()

          resolve(dataURL)
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  private pointerEnter = (event: PIXI.InteractionEvent) => {
    const { x, y } = this.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.onViewportPointerEnter?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private pointerDown = (event: PIXI.InteractionEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.dragInteraction.down(event)
    this.decelerateInteraction.down()

    if (this.hoveredNode === undefined && this.clickedNode === undefined && 
        this.hoveredEdge === undefined && this.clickedEdge === undefined &&
        this.hoveredAnnotation === undefined && this.clickedAnnotation == undefined
    ) {
      this.clickedContainer = true
      const { x, y } = this.root.toLocal(event.data.global)
      const client = clientPositionFromEvent(event.data.originalEvent)
      this.onViewportPointerDown?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })
    }
  }

  private pointerMove = (event: PIXI.InteractionEvent) => {
    this.dragInteraction.move(event)
    this.decelerateInteraction.move()

    const { x, y } = this.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)

    this.onViewportPointerMove?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private pointerUp = (event: PIXI.InteractionEvent) => {
    this.dragInteraction.up()
    this.decelerateInteraction.up()

    const { x, y } = this.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)

    if (this.dragging) {
      this.dragging = false
      this.clickedContainer = false
      this.onViewportDragEnd?.({
        type: 'viewportDrag',
        x,
        y,
        clientX: client.x,
        clientY: client.y,
        viewportX: this.x,
        viewportY: this.y,
        target: { x: this.x, y: this.y, zoom: this.zoom },
        altKey: this.altKey,
        ctrlKey: this.ctrlKey,
        metaKey: this.metaKey,
        shiftKey: this.shiftKey,
        ...pointerKeysFromEvent(event.data.originalEvent)
      })
    } else if (this.clickedContainer) {
      this.clickedContainer = false
      this.onViewportPointerUp?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })
      this.onViewportClick?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })

      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.onViewportDoubleClick?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })
      }
    }
  }

  private pointerLeave = (event: PIXI.InteractionEvent) => {
    const { x, y } = this.root.toLocal(event.data.global)
    const client = clientPositionFromEvent(event.data.originalEvent)
    this.onViewportPointerLeave?.({ type: 'viewportPointer', x, y, clientX: client.x, clientY: client.y, target: { x: this.x, y: this.y, zoom: this.zoom }, ...pointerKeysFromEvent(event.data.originalEvent) })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}


export const Renderer = (options: { container: HTMLDivElement, debug?: { logPerformance?: boolean, stats?: Stats } }) => {
  const pixiRenderer = new InternalRenderer(options)

  const render = <N extends Graph.Node, E extends Graph.Edge>(graph: { nodes: N[], edges: E[], options?: Options<N, E>, annotations?: Graph.Annotation[] }) => {
    (pixiRenderer as unknown as InternalRenderer<N, E>).update(graph)
  }

  render.delete = pixiRenderer.delete

  return render
}
