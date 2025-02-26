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
import type { Node, Edge, Annotation } from '../../types'
import { doAllAsync } from './utils'
import { Debug } from './debug'

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
  renderedNodes = false
  edges: Edge[] = []
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
    labels: new Container({ isRenderGroup: true }),
    interaction: new Container()
  }
  components!: {
    viewport: ViewportComponent
    events: EventsComponent
    nodes: NodesComponent
    edges: EdgesComponent
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
    draggedNode: undefined as NodeComponent | undefined,
    hoveredNode: undefined as NodeComponent | undefined
  }
  debug?: Debug

  private cancelImageExport?: () => void

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
    // this.containers.labels.cullableChildren = true
    // this.containers.interaction.cullableChildren = true

    this.app = new Application()
    this.app
      .init({
        canvas,
        width: options.width,
        height: options.height,
        resolution: this.resolution,
        antialias: options.antialias ?? false,
        backgroundAlpha: options.alpha ?? 0,
        backgroundColor: options.color ?? '#fff',
        webgl: options.renderer?.type === 'webgl' ? options.renderer.options ?? {} : undefined,
        webgpu: options.renderer?.type === 'webgpu' ? options.renderer.options ?? {} : undefined,
        autoDensity: true,
        powerPreference: 'high-performance'
      })
      .then(() => {
        this.app.stage.addChild(this.containers.root)
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
          this.debug = new Debug(this, options.debug)
          this.app.ticker.add((ticker) => this.debugRender(ticker.deltaTime))
        } else {
          this.app.ticker.add((ticker) => this.render(ticker.deltaTime))
        }
      })
  }

  update(graph: { nodes: Node[]; edges: Edge[]; viewport: ViewportOptions; events?: EventOptions; annotations?: Annotation[] }) {
    this.nextGraph = graph
    return this
  }

  delete() {
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

  image(onfulfilled: (result: Blob) => void, onrejected: (err: unknown) => void) {
    this.cancelImageExport = doAllAsync<unknown>(
      [this.assets.fonts.onComplete, this.assets.images.onComplete],
      () => onfulfilled(new Blob()),
      onrejected
    )
  }

  private render(dt: number) {
    const nodesChanged = this.nextGraph !== undefined && this.nextGraph.nodes !== this.components.nodes.nodes

    this.components.viewport.render(dt, this.nextGraph?.viewport)
    this.components.events.render(this.nextGraph?.events)
    this.components.nodes.render(dt, this.nextGraph?.nodes)
    this.components.edges.render(this.nextGraph?.edges, nodesChanged)

    this.app.render()

    this.renderedNodes = this.nextGraph !== undefined && this.nextGraph.nodes.length > 0
    this.interactions.zoom.zooming = false
    this.nextGraph = undefined
    this.interactions.decelerate.render(dt)
  }

  private endRenderTime?: number

  private debugRender(dt: number) {
    if (this.endRenderTime !== undefined) {
      this.debug!.renderApp?.update(Date.now() - this.endRenderTime, 50)
    }

    const nodesChanged = this.nextGraph !== undefined && this.nextGraph.nodes !== this.components.nodes.nodes

    this.components.viewport.render(dt, this.nextGraph?.viewport)

    this.components.events.render(this.nextGraph?.events)

    const nodeRenderDeltaTime = time(() => this.components.nodes.render(dt, this.nextGraph?.nodes))
    this.debug!.renderNodes?.update(nodeRenderDeltaTime, 50)

    const edgeRenderDeltaTime = time(() => this.components.edges.render(this.nextGraph?.edges, nodesChanged))
    this.debug!.renderEdges?.update(edgeRenderDeltaTime, 50)

    const pixiRenderDeltaTime = time(() => {
      // const viewport = this.components.viewport
      // const bbox = new Rectangle(0 + 200, 0 + 200, viewport.width - 400, viewport.height - 400)
      // Culler.shared.cull(this.containers.labels, bbox)
      // Culler.shared.cull(this.containers.interaction, bbox)
      this.app.render()
    })
    this.debug!.renderPixi?.update(pixiRenderDeltaTime, 50)

    this.renderedNodes = this.nextGraph !== undefined && this.nextGraph.nodes.length > 0
    this.interactions.zoom.zooming = false
    this.nextGraph = undefined
    this.interactions.decelerate.render(dt)

    this.debug!.stats?.update()
    this.endRenderTime = Date.now()
  }
}

const time = (fn: () => void) => {
  const t0 = Date.now()
  fn()
  return Date.now() - t0
}
