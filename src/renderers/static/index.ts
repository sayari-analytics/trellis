import { Application, Container, EventSystem, FederatedPointerEvent, Rectangle } from 'pixi.js-legacy'
import Stats from 'stats.js'
import * as Graph from '../..'
import { Zoom } from './interaction/zoom'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import { Grid } from './grid'
import { NodeRenderer } from './node'
import { EdgeRenderer } from './edge'
import { ArrowTexture } from './textures/arrow'
import { CircleTexture } from './textures/circle'
import { Font } from './objects/font'
import { interpolate } from '../../utils'
import { logUnknownEdgeError } from './utils'


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
  animateViewport?: number | boolean, animateNodePosition?: number | boolean, animateNodeRadius?: number | boolean,
  dragInertia?: number
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
  x: 0, y: 0, zoom: 1, minZoom: 0.025, maxZoom: 4,
  animateViewport: 800, animateNodePosition: 800, animateNodeRadius: 800,
  dragInertia: 0.88,
}


// TODO - make configurable
export const MIN_LABEL_ZOOM = 0.25
export const MIN_NODE_STROKE_ZOOM = 0.3
export const MIN_NODE_INTERACTION_ZOOM = 0.1
export const MIN_EDGES_ZOOM = 0.15


/**
 * TODO
 * - node position interpolation
 * - labels
 *   - label origin and rotation
 *   - fall back on Text for non-ASCII
 *   - edge labels
 *   - correctly calculate min/max x/y when culling labels
 *   - lazily generate font, with option to pre-render
 * - node events
 *   - move node to front on hover if drag handlers are implemented
 *     - transition objects within container child order, rather than between layers. move to top on mouseenter, bottom on mouseleave
 * - icons
 * - badges
 */
export class StaticRenderer {

  width: number
  height: number
  x!: number
  y!: number
  get zoom() { return this.root.scale.x }
  minZoom!: number
  maxZoom!: number
  minX!: number
  minY!: number
  maxX!: number
  maxY!: number

  stats?: Stats
  grid?: Grid
  app: Application
  container: HTMLDivElement
  root = new Container()
  edgesContainer = new Container()
  nodesContainer = new Container()
  labelsContainer = new Container()
  zoomInteraction = new Zoom(this)
  dragInteraction = new Drag(this)
  decelerateInteraction = new Decelerate(this)
  font = new Font()
  eventSystem: EventSystem
  nodes: Graph.Node[] = []
  nodeRenderersById: Record<string, NodeRenderer> = {}
  edges: Graph.Edge[] = []
  edgeRenderersById: Record<string, EdgeRenderer> = {}
  #doubleClickTimeout?: number
  #doubleClick = false
  #renderedPosition = false
  #renderedNodes = false
  #interpolateX?: (dt: number) => { value: number, done: boolean }
  #interpolateY?: (dt: number) => { value: number, done: boolean }
  #interpolateZoom?: (dt: number) => { value: number, done: boolean }
  dragInertia = defaultOptions.dragInertia
  animateViewport: number | false = defaultOptions.animateViewport
  animateNodePosition: number | false = defaultOptions.animateNodePosition
  animateNodeRadius: number | false = defaultOptions.animateNodeRadius
  circle: CircleTexture
  arrow: ArrowTexture

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

    this.width = options.width
    this.height = options.height
    this.app.stage.addChild(this.root)
    this.circle = new CircleTexture(this)
    this.arrow = new ArrowTexture(this)
    this.eventSystem = new EventSystem(this.app.renderer)
    this.eventSystem.domElement = view
    this.root.eventMode = 'static'
    const MIN_COORDINATE = Number.MIN_SAFE_INTEGER / 2
    this.root.hitArea = new Rectangle(MIN_COORDINATE, MIN_COORDINATE, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    this.root.addChild(this.edgesContainer)
    this.root.addChild(this.nodesContainer)
    this.root.addChild(this.labelsContainer)
    this.root.addEventListener('pointerenter', this.pointerEnter)
    this.root.addEventListener('pointerdown', this.pointerDown)
    this.root.addEventListener('pointermove', this.pointerMove)
    this.root.addEventListener('pointerup', this.pointerUp)
    this.root.addEventListener('pointerupoutside', this.pointerUp)
    this.root.addEventListener('pointercancel', this.pointerUp)
    this.root.addEventListener('pointerleave', this.pointerLeave)
    view.addEventListener!('wheel', this.zoomInteraction.wheel, { passive: false })

    this.update({ nodes, edges, options })

    if (debug) {
      // this.grid = new Grid(this, 24000, 24000, 100, { hideText: false })
      this.stats = new Stats()
      this.stats.showPanel(0)
      document.body.appendChild(this.stats.dom)
      this.app.ticker.add((dt: number) => {
        this.stats?.update()
        this.render(dt)
      })
    } else {
      this.app.ticker.add(this.render)
    }
  }

  update({ nodes, edges, options }: { nodes: Graph.Node[], edges: Graph.Edge[], options: Options }) {
    this.animateViewport = options.animateViewport === true || options.animateViewport === undefined ?
      defaultOptions.animateViewport :
      options.animateViewport
    this.animateNodePosition = options.animateNodePosition === true || options.animateNodePosition === undefined ?
      defaultOptions.animateNodePosition :
      options.animateNodePosition
    this.animateNodeRadius = options.animateNodeRadius === true || options.animateNodeRadius === undefined ?
      defaultOptions.animateNodeRadius :
      options.animateNodeRadius
    this.dragInertia = options.dragInertia ?? defaultOptions.dragInertia
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
    this.minZoom = options.minZoom ?? defaultOptions.minZoom
    this.maxZoom = options.maxZoom ?? defaultOptions.maxZoom


    /**
     * update dimensions
     */
    if (options.width !== this.width || options.height !== this.height) {
      this.width = options.width
      this.height = options.height
      this.app.renderer.resize(this.width, this.height)
    }

    /**
     * update viewport
     * 
     * interpolate position if all of the following are true:
     * - not dragging/zooming
     * - viewport position has changed
     * - the animateViewport option is not disabled
     * - it's not the first render
     */
    const zoom = Math.max(this.minZoom, Math.min(this.maxZoom, options.zoom ?? defaultOptions.zoom))
    const x = options.x ?? defaultOptions.x
    const y = options.y ?? defaultOptions.y
    const xChanged = x !== this.x
    const yChanged = y !== this.y
    const zoomChanged = zoom !== this.zoom

    if (
      !this.dragInteraction.dragging && !this.decelerateInteraction.decelerating && !this.zoomInteraction.zooming &&
      (xChanged || yChanged || zoomChanged) &&
      this.animateViewport && this.#renderedPosition
    ) {
      if (xChanged) {
        this.#interpolateX = interpolate(this.x, x, this.animateViewport)
      }
      if (yChanged) {
        this.#interpolateY = interpolate(this.y, y, this.animateViewport)
      }
      if (zoomChanged) {
        this.#interpolateZoom = interpolate(this.zoom, zoom, this.animateViewport)
      }
    } else {
      this.setPosition(x, y, zoom)
      this.#renderedPosition = true
      this.#interpolateX = undefined
      this.#interpolateY = undefined
      this.#interpolateZoom = undefined
    }


    const shouldUpdateNodes = this.nodes !== nodes && !(this.nodes.length === 0 && nodes.length === 0)
    const shouldUpdateEdges = this.edges !== edges && !(this.edges.length === 0 && edges.length === 0)


    /**
     * update nodes
     */
    if (shouldUpdateNodes) {
      const nodeRenderersById: Record<string, NodeRenderer> = {}

      for (const node of nodes) {
        if (this.nodeRenderersById[node.id] === undefined) {
          // enter
          nodeRenderersById[node.id] = new NodeRenderer(this, node)
        } else if (node !== this.nodeRenderersById[node.id].node) {
          // update
          nodeRenderersById[node.id] = this.nodeRenderersById[node.id].update(node)
        } else {
          nodeRenderersById[node.id] = this.nodeRenderersById[node.id]
        }
      }

      for (const node of this.nodes) {
        if (nodeRenderersById[node.id] === undefined) {
          // exit
          this.nodeRenderersById[node.id].delete()
        }
      }

      this.nodes = nodes
      this.nodeRenderersById = nodeRenderersById
      this.#renderedNodes = true
    }


    /**
     * update edges
     */
    if (shouldUpdateEdges) {
      const edgeRenderersById: Record<string, EdgeRenderer> = {}

      for (const edge of edges) {
        if (this.edgeRenderersById[edge.id] === undefined) {
          // enter
          const source = this.nodeRenderersById[edge.source]
          const target = this.nodeRenderersById[edge.target]
          if (source !== undefined && target !== undefined) {
            edgeRenderersById[edge.id] = new EdgeRenderer(this, edge, source, target)
          } else {
            logUnknownEdgeError(source.node, target.node)
          }
        } else if (edge !== this.edgeRenderersById[edge.id].edge) {
          // update
          const source = this.nodeRenderersById[edge.source]
          const target = this.nodeRenderersById[edge.target]
          if (source !== undefined && target !== undefined) {
            edgeRenderersById[edge.id] = this.edgeRenderersById[edge.id].update(edge, source, target)
          } else {
            logUnknownEdgeError(source.node, target.node)
          }
        } else {
          edgeRenderersById[edge.id] = this.edgeRenderersById[edge.id]
        }
      }

      for (const edge of this.edges) {
        if (edgeRenderersById[edge.id] === undefined) {
          // exit
          this.edgeRenderersById[edge.id].delete()
        }
      }

      this.edges = edges
      this.edgeRenderersById = edgeRenderersById
      this.#renderedNodes = true
    } else if (shouldUpdateNodes) {
      // TODO - make node move/resize automatically update edge position
      for (const edge of edges) {
        const source = this.nodeRenderersById[edge.source]
        const target = this.nodeRenderersById[edge.target]
        if (source !== undefined && target !== undefined) {
          this.edgeRenderersById[edge.id].update(edge, source, target)
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `Error: Cannot render edge ${source === undefined ? `from unknown node ${source}` : `to unknown Node ${target}`}`
          )
        }
      }
    }

    this.zoomInteraction.zooming = false
  }

  render(dt: number) {
    this.decelerateInteraction.update(dt)

    let _x: number | undefined
    let _y: number | undefined
    let _zoom: number | undefined

    if (this.#interpolateX) {
      const { value, done } = this.#interpolateX(dt)
      _x = value

      if (done) {
        this.#interpolateX = undefined
      }
    }

    if (this.#interpolateY) {
      const { value, done } = this.#interpolateY(dt)
      _y = value

      if (done) {
        this.#interpolateY = undefined
      }
    }

    if (this.#interpolateZoom) {
      const { value, done } = this.#interpolateZoom(dt)
      _zoom = value

      if (done) {
        this.#interpolateZoom = undefined
      }
    }

    if (_zoom !== undefined || _x !== undefined || _y !== undefined) {
      this.setPosition(_x ?? this.x, _y ?? this.y, _zoom ?? this.zoom)
    }

    for (const node of this.nodes) {
      this.nodeRenderersById[node.id].render()
    }

    for (const edge of this.edges) {
      this.edgeRenderersById[edge.id].render()
    }

    this.app.render()
  }

  delete() {
    clearTimeout(this.#doubleClickTimeout)
    this.app.destroy(true, true)
  }

  private setPosition(x: number, y: number, zoom: number) {
    const halfWidth = this.width / 2
    const halfHeight = this.height / 2

    this.root.scale.set(zoom)

    this.x = x
    this.root.x = (-x * zoom) + halfWidth
    this.minX = x - (halfWidth / zoom) // + (50 / zoom)
    this.maxX = x + (halfWidth / zoom) // - (50 / zoom)

    this.y = y
    this.root.y = (-y * zoom) + halfHeight
    this.minY = y - (halfHeight / zoom) // + (50 / zoom)
    this.maxY = y + (halfHeight / zoom) // - (50 / zoom)
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

  // TODO - pointerupoutside doesn't work for nodes but does for viewport
  // if node is dragging, fire onNodePointerUp on pointer up outside
  // TODO - don't fire pointer up if it's handled by a node/edge pointerUp handler
  // but still complete drag/decelarate event
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
