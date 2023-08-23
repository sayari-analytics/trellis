import {
  Application, Container, EventSystem, FederatedPointerEvent, Graphics, Rectangle, RenderTexture,
} from 'pixi.js-legacy'
import Stats from 'stats.js'
import { Zoom } from './interaction/zoom'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import { Grid } from './grid'
import { Node, createCircleTexture } from './node'
import { Edge } from './edge'
import * as Graph from '../..'


type Keys = { altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }
type MousePosition = { x: number, y: number, clientX: number, clientY: number }
type Position = 'nw' | 'ne' | 'se' | 'sw'
export type NodePointerEvent = { type: 'nodePointer', target: Graph.Node, targetIdx: number } & MousePosition & Keys
export type NodeDragEvent = { type: 'nodeDrag', dx: number, dy: number, target: Graph.Node, targetIdx: number } & MousePosition & Keys
export type EdgePointerEvent = { type: 'edgePointer', target: Graph.Edge, targetIdx: number } & MousePosition & Keys
export type AnnotationPointerEvent = { type: 'annotationPointer', position?: Position, target: Graph.Annotation, targetIdx: number } & MousePosition & Keys
export type AnnotationDragEvent = { type: 'annotationDrag',  dx: number, dy: number, target: Graph.Annotation, targetIdx: number } & MousePosition & Keys
export type AnnotationResizeEvent = { type: 'annotationResize', position: Position, target: Graph.Annotation, targetIdx: number } & MousePosition & Keys
export type ViewportPointerEvent = { type: 'viewportPointer', target: Graph.Viewport } & MousePosition & Keys
export type ViewportDragEvent = { type: 'viewportDrag', dx: number, dy: number } & MousePosition & Keys
export type ViewportDragDecelerateEvent = { type: 'viewportDragDecelarate', dx: number, dy: number } & Keys
export type ViewportWheelEvent = { type: 'viewportWheel', dx: number, dy: number, dz: number } & MousePosition & Keys
export type Options = {
  width: number, height: number, x?: number, y?: number, zoom?: number, minZoom?: number, maxZoom?: number,
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
}

export const defaultOptions = {
  x: 0, y: 0, zoom: 1, minZoom: 0.025, maxZoom: 5
}


/**
 * TODO
 * - labels
 *   - correctly calculate min/max x/y when culling labels
 *   - fade labels out at low zoom
 *   - edge labels
 *   - lazily generate font, with option to pre-render
 *   - fall back on Text for non-ASCII
 * - icons
 * - viewport interpolation
 * - node events
 *   - confirm that WheelEvent and FederatedPointerEvent both use the browser's viewport
 *   - remove expectedViewport/Node and instead disable interpolation on dragging/scrolling
 *   - disable node/edge interaction when zooming/dragging
 *   - move node to front on hover only if drag handlers are implemented
 * - enter/update/exit handlers
 */
export class StaticRenderer {

  get width() { return this.app.renderer.width }
  get height() { return this.app.renderer.height }
  // get rid of private properties with public getters?
  #x!: number
  get x() { return this.#x }
  #y!: number
  get y() { return this.#y }
  get zoom() { return this.root.scale.x }

  #minZoom!: number
  get minZoom() { return this.#minZoom }

  #maxZoom!: number
  get maxZoom() { return this.#maxZoom }

  #halfHeight!: number
  get halfHeight() { return this.#halfHeight }

  #halfWidth!: number
  get halfWidth() { return this.#halfWidth }

  #minX!: number
  get minX() { return this.#minX }

  #minY!: number
  get minY() { return this.#minY }

  #maxX!: number
  get maxX() { return this.#maxX }

  #maxY!: number
  get maxY() { return this.#maxY }

  debug?: Stats
  app: Application
  container: HTMLDivElement
  root = new Container()
  labelContainer = new Container()
  labelsMounted = false
  zoomInteraction = new Zoom(this)
  dragInteraction = new Drag(this)
  decelerateInteraction = new Decelerate(this)
  grid = new Grid(this, 24000, 24000, 100, { hideText: false })
  circleTexture: RenderTexture
  edgesGraphic = new Graphics()
  dragInertia = 0.88
  eventSystem: EventSystem
  nodes: Graph.Node[] = []
  edges: Graph.Edge[] = []
  nodeRenderers: Node[] = []
  edgeRenderers: Edge[] = []

  #doubleClickTimeout?: number
  #doubleClick = false

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

  constructor ({
    nodes, edges, options, container, debug, forceCanvas
  }: {
    nodes: Graph.Node[], edges: Graph.Edge[], options: Options,
    container: HTMLDivElement, debug?: boolean, forceCanvas?: boolean,
  }) {
    if (!(container instanceof HTMLDivElement)) {
      throw new Error('container must be an instance of HTMLDivElement')
    }

    this.container = container
    const view = document.createElement('canvas')
    view.onselectstart = () => false
    this.container.appendChild(view)

    this.app = new Application({
      view,
      width: options.width,
      height: options.height,
      resolution: 2,
      antialias: true,
      autoDensity: true,
      powerPreference: 'high-performance',
      backgroundAlpha: 0,
      forceCanvas: forceCanvas,
    })

    this.app.stage.addChild(this.root)
    this.circleTexture = createCircleTexture(this)
    this.eventSystem = new EventSystem(this.app.renderer)
    this.eventSystem.domElement = view
    this.root.eventMode = 'static'
    const MIN_COORDINATE = Number.MIN_SAFE_INTEGER / 2
    this.root.hitArea = new Rectangle(MIN_COORDINATE, MIN_COORDINATE, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    this.root.addChild(this.edgesGraphic)
    this.root.addEventListener('pointerenter', this.pointerEnter)
    this.root.addEventListener('pointerdown', this.pointerDown)
    this.root.addEventListener('pointermove', this.pointerMove)
    this.root.addEventListener('pointerup', this.pointerUp)
    this.root.addEventListener('pointerupoutside', this.pointerUp)
    this.root.addEventListener('pointercancel', this.pointerUp)
    this.root.addEventListener('pointerleave', this.pointerLeave)
    view.addEventListener!('wheel', this.zoomInteraction.wheel, { passive: false })

    this.update({ options })

    const nodesById: Record<string, Node> = {}
    for (const node of nodes) {
      const nodeRenderer = new Node(this, node)
      nodesById[node.id] = nodeRenderer
      this.nodeRenderers.push(nodeRenderer)
    }

    for (const edge of edges) {
      this.edgeRenderers.push(new Edge(this, nodesById[edge.source].node, nodesById[edge.target].node))
    }

    if (debug) {
      this.app.ticker.add((dt: number) => {
        this.debug?.update()
        this.render(dt)
      })
      this.debug = new Stats()
      this.debug.showPanel(0)
      document.body.appendChild(this.debug.dom)
    } else {
      this.app.ticker.add(this.render)
    }
  }

  setPosition(width: number, height: number, x: number, y: number, zoom: number, minZoom: number, maxZoom: number) {
    this.#minZoom = minZoom
    this.#maxZoom = maxZoom
    const _zoom = Math.max(minZoom, Math.min(maxZoom, zoom))
    this.root.scale.set(_zoom)

    this.#halfWidth = width / 2
    this.#halfHeight = height / 2

    this.#x = x
    this.root.x = (-x * _zoom) + this.#halfWidth
    this.#minX = x - (this.#halfWidth / _zoom)
    this.#maxX = x + (this.#halfWidth / _zoom)

    this.#y = y
    this.root.y = (-y * _zoom) + this.#halfHeight
    this.#minY = y - (this.#halfHeight / _zoom)
    this.#maxY = y + (this.#halfHeight / _zoom)

    this.app.renderer.resize(width, height)
  }

  update({ options }: { options: Options }) {
    this.onViewportPointerEnter = options.onViewportPointerEnter
    this.onViewportPointerDown = options.onViewportPointerDown
    this.onViewportDragStart = options.onViewportDragStart
    this.onViewportDrag = options.onViewportDrag
    this.onViewportDragEnd = options.onViewportDragEnd
    this.onViewportPointerMove = options.onViewportPointerMove
    this.onViewportClick = options.onViewportClick
    this.onViewportDoubleClick = options.onViewportDoubleClick
    this.onViewportPointerUp = options.onViewportPointerUp
    this.onViewportPointerLeave = options.onViewportPointerLeave
    this.onViewportWheel = options.onViewportWheel
    this.onNodePointerEnter = options.onNodePointerEnter
    this.onNodePointerDown = options.onNodePointerDown
    this.onNodeDragStart = options.onNodeDragStart
    this.onNodeDrag = options.onNodeDrag
    this.onNodeDragEnd = options.onNodeDragEnd
    this.onNodePointerUp = options.onNodePointerUp
    this.onNodeClick = options.onNodeClick
    this.onNodeDoubleClick = options.onNodeDoubleClick
    this.onNodePointerLeave = options.onNodePointerLeave
    this.onEdgePointerEnter = options.onEdgePointerEnter
    this.onEdgePointerDown = options.onEdgePointerDown
    this.onEdgePointerUp = options.onEdgePointerUp
    this.onEdgeClick = options.onEdgeClick
    this.onEdgeDoubleClick = options.onEdgeDoubleClick
    this.onEdgePointerLeave = options.onEdgePointerLeave

    this.setPosition(
      options.width,
      options.height,
      options.x ?? defaultOptions.x,
      options.y ?? defaultOptions.y,
      options.zoom ?? defaultOptions.zoom,
      options.minZoom ?? defaultOptions.minZoom,
      options.maxZoom ?? defaultOptions.maxZoom,
    )
  }

  render(dt: number) {
    this.decelerateInteraction.update(dt)

    if (this.zoom > 0.2) {
      this.labelContainer.alpha = this.zoom <= 0.3 ? (this.zoom - 0.2) / 0.3 : 1

      if (!this.labelsMounted) {
        this.root.addChild(this.labelContainer)
        this.labelsMounted = true
      }
    } else {
      if (this.labelsMounted) {
        this.root.removeChild(this.labelContainer)
        this.labelsMounted = false
      }
    }

    for (const node of this.nodeRenderers) {
      node.render()
    }

    if (this.zoom > 0.2) {
      this.edgesGraphic.visible = true
      for (const edge of this.edgeRenderers) {
        edge.render()
      }
    } else {
      this.edgesGraphic.visible = false
    }

    this.app.render()
  }

  delete() {
    clearTimeout(this.#doubleClickTimeout)
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
    if (this.onViewportDoubleClick) {
      if (this.#doubleClickTimeout === undefined) {
        this.#doubleClickTimeout = setTimeout(this.clearDoubleClick, 500)
      } else {
        this.#doubleClick = true
      }
    }

    this.dragInteraction.down(event)
    this.decelerateInteraction.down()

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
    const isDragging = this.dragInteraction.dragging
    this.dragInteraction.up(event)
    this.decelerateInteraction.up()

    const { x, y } = this.root.toLocal(event.global)

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

    if (!isDragging) {
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

      if (this.#doubleClick) {
        this.#doubleClick = false
        this.#doubleClickTimeout = undefined
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
    this.#doubleClickTimeout = undefined
    this.#doubleClick = false
  }
}
