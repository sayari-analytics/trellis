/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Application, BitmapFont, BitmapText, Container, EventSystem, FederatedPointerEvent, Graphics,
  IBitmapTextStyle, MSAA_QUALITY, Matrix, Rectangle, RenderTexture, Renderer, Sprite,
} from 'pixi.js-legacy'
import Stats from 'stats.js'
import { Zoom } from './interaction/zoom'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import { Grid } from './grid'
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
  onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void,
  onViewportWheel?: (event: ViewportWheelEvent) => void
}

export const defaultOptions = {
  x: 0, y: 0, zoom: 1, minZoom: 0.025, maxZoom: 5
}

const NODE_RESOLUTION_RADIUS = 10 * 5 // maxRadius * minZoom


/**
 * TODO
 * - labels
 *   - correctly calculate min/max x/y when culling labels
 *   - fade labels out at low zoom
 *   - edge labels
 *   - lazily generate font, with option to pre-render
 * - move graph creation outside of renderer
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
  nodes: Node[] = []
  edges: Edge[] = []
  nodesById: Record<string, Node> = {}
  edgesById: Record<string, Edge> = {}

  onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportWheel?: (event: ViewportWheelEvent) => void

  constructor ({ container, options, debug, forceCanvas }: {
    container: HTMLDivElement,
    options: Options,
    debug?: boolean,
    forceCanvas?: boolean,
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
    this.root.addEventListener('pointerdown', this.pointerDown)
    this.root.addEventListener('pointermove', this.pointerMove)
    this.root.addEventListener('pointerup', this.pointerUp)
    this.root.addEventListener('pointerupoutside', this.pointerUp)
    this.root.addEventListener('pointercancel', this.pointerUp)
    view.addEventListener!('wheel', this.zoomInteraction.wheel, { passive: false })

    const step = 50
    const coordinates: Record<number, Set<number>> = {}

    for (const [x, y] of sampleCoordinatePlane(100000, step, 0.5)) {
      const node = new Node(this, x, y)
      this.nodes.push(node)

      if (coordinates[x] === undefined) {
        coordinates[x] = new Set()
      }
      coordinates[x].add(y)

      for (const adjacentX of [x - step, x]) {
        for (const adjacentY of [y - step, y, y + step]) {
          if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
            const edge = new Edge(this, x, y, adjacentX, adjacentY)
            this.edges.push(edge)
          }
        }
      }
    }

    this.update({ options })

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

    /**
     * make x,y coordinate scale relative to app.stage, ignoring zoom transforms applied to root
     * this only positions the graph correctly when zoom === 1
     * repositioning on wheel zoom works
     */
    this.#x = x
    this.root.x = -x + this.#halfWidth
    this.#minX = (x / _zoom) - (this.#halfWidth / _zoom)
    this.#maxX = (x / _zoom) + (this.#halfWidth / _zoom)

    this.#y = y
    this.root.y = -y + this.#halfHeight
    this.#minY = (y / _zoom) - (this.#halfHeight / _zoom)
    this.#maxY = (y / _zoom) + (this.#halfHeight / _zoom)

    /**
     * make x,y coordinate scale relative to root
     * this positions the graph correctly when zoom !== 1
     * but repositioning on wheel zoom is broken
     */
    // this.#x = x
    // this.root.x = (-x * _zoom) + this.#halfWidth
    // this.#minX = x - (this.#halfWidth / _zoom)
    // this.#maxX = x + (this.#halfWidth / _zoom)

    // this.#y = y
    // this.root.y = (-y * _zoom) + this.#halfHeight
    // this.#minY = y - (this.#halfHeight / _zoom)
    // this.#maxY = y + (this.#halfHeight / _zoom)

    this.app.renderer.resize(width, height)
  }

  update({ options }: { options: Options }) {
    this.onViewportDrag = options.onViewportDrag
    this.onViewportWheel = options.onViewportWheel

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

    // let t = performance.now()

    if (this.zoom > 0.25) {
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

    for (const node of this.nodes) {
      node.render()
    }

    if (this.zoom > 0.1) {
      this.edgesGraphic.visible = true
      for (const edge of this.edges) {
        edge.render()
      }
    } else {
      this.edgesGraphic.visible = false
    }

    // console.log(performance.now() - t)

    this.app.render()
  }

  delete() {

  }

  private pointerDown = (event: FederatedPointerEvent) => {
    this.dragInteraction.down(event)
    this.decelerateInteraction.down()
  }

  private pointerMove = (event: FederatedPointerEvent) => {
    this.dragInteraction.move(event)
    this.decelerateInteraction.move()
  }

  private pointerUp = () => {
    this.dragInteraction.up()
    this.decelerateInteraction.up()
  }
}


export class Node {

  static fontSize = 10
  static font = BitmapFont.from('Label', {
    fontFamily: 'Arial',
    fontSize: Node.fontSize * 2 * 5, // font size * retina * minZoom
    fill: 0x000000,
    stroke: 0xffffff,
    strokeThickness: 2 * 2 * 5,
  }, { chars: BitmapFont.ASCII })
  static TEXT_STYLE: Partial<IBitmapTextStyle> = { fontName: 'Label', fontSize: Node.fontSize, align: 'center' }

  renderer: StaticRenderer
  circle: Sprite
  label: BitmapText
  radius: number = 10
  minX: number
  minY: number
  maxX: number
  maxY: number

  constructor(renderer: StaticRenderer, x: number, y: number) {
    this.renderer = renderer
    this.circle = new Sprite(this.renderer.circleTexture)
    this.circle.anchor.set(0.5)
    this.circle.tint = 0xff4444
    this.circle.scale.set(this.radius / NODE_RESOLUTION_RADIUS)
    this.circle.x = x
    this.circle.y = y
    this.minX = this.circle.x - this.radius
    this.minY = this.circle.y - this.radius
    this.maxX = this.circle.x + this.radius
    this.maxY = this.circle.y + this.radius
    this.renderer.root.addChild(this.circle)

    this.label = new BitmapText('88.26.3876', Node.TEXT_STYLE)
    this.label.anchor.set(0.5)
    this.label.x = x
    this.label.y = y + 16
    this.renderer.labelContainer.addChild(this.label)
  }

  render() {
    if (
      this.maxX < this.renderer.minX ||
      this.maxY < this.renderer.minY ||
      this.minX > this.renderer.maxX ||
      this.minY > this.renderer.maxY
    ) {
      this.circle.visible = false
      this.label.visible = false
    } else {
      this.circle.visible = true
      this.label.visible = true
    }
  }
}


export class Edge {

  renderer: StaticRenderer

  constructor(renderer: StaticRenderer, x0: number, y0: number, x1: number, y1: number) {
    this.renderer = renderer
    this.renderer.edgesGraphic
      .lineStyle(1, '#aaa')
      .moveTo(x0, y0)
      .lineTo(x1, y1)
  }

  render() {

  }
}


const createCircleTexture = (renderer: StaticRenderer) => {
  const GRAPHIC = new Graphics()
    .beginFill(0xffffff)
    .drawCircle(0, 0, NODE_RESOLUTION_RADIUS)

  const renderTexture = RenderTexture.create({
    width: GRAPHIC.width,
    height: GRAPHIC.height,
    multisample: MSAA_QUALITY.HIGH,
    resolution: 2
  })

  renderer.app.renderer.render(GRAPHIC, {
    renderTexture,
    transform: new Matrix(1, 0, 0, 1, GRAPHIC.width / 2, GRAPHIC.height / 2)
  })

  if (renderer.app.renderer instanceof Renderer) {
    renderer.app.renderer.framebuffer.blit()
  }

  GRAPHIC.destroy(true)

  return renderTexture
}


const sampleCoordinatePlane = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample) * step
  let i = 0

  for (let x = -(side / 2); x < (side / 2); x += step) {
    for (let y = -(side / 2); y < (side / 2); y += step) {
      if (i >= count) {
        return
      }

      if (Math.random() > sample) {
        i++
        yield [x, y]
      }
    }
  }
}
