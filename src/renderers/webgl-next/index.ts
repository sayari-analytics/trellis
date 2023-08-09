import { Application, Container, EventSystem, FederatedPointerEvent, Rectangle } from 'pixi.js'
import { Grid } from './grid'
import { Zoom } from './interaction/zoom'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import * as Graph from '../..'


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
  animateViewportPosition: 600, animateViewportZoom: 600, animateNodePosition: 800, animateNodeRadius: 800,
  dragInertia: 0.88,
  nodesEqual: Object.is, edgesEqual: Object.is,
  nodeIsEqual: Object.is, edgeIsEqual: Object.is,
}


export class InternalRenderer<N extends Graph.Node = Graph.Node, E extends Graph.Edge = Graph.Edge>{
  container: HTMLDivElement
  app: Application
  root = new Container()
  eventSystem: EventSystem
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
  zoomInteraction: Zoom
  dragInteraction: Drag
  decelerateInteraction: Decelerate
  dragInertia = RENDERER_OPTIONS.dragInertia
  animateViewportPosition: number | false = RENDERER_OPTIONS.animateViewportPosition
  animateViewportZoom: number | false = RENDERER_OPTIONS.animateViewportZoom
  animateNodePosition: number | false = RENDERER_OPTIONS.animateNodePosition
  animateNodeRadius: number | false = RENDERER_OPTIONS.animateNodeRadius
  hoveredNode?: undefined // NodeRenderer<N, E>
  clickedNode?: undefined // NodeRenderer<N, E>
  hoveredEdge?: undefined // EdgeRenderer<N, E>
  clickedEdge?: undefined // EdgeRenderer<N, E>
  hoveredAnnotation?: undefined // AnnotationRenderer
  clickedAnnotation?: undefined // AnnotationRenderer
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

  private doubleClickTimeout?: number
  private doubleClick = false
  private clickedContainer = false
  // private interpolateX?: (time: number) => { value: number, done: boolean }
  // private targetX = RENDERER_OPTIONS.x
  // private interpolateY?: (time: number) => { value: number, done: boolean }
  // private targetY = RENDERER_OPTIONS.y
  // private interpolateZoom?: (time: number) => { value: number, done: boolean }
  // private targetZoom = RENDERER_OPTIONS.zoom
  // private firstRender = true

  constructor (options: { container: HTMLDivElement, debug?: boolean }) {
    if (!(options.container instanceof HTMLDivElement)) {
      throw new Error('container must be an instance of HTMLDivElement')
    }

    this.container = options.container
    const view = document.createElement('canvas')
    view.onselectstart = () => false
    this.container.appendChild(view)

    this.app = new Application({
      view,
      width: this.width,
      height: this.height,
      resolution: 2,
      antialias: true,
      autoDensity: true,
      powerPreference: 'high-performance',
      backgroundAlpha: 0,
    })

    this.app.stage.addChild(this.root)

    new Grid(this, 1000, 1000, 50)

    this.eventSystem = new EventSystem(this.app.renderer)
    this.eventSystem.domElement = view
    this.root.interactive = true
    const MIN_COORDINATE = Number.MIN_SAFE_INTEGER / 2
    this.root.hitArea = new Rectangle(MIN_COORDINATE, MIN_COORDINATE, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)

    this.zoomInteraction = new Zoom(this)
    this.dragInteraction = new Drag(this)
    this.decelerateInteraction = new Decelerate(this)
    
    this.root.addEventListener('pointerenter', this.pointerEnter)
    this.root.addEventListener('pointerdown', this.pointerDown)
    this.root.addEventListener('pointermove', this.pointerMove)
    this.root.addEventListener('pointerup', this.pointerUp)
    this.root.addEventListener('pointerupoutside', this.pointerUp)
    this.root.addEventListener('pointercancel', this.pointerUp)
    this.root.addEventListener('pointerleave', this.pointerLeave)
    view.addEventListener!('wheel', this.zoomInteraction.wheel)

    this.app.ticker.add(this.render)
  }

  update = ({
    nodes,
    edges,
    options: {
      width = RENDERER_OPTIONS.width, height = RENDERER_OPTIONS.height, x = RENDERER_OPTIONS.x, y = RENDERER_OPTIONS.y, zoom = RENDERER_OPTIONS.zoom,
      minZoom = RENDERER_OPTIONS.minZoom, maxZoom = RENDERER_OPTIONS.maxZoom,
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

    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.app.renderer.resize(this.width, this.height)
      // this.viewportDirty = true
    }

    // if (zoom !== this.targetZoom) {
    //   if (zoom === this.expectedViewportZoom || !this.animateViewportZoom || this.firstRender) {
    //     this.interpolateZoom = undefined
    //     this.zoom = zoom
    //     this.root.scale.set(Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom)))
    //   } else {
    //     this.interpolateZoom = interpolate(this.zoom, zoom, this.animateViewportZoom, this.time)
    //   }

    //   this.expectedViewportZoom = undefined
    //   this.targetZoom = zoom
    //   this.viewportDirty = true
    // }
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom))
    this.root.scale.set(this.zoom)

    // if (x !== this.targetX) {
    //   if (x === this.expectedViewportXPosition || !this.animateViewportPosition || this.firstRender) {
    //     this.interpolateX = undefined
    //     this.x = x
    //   } else {
    //     this.interpolateX = interpolate(this.x, x, this.animateViewportPosition, this.time)
    //   }

    //   this.expectedViewportXPosition = undefined
    //   this.targetX = x
    //   this.viewportDirty = true
    // }
    this.x = x

    // if (y !== this.targetY) {
    //   if (y === this.expectedViewportYPosition || !this.animateViewportPosition || this.firstRender) {
    //     this.interpolateY = undefined
    //     this.y = y
    //   } else {
    //     this.interpolateY = interpolate(this.y, y, this.animateViewportPosition, this.time)
    //   }

    //   this.expectedViewportYPosition = undefined
    //   this.targetY = y
    //   this.viewportDirty = true
    // }
    this.y = y

    this.root.x = (this.x * this.zoom) + (this.width / 2)
    this.root.y = (this.y * this.zoom) + (this.height / 2)
  }

  render = (dt: number) => {
    this.decelerateInteraction.update(dt)
    this.app.render()
  }

  delete = () => {
  }

  image = () => {
    return new Promise((resolve, reject) => {
      // wait for font and images to load
      this.app.renderer.extract.canvas(this.root).toBlob!((blob) => {
        if (blob !== null) {
          resolve(blob)
        } else {
          reject(new Error('Failed to generate blob'))
        }
      })
    })
  }

  private pointerEnter = (event: FederatedPointerEvent) => {
    const { x, y } = this.root.toLocal(event.global)
    this.onViewportPointerEnter?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: { x: this.x, y: this.y, zoom: this.zoom },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerDown = (event: FederatedPointerEvent) => {
    if (this.doubleClickTimeout === undefined) {
      this.doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
    } else {
      this.doubleClick = true
    }

    this.dragInteraction.down(event)
    this.decelerateInteraction.down()

    // TODO - if pointer events on nodes/edges/annotations don't bubble
    // can we remove these checks and remove this.clickedContainer
    if (
      this.hoveredNode === undefined && this.clickedNode === undefined && 
      this.hoveredEdge === undefined && this.clickedEdge === undefined &&
      this.hoveredAnnotation === undefined && this.clickedAnnotation == undefined
    ) {
      this.clickedContainer = true
      const { x, y } = this.root.toLocal(event.global)
      this.onViewportPointerDown?.({
        type: 'viewportPointer',
        x,
        y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: { x: this.x, y: this.y, zoom: this.zoom },
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
    }
  }

  private pointerMove = (event: FederatedPointerEvent) => {
    this.dragInteraction.move(event)
    this.decelerateInteraction.move()

    const { x, y } = this.root.toLocal(event.global)

    this.onViewportPointerMove?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: { x: this.x, y: this.y, zoom: this.zoom },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private pointerUp = (event: FederatedPointerEvent) => {
    this.dragInteraction.up(event)
    this.decelerateInteraction.up()

    const { x, y } = this.root.toLocal(event.global)

    if (this.clickedContainer) {
      this.clickedContainer = false
      this.onViewportPointerUp?.({
        type: 'viewportPointer',
        x,
        y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: { x: this.x, y: this.y, zoom: this.zoom },
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })
      this.onViewportClick?.({
        type: 'viewportPointer',
        x,
        y,
        clientX: event.clientX,
        clientY: event.clientY,
        target: { x: this.x, y: this.y, zoom: this.zoom },
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      })

      if (this.doubleClick) {
        this.doubleClick = false
        this.doubleClickTimeout = undefined
        this.onViewportDoubleClick?.({
          type: 'viewportPointer',
          x,
          y,
          clientX: event.clientX,
          clientY: event.clientY,
          target: { x: this.x, y: this.y, zoom: this.zoom },
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        })
      }
    }
  }

  private pointerLeave = (event: FederatedPointerEvent) => {
    const { x, y } = this.root.toLocal(event.global)
    this.onViewportPointerLeave?.({
      type: 'viewportPointer',
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      target: { x: this.x, y: this.y, zoom: this.zoom },
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    })
  }

  private clearDoubleClick = () => {
    this.doubleClickTimeout = undefined
    this.doubleClick = false
  }
}
