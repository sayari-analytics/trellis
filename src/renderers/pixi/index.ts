import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import FontFaceObserver from 'fontfaceobserver'
import { RendererOptions, DEFAULT_RENDERER_OPTIONS, DEFAULT_NODE_STYLES, DEFAULT_EDGE_STYLES } from '../options'
import { PositionedNode, PositionedEdge } from '../../index'
import { animationFrameLoop, noop } from '../../utils'
import { edgeStyleSelector, nodeStyleSelector, NodeStyleSelector, EdgeStyleSelector } from '../utils'
import { NodeContainer } from './nodeContainer'
import { EdgeContainer } from './edgeContainer'


new FontFaceObserver('Material Icons').load()
export const ANIMATION_DURATION = 800


export class Renderer {

  onNodeMouseEnter?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseDown?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeDrag?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseUp?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseLeave?: (node: PositionedNode, details: { x: number, y: number }) => void
  onEdgeMouseEnter?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseDown?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeDrag?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseUp?: (node: PositionedEdge, details: { x: number, y: number }) => void
  onEdgeMouseLeave?: (node: PositionedEdge, details: { x: number, y: number }) => void

  nodeStyleSelector: NodeStyleSelector
  edgeStyleSelector: EdgeStyleSelector
  stats?: Stats
  hoveredNode?: string
  clickedNode?: string
  dirty = false
  renderTime = Date.now()
  animationTime = 0
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  nodesById: { [id: string]: NodeContainer } = {}
  edgesById: { [id: string]: EdgeContainer } = {}
  edgeGroups: { [source: string]: { [target: string]: Set<string> } } = {}

  app: PIXI.Application
  viewport: Viewport

  constructor({
    id, nodeStyle = DEFAULT_RENDERER_OPTIONS.nodeStyle, edgeStyle = DEFAULT_RENDERER_OPTIONS.edgeStyle,
    onNodeMouseEnter = noop, onNodeMouseDown = noop, onNodeDrag = noop, onNodeMouseUp = noop, onNodeMouseLeave = noop,
    onEdgeMouseEnter = noop, onEdgeMouseDown = noop, onEdgeDrag = noop, onEdgeMouseUp = noop, onEdgeMouseLeave = noop,
    stats,
  }: RendererOptions) {
    this.onNodeMouseEnter = onNodeMouseEnter
    this.onNodeMouseDown = onNodeMouseDown
    this.onNodeDrag = onNodeDrag
    this.onNodeMouseUp = onNodeMouseUp
    this.onNodeMouseLeave = onNodeMouseLeave
    this.onEdgeMouseEnter = onEdgeMouseEnter
    this.onEdgeMouseDown = onEdgeMouseDown
    this.onEdgeDrag = onEdgeDrag
    this.onEdgeMouseUp = onEdgeMouseUp
    this.onEdgeMouseLeave = onEdgeMouseLeave
    this.nodeStyleSelector = nodeStyleSelector({ ...DEFAULT_NODE_STYLES, ...nodeStyle })
    this.edgeStyleSelector = edgeStyleSelector({ ...DEFAULT_EDGE_STYLES, ...edgeStyle })
    this.stats = stats


    const container = document.getElementById(id)
    if (container === null) {
      throw new Error(`Element #${id} not found`)
    }

    const SCREEN_WIDTH = container.offsetWidth
    const SCREEN_HEIGHT = container.offsetHeight
    const WORLD_WIDTH = SCREEN_WIDTH // * 2
    const WORLD_HEIGHT = SCREEN_HEIGHT // * 2

    /**
     * TODO - max out render performance, even on machines w/o dedicated GPU
     * just twist all the knobs...
     */
    this.app = new PIXI.Application({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      resolution: 2,
      transparent: true,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      powerPreference: 'high-performance',
    })
    // this.app.view.style.width = `${SCREEN_WIDTH}px`
    this.labelsLayer.interactiveChildren = false

    this.viewport = new Viewport({
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      interaction: this.app.renderer.plugins.interaction
    })

    this.app.stage.addChild(this.viewport.drag().pinch().wheel().decelerate())

    this.viewport.clampZoom({ minWidth: 600, maxWidth: 60000 })
    this.viewport.center = new PIXI.Point(0, 0)
    this.viewport.setZoom(0.5, true)
    this.viewport.addChild(this.edgesLayer)
    this.viewport.addChild(this.nodesLayer)
    this.viewport.addChild(this.labelsLayer)
    this.viewport.addChild(this.frontNodeLayer)
    this.viewport.addChild(this.frontLabelLayer)
    this.app.view.addEventListener('wheel', (event) => { event.preventDefault() })

    container.appendChild(this.app.view)

    animationFrameLoop(this.render)
  }

  layout = ({ nodes, edges }: {
    nodes: { [key: string]: PositionedNode },
    edges: { [key: string]: PositionedEdge }
  }) => {
    this.animationTime = 0

    for (const edgeId in edges) {
      const [min, max] = [edges[edgeId].source.id, edges[edgeId].target.id].sort()
      if (this.edgeGroups[min] === undefined) {
        this.edgeGroups[min] = {}
      }
      if (this.edgeGroups[min][max] === undefined) {
        this.edgeGroups[min][max] = new Set()
      }
      this.edgeGroups[min][max].add(edgeId)
    }

    for (const nodeId in nodes) {
      if (this.nodesById[nodeId] === undefined) {
        // node enter
        const nodeContainer = new NodeContainer(
          this,
          nodes[nodeId],
          this.nodeStyleSelector,
          this.nodesLayer,
          this.labelsLayer,
        )
          .set(nodes[nodeId])

        this.nodesById[nodes[nodeId].id] = nodeContainer
        this.dirty = true
      } else {
        // node update
        this.nodesById[nodeId].set(nodes[nodeId])

        this.dirty = true
      }
    }

    for (const nodeId in this.nodesById) {
      if (nodes[nodeId] === undefined) {
        // node exit
        this.nodesById[nodeId].delete()
      }
    }

    for (const edgeId in edges) {
      if (this.edgesById[edgeId] === undefined) {
        // edge enter
        this.edgesById[edges[edgeId].id] = new EdgeContainer(
          this,
          edges[edgeId],
          this.edgeStyleSelector,
          this.edgesLayer,
        )
          .set(edges[edgeId])

        this.dirty = true
      } else {
        // edge update
        this.edgesById[edgeId].set(edges[edgeId])
        this.dirty = true
      }
    }

    for (const edgeId in this.edgesById) {
      if (edges[edgeId] === undefined) {
        // edge exit
        this.edgesById[edgeId].delete()
      }
    }
  }

  private render = () => {
    /**
     * TODO - enable dead code elimination and build-time env variables
     */
    // if (process.env.NODE_ENV === 'development') { this.stats && this.stats.update() }
    this.stats && this.stats.update()

    const now = Date.now()
    this.animationTime += Math.min(16, Math.max(0, now - this.renderTime))
    this.renderTime = now

    if (this.dirty) {
      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].render()
      }

      for (const edgeId in this.edgesById) {
        this.edgesById[edgeId].render()
      }

      this.dirty = this.animationTime < ANIMATION_DURATION
      this.viewport.dirty = false
      this.app.render()
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      this.app.render()
    }
  }
}


export const PixiRenderer = (options: RendererOptions) => new Renderer(options)
