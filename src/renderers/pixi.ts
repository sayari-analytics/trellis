import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import * as GStats from 'gstats'
import { Options, DEFAULT_OPTIONS, DEFAULT_NODE_STYLES, DEFAULT_EDGE_STYLES } from './options'
import { Edge, Node, Graph, PositionedNode, PositionedEdge } from '../index'
import { animationFrameLoop } from '../utils'
import { edgeStyleSelector, nodeStyleSelector, NodeStyleSelector, EdgeStyleSelector, interpolatePosition } from './utils'
import { color } from 'd3-color'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'
import { stats } from '../stats'


const colorToNumber = (colorString: string): number => {
  const c = color(colorString)
  if (c === null) {
    return 0x000000
  }

  return parseInt(c.hex().slice(1), 16)
}


class Renderer {

  nodeStyleSelector: NodeStyleSelector
  edgeStyleSelector: EdgeStyleSelector
  hoveredNode?: PositionedNode
  clickedNode?: PositionedNode
  dirtyData = false
  ANIMATION_DURATION = 800
  updateTransition = this.ANIMATION_DURATION
  updateTime = Date.now()
  linksLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  nodesById: { [key: string]: { node: PositionedNode, nodeGfx: PIXI.Container, labelGfx: PIXI.Container} } = {}
  edgesById: { [key: string]: { edge: PositionedEdge, edgeGfx: PIXI.Graphics } } = {}

  graph: Graph
  app: PIXI.Application
  viewport: Viewport

  constructor({ id, tick = DEFAULT_OPTIONS.tick, nodeStyle = DEFAULT_OPTIONS.nodeStyle, edgeStyle = DEFAULT_OPTIONS.edgeStyle }: Options) {
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

    this.graph = new Graph(this.update)

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
  
    this.viewport.center = new PIXI.Point(WORLD_WIDTH / 6, WORLD_HEIGHT / 6)
    this.viewport.setZoom(0.5, true)
    this.viewport.addChild(this.linksLayer)
    this.viewport.addChild(this.nodesLayer)
    this.viewport.addChild(this.labelsLayer)
    this.viewport.addChild(this.frontNodeLayer)
    this.viewport.addChild(this.frontLabelLayer)
    this.app.view.addEventListener('wheel', (event) => { event.preventDefault() }) // prevent body scrolling

    container.appendChild(this.app.view)
  
    animationFrameLoop(this.animate)
  }

  layout = (graph: {
    nodes: { [key: string]: Node },
    edges: { [key: string]: Edge },
    options?: Partial<Options>
  }) => this.graph.layout(graph)

  private update = ({ nodes, edges }: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge } }) => {
    for (const edgeId in edges) {
      if (this.edgesById[edgeId] !== undefined) {
        this.edgesById[edgeId] = { ...this.edgesById[edgeId], edge: edges[edgeId] }
        continue        
      }

      const edge = edges[edgeId]

      const edgeGfx = new PIXI.Graphics()

      this.linksLayer.addChild(edgeGfx)

      this.edgesById[edge.id] = { edge, edgeGfx }

      this.dirtyData = true
      this.updateTransition = 0
    }

    for (const nodeId in nodes) {
      if (this.nodesById[nodeId] !== undefined) {
        this.nodesById[nodeId] = { ...this.nodesById[nodeId], node: nodes[nodeId] }
        continue
      }

      const node = nodes[nodeId]

      const radius = this.nodeStyleSelector(node, 'width') / 2

      const nodeGfx = new PIXI.Container()
      nodeGfx.name = node.id
      nodeGfx.interactive = true
      nodeGfx.buttonMode = true
      nodeGfx.hitArea = new PIXI.Circle(0, 0, radius + 5)
      nodeGfx.on('mouseover', this.hoverNode)
      nodeGfx.on('mouseout', this.unhoverNode)
      nodeGfx.on('mousedown', this.clickNode)
      nodeGfx.on('mouseup', this.unclickNode)
      nodeGfx.on('mouseupoutside', this.unclickNode)

      const circle = new PIXI.Graphics()
      circle.x = 0
      circle.y = 0
      circle.beginFill(colorToNumber(this.nodeStyleSelector(node, 'fill')))
      circle.alpha = this.nodeStyleSelector(node, 'fillOpacity')
      circle.drawCircle(0, 0, radius)
      nodeGfx.addChild(circle)

      const circleBorder = new PIXI.Graphics()
      circle.x = 0
      circle.y = 0
      circleBorder.lineStyle(this.nodeStyleSelector(node, 'strokeWidth'), colorToNumber(this.nodeStyleSelector(node, 'stroke')))
      circleBorder.drawCircle(0, 0, radius)
      nodeGfx.addChild(circleBorder)

      // TODO - don't render label if doesn't exist
      const labelGfx = new PIXI.Container()
      labelGfx.interactive = true
      labelGfx.buttonMode = true

      const labelText = new PIXI.Text(node.label || '', {
        fontFamily: 'Helvetica',
        fontSize: 12,
        fill: 0x333333,
        lineJoin: "round",
        stroke: "#fafafaee",
        strokeThickness: 2,
      })
      labelText.x = 0
      labelText.y = radius + 5 + 1 // LABEL_Y_PADDING
      labelText.anchor.set(0.5, 0)
      labelGfx.addChild(labelText)

      this.nodesLayer.addChild(nodeGfx)
      this.labelsLayer.addChild(labelGfx)

      this.nodesById[node.id] = { node, nodeGfx, labelGfx }

      this.dirtyData = true
      this.updateTransition = 0
    }
  }

  private animate = () => {
    const updateTime2 = Date.now()
    const deltaTime = Math.min(20, Math.max(0, updateTime2 - this.updateTime))
    // const deltaTime = updateTime2 - this.updateTime
    this.updateTime = updateTime2
    this.updateTransition += deltaTime
    const deltaPercent = Math.min(1, this.updateTransition / this.ANIMATION_DURATION)

    if (this.dirtyData || deltaPercent < 1) {
      for (const edgeId in this.edgesById) {
        const edge = this.edgesById[edgeId].edge
        let edgeGfx = this.edgesById[edgeId].edgeGfx

        edgeGfx.clear()
        edgeGfx.lineStyle(
          this.edgeStyleSelector(edge, 'width'),
          colorToNumber(this.edgeStyleSelector(edge, 'stroke')),
          this.edgeStyleSelector(edge, 'strokeOpacity')
        )

        edgeGfx.moveTo(
          interpolatePosition(edge.source.x0 || 0, edge.source.x!, deltaPercent),
          interpolatePosition(edge.source.y0 || 0, edge.source.y!, deltaPercent)
        )
        edgeGfx.lineTo(
          interpolatePosition(edge.target.x0 || 0, edge.target.x!, deltaPercent),
          interpolatePosition(edge.target.y0 || 0, edge.target.y!, deltaPercent)
        )
        edgeGfx.endFill()
      }
  
      for (const nodeId in this.nodesById) {
        const node = this.nodesById[nodeId].node
        const nodeGfx = this.nodesById[nodeId].nodeGfx
        const labelGfx = this.nodesById[nodeId].labelGfx
        /**
         * TODO
         * - ensure that if a node's position changes while it is in transition, it's movement is interpolated from it's current position, not it's new starting position (x0/y0)
         * - ensure that if a node is being dragged, it's drag position is used (fx/fy?)
         */
        const x = interpolatePosition(node.x0 || 0, node.x!, deltaPercent)
        const y = interpolatePosition(node.y0 || 0, node.y!, deltaPercent)
        nodeGfx.position = new PIXI.Point(x, y)
        labelGfx.position = new PIXI.Point(x, y)
      }

      // unhover
      for (const nodeGfx of this.frontNodeLayer.children) {
        this.frontNodeLayer.removeChild(nodeGfx);
        (nodeGfx as PIXI.Graphics).removeChild((nodeGfx as PIXI.Graphics).getChildByName('hoverBorder'))
        this.nodesLayer.addChild(nodeGfx)
      }

      for (const labelGfx of this.frontLabelLayer.children) {
        this.frontLabelLayer.removeChild(labelGfx)
        this.labelsLayer.addChild(labelGfx)
      }

      // hover
      if (this.hoveredNode !== undefined) {
        const radius = this.nodeStyleSelector(this.hoveredNode, 'width') / 2
      
        const nodeGfx = this.nodesById[this.hoveredNode.id].nodeGfx
        const labelGfx = this.nodesById[this.hoveredNode.id].labelGfx
        
        this.nodesLayer.removeChild(nodeGfx)
        this.labelsLayer.removeChild(labelGfx)
        this.frontNodeLayer.addChild(nodeGfx)
        this.frontLabelLayer.addChild(labelGfx)
        
        const circleBorder = new PIXI.Graphics()
        circleBorder.name = 'hoverBorder'
        circleBorder.x = 0
        circleBorder.y = 0
        circleBorder.lineStyle(this.nodeStyleSelector(this.hoveredNode, 'strokeWidth'), 0x000000)
        circleBorder.drawCircle(0, 0, radius)
        nodeGfx.addChild(circleBorder)
      }

      this.dirtyData = false
      this.viewport.dirty = false
      this.app.render()
    } else if (this.viewport.dirty) {
      this.viewport.dirty = false
      this.app.render()
    }
  }

  private hoverNode = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode === undefined) {
      this.hoveredNode = this.nodesById[event.currentTarget.name].node
      this.dirtyData = true
    }
  }

  private unhoverNode = (event: PIXI.interaction.InteractionEvent) => {
    if (
      this.clickedNode === undefined &&
      this.hoveredNode === this.nodesById[event.currentTarget.name].node
    ) {
      this.hoveredNode = undefined
      this.dirtyData = true
    }
  }

  private clickNode = (event: PIXI.interaction.InteractionEvent) => {
    const { x, y } = this.viewport.toWorld(event.data.global)
    this.graph.dragStart(event.currentTarget.name, x, y)

    this.clickedNode = this.nodesById[event.currentTarget.name].node
    this.app.renderer.plugins.interaction.on('mousemove', this.appMouseMove)
    this.viewport.pause = true
    this.dirtyData = true
  }

  private unclickNode = () => {
    if (this.clickedNode !== undefined) {
      this.graph.dragEnd(this.clickedNode.id)
    }

    this.clickedNode = undefined
    this.app.renderer.plugins.interaction.off('mousemove', this.appMouseMove)
    this.viewport.pause = false
    this.dirtyData = true
  }

  private appMouseMove = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode === undefined) {
      return
    }

    const { x, y } = this.viewport.toWorld(event.data.global)
    this.graph.drag(this.clickedNode.id, x, y)

    this.clickedNode.x = x
    this.clickedNode.y = y
    this.dirtyData = true
  }
}

export const PixiRenderer2 = (options: Options) => {
  const pixi = new Renderer(options);
  (window as unknown as { pixi: any }).pixi = pixi
  return pixi
}

export const PixiRenderer = ({
  id,
  tick = DEFAULT_OPTIONS.tick,
  nodeStyle = {},
  edgeStyle = {},
}: Options) => {
  const container = document.getElementById(id)
  if (container === null) {
    throw new Error(`Element #${id} not found`)
  }

  const _nodeStyleSelector = nodeStyleSelector({ ...DEFAULT_NODE_STYLES, ...nodeStyle })
  const _edgeStyleSelector = edgeStyleSelector({ ...DEFAULT_EDGE_STYLES, ...edgeStyle })

  const SCREEN_WIDTH = container.offsetWidth
  const SCREEN_HEIGHT = container.offsetHeight
  const WORLD_WIDTH = SCREEN_WIDTH // * 2
  const WORLD_HEIGHT = SCREEN_HEIGHT // * 2
  const RESOLUTION = window.devicePixelRatio // * 2
  const ANIMATION_DURATION = 800
  const LABEL_FONT_FAMILY = 'Helvetica'
  const LABEL_FONT_SIZE = 12
  const LABEL_X_PADDING = 2
  const LABEL_Y_PADDING = 1

  const app = new PIXI.Application({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resolution: RESOLUTION,
    transparent: true,
    antialias: true,
    autoStart: false
  })

  app.view.style.width = `${SCREEN_WIDTH}px`
  
  const viewport = new Viewport({
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    interaction: app.renderer.plugins.interaction
  })

	app.stage.addChild(viewport.drag().pinch().wheel().decelerate())

  viewport.center = new PIXI.Point(WORLD_WIDTH / 6, WORLD_HEIGHT / 6)
  viewport.setZoom(0.5, true)


  const linksLayer = new PIXI.Graphics()
  let nodesLayer = new PIXI.Container() // Graphics vs Container layer?
  const labelsLayer = new PIXI.Container()
  labelsLayer.interactiveChildren = false
  const frontLayer = new PIXI.Container()
  viewport.addChild(linksLayer)
  viewport.addChild(nodesLayer)
  viewport.addChild(labelsLayer)
  viewport.addChild(frontLayer)

  app.view.addEventListener('wheel', (event) => { event.preventDefault() }) // prevent body scrolling
  container.appendChild(app.view)


  let dirtyData = false
  let updateTransition = ANIMATION_DURATION
  let updateTime = Date.now()
  const nodesById: { [key: string]: { node: PositionedNode, nodeGfx: PIXI.Container, labelGfx: PIXI.Container} } = {}
  let edgesById: { [key: string]: PositionedEdge } = {}
  let hoveredNode: PositionedNode | undefined
  let clickedNode: PositionedNode | undefined

  const interpolatePosition = (start: number, end: number, percent: number) => {
    const interpolate = interpolateNumber(start, end)
    return interpolateBasis([interpolate(0), interpolate(0.1), interpolate(0.8), interpolate(0.95), interpolate(1)])(percent)
  }

  animationFrameLoop(() => {
    const updateTime2 = Date.now()
    const deltaTime = Math.min(100, Math.max(0, updateTime2 - updateTime))
    updateTime = updateTime2
    updateTransition += deltaTime
    const deltaPercent = Math.min(1, updateTransition / ANIMATION_DURATION)

    if (dirtyData || deltaPercent < 1) {
      // console.log(deltaTime)
      linksLayer.clear()
      linksLayer.alpha = 0.6
      for (const edge in edgesById) {
        linksLayer.lineStyle(1, 0x999999)
        linksLayer.moveTo(
          interpolatePosition(edgesById[edge].source.x0 || 0, edgesById[edge].source.x!, deltaPercent),
          interpolatePosition(edgesById[edge].source.y0 || 0, edgesById[edge].source.y!, deltaPercent)
        )
        linksLayer.lineTo(
          interpolatePosition(edgesById[edge].target.x0 || 0, edgesById[edge].target.x!, deltaPercent),
          interpolatePosition(edgesById[edge].target.y0 || 0, edgesById[edge].target.y!, deltaPercent)
        )
      }
      linksLayer.endFill()
  
      for (const nodeId in nodesById) {
        const node = nodesById[nodeId].node
        const nodeGfx = nodesById[nodeId].nodeGfx
        const labelGfx = nodesById[nodeId].labelGfx
        /**
         * TODO - ensure that if a node's position changes while it is in transition, it's movement is interpolated from it's current position, not it's new starting position (x0/y0)
         */
        const x = interpolatePosition(node.x0 || 0, node.x!, deltaPercent)
        const y = interpolatePosition(node.y0 || 0, node.y!, deltaPercent)
        nodeGfx.position = new PIXI.Point(x, y)
        labelGfx.position = new PIXI.Point(x, y)
      }

      dirtyData = false
      viewport.dirty = false
      app.render()
    } else if (viewport.dirty) {
      viewport.dirty = false
      app.render()
    }
  })


  /**
   * these should be reevaluated every tick, so that stale hover nodes never are rendered
   */
  const hoverNode = (event: PIXI.interaction.InteractionEvent) => {
    const node = nodesById[event.currentTarget.name].node
    if (clickedNode !== undefined) {
      return
    }
    
    if (hoveredNode === node) {
      return
    }
    
    hoveredNode = node
    const radius = _nodeStyleSelector(node, 'width') / 2
    
    const nodeGfx = nodesById[node.id].nodeGfx
    const labelGfx = nodesById[node.id].labelGfx
    
    nodesLayer.removeChild(nodeGfx)
    frontLayer.addChild(nodeGfx)
    labelsLayer.removeChild(labelGfx)
    frontLayer.addChild(labelGfx)
    
    const circleBorder = new PIXI.Graphics()
    circleBorder.name = 'hoverBorder'
    circleBorder.x = 0
    circleBorder.y = 0
    circleBorder.lineStyle(_nodeStyleSelector(node, 'strokeWidth'), 0x000000)
    circleBorder.drawCircle(0, 0, radius)
    nodeGfx.addChild(circleBorder)
    dirtyData = true
  }

  const unhoverNode = (event: PIXI.interaction.InteractionEvent) => {
    const node = nodesById[event.currentTarget.name].node

    if (clickedNode) {
      return
    }

    if (hoveredNode !== node) {
      return
    }

    
    hoveredNode = undefined
    
    const nodeGfx = nodesById[node.id].nodeGfx
    const labelGfx = nodesById[node.id].labelGfx
    
    frontLayer.removeChild(nodeGfx)
    nodesLayer.addChild(nodeGfx)
    frontLayer.removeChild(labelGfx)
    labelsLayer.addChild(labelGfx)
    
    nodeGfx.removeChild(nodeGfx.getChildByName('hoverBorder'))
    dirtyData = true
  }

  const clickNode = (event: PIXI.interaction.InteractionEvent) => {
    const { x, y } = viewport.toWorld(event.data.global)
    graph.dragStart(event.currentTarget.name, x, y)

    clickedNode = nodesById[event.currentTarget.name].node
    app.renderer.plugins.interaction.on('mousemove', appMouseMove)
    viewport.pause = true
    dirtyData = true
  }

  const unclickNode = () => {
    if (clickedNode !== undefined) {
      graph.dragEnd(clickedNode.id)
    }

    clickedNode = undefined
    app.renderer.plugins.interaction.off('mousemove', appMouseMove)
    viewport.pause = false
    dirtyData = true
  }

  const appMouseMove = (event: PIXI.interaction.InteractionEvent) => {
    if (clickedNode === undefined) {
      return
    }

    const { x, y } = viewport.toWorld(event.data.global)
    graph.drag(clickedNode.id, x, y)

    clickedNode.x = x
    clickedNode.y = y
    dirtyData = true
  }


  const graph = new Graph(({ nodes, edges }) => {
    edgesById = edges

    for (const nodeId in nodes) {
      if (nodesById[nodeId] !== undefined) {
        nodesById[nodeId] = { ...nodesById[nodeId], node: nodes[nodeId] }
        continue
      }

      const node = nodes[nodeId]

      const radius = _nodeStyleSelector(node, 'width') / 2

      const nodeGfx = new PIXI.Container()
      nodeGfx.name = node.id
      nodeGfx.x = node.x!
      nodeGfx.y = node.y!
      nodeGfx.interactive = true
      nodeGfx.buttonMode = true
      nodeGfx.hitArea = new PIXI.Circle(0, 0, radius + 5)
      nodeGfx.on('mouseover', hoverNode)
      nodeGfx.on('mouseout', unhoverNode)
      nodeGfx.on('mousedown', clickNode)
      nodeGfx.on('mouseup', unclickNode)
      nodeGfx.on('mouseupoutside', unclickNode)

      const circle = new PIXI.Graphics()
      circle.x = 0
      circle.y = 0
      circle.beginFill(colorToNumber(_nodeStyleSelector(node, 'fill')))
      circle.alpha = _nodeStyleSelector(node, 'fillOpacity')
      circle.drawCircle(0, 0, radius)
      nodeGfx.addChild(circle)

      const circleBorder = new PIXI.Graphics()
      circle.x = 0
      circle.y = 0
      circleBorder.lineStyle(_nodeStyleSelector(node, 'strokeWidth'), colorToNumber(_nodeStyleSelector(node, 'stroke')))
      circleBorder.drawCircle(0, 0, radius)
      nodeGfx.addChild(circleBorder)

      // TODO - don't render label if doesn't exist
      const labelGfx = new PIXI.Container()
      labelGfx.x = node.x!
      labelGfx.y = node.y!
      labelGfx.interactive = true
      labelGfx.buttonMode = true

      const labelText = new PIXI.Text(node.label || '', {
        fontFamily: LABEL_FONT_FAMILY,
        fontSize: LABEL_FONT_SIZE,
        fill: 0x333333,
        lineJoin: "round",
        stroke: "#fafafaee",
        strokeThickness: 2,
      })
      labelText.x = 0
      labelText.y = radius + 5 + LABEL_Y_PADDING
      labelText.anchor.set(0.5, 0)
      labelGfx.addChild(labelText)

      nodesLayer.addChild(nodeGfx)
      labelsLayer.addChild(labelGfx)

      nodesById[node.id] = { node, nodeGfx, labelGfx }

      dirtyData = true
      updateTransition = 0

    }
  })


  return (nodes: { [key: string]: Node }, edges: { [key: string]: Edge }) => {
    graph.layout({ nodes, edges, options: { tick } })
  }
}
