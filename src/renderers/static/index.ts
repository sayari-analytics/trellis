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


export type ViewportDragEvent = {
  type: 'viewportDrag',
  x: number,
  y: number,
  clientX: number,
  clientY: number,
  dx: number,
  dy: number,
  altKey?: boolean,
  ctrlKey?: boolean,
  metaKey?: boolean,
  shiftKey?: boolean
}
export type ViewportDragDecelerateEvent = {
  type: 'viewportDragDecelarate',
  dx: number,
  dy: number,
}
export type ViewportWheelEvent = {
  type: 'viewportWheel',
  x: number,
  y: number,
  clientX: number,
  clientY: number,
  dx: number,
  dy: number,
  dz: number,
}
export type Options = {
  x: number, y: number, zoom: number, width: number, height: number,
  onViewportDrag?: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void,
  onViewportWheel?: (event: ViewportWheelEvent) => void
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

  width: number
  height: number
  minZoom = 0.025
  maxZoom = 5
  debug?: Stats

  app: Application
  container: HTMLDivElement
  root = new Container()
  labelContainer = new Container()
  labelsMounted = false
  halfWidth: number
  halfHeight: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  zoomInteraction = new Zoom(this)
  dragInteraction = new Drag(this)
  decelerateInteraction = new Decelerate(this)
  // grid = new Grid(this, 24000, 24000, 100, { hideText: false })
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
    this.width = options.width
    this.height = options.height
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
      forceCanvas: forceCanvas,
    })

    this.halfWidth = this.width / 2
    this.halfHeight = this.height / 2
    this.app.stage.addChild(this.root)
    this.app.stage.x = this.halfWidth
    this.app.stage.y = this.halfHeight
    this.root.x = 0
    this.root.y = 0
    this.minX = -this.halfWidth
    this.minY = -this.halfHeight
    this.maxX = this.halfWidth
    this.maxY = this.halfHeight
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
      // this.nodesById[`${x}|${y}`] = node

      if (coordinates[x] === undefined) {
        coordinates[x] = new Set()
      }
      coordinates[x].add(y)

      for (const adjacentX of [x - step, x]) {
        for (const adjacentY of [y - step, y, y + step]) {
          if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
            const edge = new Edge(this, x, y, adjacentX, adjacentY)
            this.edges.push(edge)
            // this.edgesById[`${x}|${y}|${adjacentX}|${adjacentY}`] = edge
          }
        }
      }
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

    this.update({ options })
  }

  update({ options: { x, y, zoom, onViewportDrag, onViewportWheel } }: { options: Options }) {
    this.onViewportDrag = onViewportDrag
    this.onViewportWheel = onViewportWheel

    const _zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom))
    if (_zoom !== this.root.scale.x) {
      this.root.scale.set(_zoom)
    }

    const _x = -x
    if (_x !== this.root.x) {
      this.root.x = _x
      this.minX = (-this.root.x - this.halfWidth) / this.root.scale.x
      this.maxX = (-this.root.x + this.halfWidth) / this.root.scale.x
    }

    const _y = -y
    if (y !== this.root.y) {
      this.root.y = _y
      this.minY = (-this.root.y - this.halfHeight) / this.root.scale.x
      this.maxY = (-this.root.y + this.halfHeight) / this.root.scale.x
    }
  }

  render(dt: number) {
    this.decelerateInteraction.update(dt)

    // let t = performance.now()

    if (this.root.scale.x > 0.25) {
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

    if (this.root.scale.x > 0.1) {
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
    this.label.visible = true
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
