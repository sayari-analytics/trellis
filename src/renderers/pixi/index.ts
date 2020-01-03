import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import * as GStats from 'gstats'
import FontFaceObserver from 'fontfaceobserver'
import { RendererOptions, DEFAULT_RENDERER_OPTIONS, DEFAULT_NODE_STYLES, DEFAULT_EDGE_STYLES } from '../options'
import { PositionedNode, PositionedEdge } from '../../index'
import { animationFrameLoop, noop } from '../../utils'
import { edgeStyleSelector, nodeStyleSelector, NodeStyleSelector, EdgeStyleSelector } from '../utils'
import { stats } from '../../stats'
import { NodeContainer } from './nodeContainer'
import { EdgeContainer } from './edgeContainer'


new FontFaceObserver('Material Icons').load()


export class Renderer {

  onNodeMouseEnter?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseDown?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeDrag?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseUp?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseLeave?: (node: PositionedNode, details: { x: number, y: number }) => void

  nodeStyleSelector: NodeStyleSelector
  edgeStyleSelector: EdgeStyleSelector
  hoveredNode?: string
  clickedNode?: string
  dirtyData = false
  updateTime = Date.now()
  edgesLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container() // TODO - combine w/ frontNodeLayer?
  nodesById: { [key: string]: NodeContainer } = {}
  edgesById: { [key: string]: { edge: PositionedEdge, edgeGfx: EdgeContainer } } = {}

  app: PIXI.Application
  viewport: Viewport

  constructor({
    id, nodeStyle = DEFAULT_RENDERER_OPTIONS.nodeStyle, edgeStyle = DEFAULT_RENDERER_OPTIONS.edgeStyle,
    onNodeMouseEnter = noop, onNodeMouseDown = noop, onNodeDrag = noop, onNodeMouseUp = noop, onNodeMouseLeave = noop,
  }: RendererOptions) {
    this.onNodeMouseEnter = onNodeMouseEnter
    this.onNodeMouseDown = onNodeMouseDown
    this.onNodeDrag = onNodeDrag
    this.onNodeMouseUp = onNodeMouseUp
    this.onNodeMouseLeave = onNodeMouseLeave
    this.nodeStyleSelector = nodeStyleSelector({ ...DEFAULT_NODE_STYLES, ...nodeStyle })
    this.edgeStyleSelector = edgeStyleSelector({ ...DEFAULT_EDGE_STYLES, ...edgeStyle })


    const container = document.getElementById(id)
    if (container === null) {
      throw new Error(`Element #${id} not found`)
    }

    const SCREEN_WIDTH = container.offsetWidth
    const SCREEN_HEIGHT = container.offsetHeight
    const WORLD_WIDTH = SCREEN_WIDTH // * 2
    const WORLD_HEIGHT = SCREEN_HEIGHT // * 2
    const RESOLUTION = window.devicePixelRatio // * 2

    this.app = new PIXI.Application({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      resolution: RESOLUTION,
      transparent: true,
      antialias: true,
      autoStart: false
    })
    this.app.view.style.width = `${SCREEN_WIDTH}px`
    this.labelsLayer.interactiveChildren = false

    const pixiHooks = new GStats.PIXIHooks(this.app)
    const gstats = new GStats.StatsJSAdapter(pixiHooks, stats)
    document.body.appendChild(gstats.stats.dom || gstats.stats.domElement)

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

    animationFrameLoop(this.animate)
  }

  layout = ({
    nodes, edges
  }: {
    nodes: { [key: string]: PositionedNode },
    edges: { [key: string]: PositionedEdge }
  }) => {
    for (const edgeId in edges) {
      if (this.edgesById[edgeId] === undefined) {
        // enter
        const edgeGfx = new EdgeContainer(
          edges[edgeId],
          this.edgeStyleSelector,
          this.edgesLayer,
          () => this.dirtyData = true
        )
          .style(edges[edgeId])

        this.edgesById[edges[edgeId].id] = { edge: edges[edgeId], edgeGfx }
        this.dirtyData = true
      } else {
        // update
        this.edgesById[edgeId].edgeGfx.style(edges[edgeId])
        this.edgesById[edgeId].edge = edges[edgeId]
        this.dirtyData = true
      }
    }

    for (const nodeId in nodes) {
      if (this.nodesById[nodeId] === undefined) {
        // enter
        const nodeContainer = new NodeContainer(
          this,
          nodes[nodeId],
          this.nodeStyleSelector,
          this.nodesLayer,
          this.labelsLayer,
        )
          .style(nodes[nodeId])
          .position(nodes[nodeId].x!, nodes[nodeId].y!)

        // TODO - move to NodeContainer
        nodeContainer.circleContainer.on('mouseover', this.nodeMouseOver)
        nodeContainer.circleContainer.on('mouseout', this.nodeMouseOut)
        nodeContainer.circleContainer.on('mousedown', this.nodeMouseDown)
        nodeContainer.circleContainer.on('mouseup', this.nodeMouseUp)
        nodeContainer.circleContainer.on('mouseupoutside', this.nodeMouseUp)

        this.nodesById[nodes[nodeId].id] = nodeContainer
        this.dirtyData = true
      } else {
        // update
        this.nodesById[nodeId]
          .style(nodes[nodeId])
          .position(nodes[nodeId].x!, nodes[nodeId].y!)

        this.nodesById[nodeId].node = nodes[nodeId]
        this.dirtyData = true
      }
    }
  }

  private animate = () => {
    const updateTime2 = Date.now()
    const deltaTime = Math.min(16, Math.max(0, updateTime2 - this.updateTime))
    this.updateTime = updateTime2

    if (this.dirtyData) {
      let animationPending = false

      for (const nodeId in this.nodesById) {
        this.nodesById[nodeId].animate(deltaTime)
        animationPending = animationPending || this.nodesById[nodeId].animationIsPending()
      }

      for (const edgeId in this.edgesById) {
        const edge = this.edgesById[edgeId].edge

        this.edgesById[edgeId].edgeGfx.move(
          this.nodesById[edge.source.id].circleContainer.x,
          this.nodesById[edge.source.id].circleContainer.y,
          this.nodesById[edge.target.id].circleContainer.x,
          this.nodesById[edge.target.id].circleContainer.y,
        )
      }

      this.dirtyData = animationPending
      this.viewport.dirty = false
      this.app.render()
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      this.app.render()
    }
  }

  private nodeMouseOver = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode === undefined) {
      const nodeContainer = this.nodesById[event.currentTarget.name]
      this.hoveredNode = nodeContainer.node.id

      this.nodesLayer.removeChild(nodeContainer.circleContainer)
      this.labelsLayer.removeChild(nodeContainer.labelContainer)
      this.frontNodeLayer.addChild(nodeContainer.circleContainer)
      this.frontLabelLayer.addChild(nodeContainer.labelContainer)

      const circleBorder = new PIXI.Graphics()
      circleBorder.name = 'hoverBorder'
      circleBorder.x = 0
      circleBorder.y = 0
      circleBorder.lineStyle(this.nodeStyleSelector(nodeContainer.node, 'strokeWidth') * 1.5, 0xcccccc)
      circleBorder.drawCircle(0, 0, this.nodeStyleSelector(nodeContainer.node, 'width') * 0.5)
      nodeContainer.circleContainer.addChild(circleBorder)

      this.dirtyData = true
      const { x, y } = this.viewport.toWorld(event.data.global)
      this.onNodeMouseEnter && this.onNodeMouseEnter(nodeContainer.node, { x, y })
    }
  }

  private nodeMouseOut = (event: PIXI.interaction.InteractionEvent) => {
    const node = this.nodesById[event.currentTarget.name].node

    if (this.clickedNode === undefined && this.hoveredNode === node.id) {
      this.hoveredNode = undefined

      for (const nodeGfx of this.frontNodeLayer.children) {
        this.frontNodeLayer.removeChild(nodeGfx);
        (nodeGfx as PIXI.Graphics).removeChild((nodeGfx as PIXI.Graphics).getChildByName('hoverBorder'))
        this.nodesLayer.addChild(nodeGfx)
      }

      for (const labelGfx of this.frontLabelLayer.children) {
        this.frontLabelLayer.removeChild(labelGfx)
        this.labelsLayer.addChild(labelGfx)
      }

      this.dirtyData = true
      const { x, y } = this.viewport.toWorld(event.data.global)
      this.onNodeMouseLeave && this.onNodeMouseLeave(node, { x, y })
    }
  }

  private nodeMouseDown = (event: PIXI.interaction.InteractionEvent) => {
    this.clickedNode = event.currentTarget.name
    this.app.renderer.plugins.interaction.on('mousemove', this.nodeMove)
    this.viewport.pause = true
    this.dirtyData = true
    const { x, y } = this.viewport.toWorld(event.data.global)
    this.onNodeMouseDown && this.onNodeMouseDown(this.nodesById[event.currentTarget.name].node, { x, y })
  }

  private nodeMouseUp = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode !== undefined) {
      const node = this.nodesById[this.clickedNode].node
      this.clickedNode = undefined
      this.app.renderer.plugins.interaction.off('mousemove', this.nodeMove)
      this.viewport.pause = false
      this.dirtyData = true
      const { x, y } = this.viewport.toWorld(event.data.global)
      this.onNodeMouseUp && this.onNodeMouseUp(node, { x, y })
    }
  }

  private nodeMove = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode !== undefined) {
      const nodeContainer = this.nodesById[this.clickedNode]
      const { x, y } = this.viewport.toWorld(event.data.global)
      nodeContainer.move(x, y)
      this.dirtyData = true
      this.onNodeDrag && this.onNodeDrag(nodeContainer.node, { x, y })
    }
  }
}

export const PixiRenderer = (options: RendererOptions) => new Renderer(options)
