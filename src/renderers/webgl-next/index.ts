import { Application, Container } from 'pixi.js'
import type { Texture, WebGLOptions, WebGPUOptions } from 'pixi.js'
import { CircleTexture } from './textures/circleTexture'
import { ArrowTexture } from './textures/arrowTexture'
import { TextTexture } from './textures/textTexture'
import { ImageTexture } from './textures/imageTexture'
import { Assets } from './assets'
import { Zoom } from './interaction/zoom'
import { Drag } from './interaction/drag'
import { Decelerate } from './interaction/decelerate'
import type { NodeComponent } from './components/nodeComponent'
import { DEFAULT_VIEWPORT_OPTIONS, ViewportComponent, ViewportOptions } from './components/viewportComponent'
import { EventsComponent, EventOptions } from './components/eventsComponent'
import { NodesComponent } from './components/nodesComponent'
import { EdgesComponent } from './components/edgesComponent'
import { Debug } from './components/debug'
import type { Node, Edge, Annotation } from '../../types'
import { doAllAsync, time } from './utils'

// const DYNAMIC_PARTICLE_CONTAINER_PROPERTIES = { position: true, scale: true, rotation: false, color: true }

export type RendererOptions = {
  container: HTMLDivElement
  width: number
  height: number
  maxZoom?: number
  alpha?: number
  color?: string
  antialias?: boolean
  resolution?: number
  renderer?: { type: 'webgl'; options?: Partial<WebGLOptions> } | { type: 'webgpu'; options?: Partial<WebGPUOptions> }
  debug?: boolean | { stats?: boolean; grid?: boolean; gridText?: boolean }
}

export class Renderer {
  app: Application
  domElement: HTMLDivElement
  maxZoom: number
  resolution: number
  nextGraph?: {
    nodes: Node[]
    edges: Edge[]
    viewport: ViewportOptions
    events?: EventOptions
    annotations?: Annotation[]
  }
  containers = {
    root: new Container(),
    // TODO - convert all node/edge sprites to particles
    // edges: new ParticleContainer({ dynamicProperties: DYNAMIC_PARTICLE_CONTAINER_PROPERTIES, isRenderGroup: true }),
    // nodes: new ParticleContainer({ dynamicProperties: DYNAMIC_PARTICLE_CONTAINER_PROPERTIES, isRenderGroup: true }),
    edges: new Container({ isRenderGroup: true }),
    nodes: new Container({ isRenderGroup: true }),
    labels: new Container({ isRenderGroup: true })
  }
  components!: {
    viewport: ViewportComponent
    events: EventsComponent
    nodes: NodesComponent
    edges: EdgesComponent
    debug?: Debug
  }
  textures!: {
    circle: CircleTexture
    arrow: ArrowTexture
    text: TextTexture
    image: ImageTexture
  }
  assets = {
    fonts: new Assets<void>(),
    images: new Assets<Texture>()
  }
  interactions = {
    zoom: new Zoom(this),
    drag: new Drag(this),
    decelerate: new Decelerate(this),
    draggedNode: undefined as NodeComponent | undefined
  }

  private cancelImageExport?: () => void
  private endRenderTime = Date.now()
  private awaitInit: Promise<void>

  constructor(options: RendererOptions) {
    if (!(options.container instanceof HTMLDivElement)) {
      throw new Error('container must be an instance of HTMLDivElement')
    }

    this.domElement = options.container
    this.resolution = options.resolution ?? 2
    this.maxZoom = options.maxZoom ?? DEFAULT_VIEWPORT_OPTIONS.maxZoom
    const canvas = document.createElement('canvas')
    canvas.onselectstart = () => false
    this.domElement.appendChild(canvas)

    this.app = new Application()
    this.awaitInit = this.app
      .init({
        canvas,
        width: options.width,
        height: options.height,
        resolution: this.resolution,
        antialias: options.antialias ?? true,
        backgroundAlpha: options.alpha ?? 0,
        backgroundColor: options.color ?? '#fff',
        webgl: options.renderer?.type === 'webgl' ? options.renderer.options ?? {} : undefined,
        webgpu: options.renderer?.type === 'webgpu' ? options.renderer.options ?? {} : undefined,
        autoDensity: true,
        powerPreference: 'high-performance'
      })
      .then(() => {
        this.app.stage.addChild(this.containers.root)
        this.containers.root.addChild(this.containers.edges)
        this.containers.root.addChild(this.containers.nodes)
        this.containers.root.addChild(this.containers.labels)
        this.textures = {
          circle: new CircleTexture(this.app, 10, this.maxZoom, this.resolution),
          arrow: new ArrowTexture(this.app, 6, 12, this.maxZoom, this.resolution),
          text: new TextTexture(this.app, this.maxZoom, this.resolution),
          image: new ImageTexture(this.assets.images, this.maxZoom)
        }
        this.components = {
          viewport: new ViewportComponent(this, options.width, options.height, this.maxZoom),
          events: new EventsComponent(this, canvas),
          nodes: new NodesComponent(this),
          edges: new EdgesComponent(this)
        }

        if (options.debug !== undefined && options.debug !== false) {
          this.components.debug = new Debug(this, options.debug)
          this.app.ticker.add((ticker) => this.debugRender(ticker.deltaTime))
        } else {
          this.app.ticker.add((ticker) => this.render(ticker.deltaTime))
        }
      })
  }

  update = (graph: { nodes: Node[]; edges: Edge[]; viewport: ViewportOptions; events?: EventOptions; annotations?: Annotation[] }) => {
    this.nextGraph = graph
    return this
  }

  delete = async () => {
    await this.awaitInit
    this.app.destroy(true, true)
    this.textures.circle.delete()
    this.textures.arrow.delete()
    this.textures.text.delete()
    this.textures.image.delete()
    this.components.viewport.delete()
    this.components.events.delete()
    this.components.nodes.delete()
    this.components.edges.delete()
    this.cancelImageExport?.()
  }

  image = (onfulfilled: (result: Blob) => void, onrejected: (err: unknown) => void) => {
    this.cancelImageExport = doAllAsync<unknown>(
      [this.assets.fonts.onComplete, this.assets.images.onComplete],
      () => onfulfilled(new Blob()),
      onrejected
    )
  }

  private render(dt: number) {
    this.components.viewport.render(dt, this.nextGraph?.viewport)
    this.components.nodes.render(dt, this.nextGraph?.nodes)
    this.components.edges.render(this.nextGraph?.edges)
    this.components.events.render(this.nextGraph?.events)
    this.app.render()

    this.nextGraph = undefined

    this.interactions.decelerate.render(dt)
    this.interactions.zoom.render()
  }

  private debugRender(dt: number) {
    const debug = this.components.debug!
    debug.renderApp?.update(Date.now() - this.endRenderTime, 50)

    this.components.viewport.render(dt, this.nextGraph?.viewport)
    debug.renderNodes?.update(
      time(() => this.components.nodes.render(dt, this.nextGraph?.nodes)),
      50
    )
    debug.renderEdges?.update(
      time(() => this.components.edges.render(this.nextGraph?.edges)),
      50
    )
    debug.renderEvents?.update(
      time(() => this.components.events.render(this.nextGraph?.events)),
      50
    )
    debug.renderPixi?.update(
      time(() => this.app.render()),
      50
    )

    this.nextGraph = undefined

    this.interactions.decelerate.render(dt)
    this.interactions.zoom.render()

    debug.render()
    this.endRenderTime = Date.now()
  }
}
