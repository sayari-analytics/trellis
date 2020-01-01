import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import * as GStats from 'gstats'
import { RendererOptions, DEFAULT_RENDERER_OPTIONS, DEFAULT_NODE_STYLES, DEFAULT_EDGE_STYLES } from './options'
import { PositionedNode, PositionedEdge } from '../index'
import { animationFrameLoop, noop } from '../utils'
import { edgeStyleSelector, nodeStyleSelector, NodeStyleSelector, EdgeStyleSelector, interpolatePosition } from './utils'
import { color } from 'd3-color'
import { stats } from '../stats'
import { interpolateNumber, interpolateBasis } from 'd3-interpolate'


class NodeContainer extends PIXI.Container {

  labelContainer: PIXI.Container = new PIXI.Container()
  
  radius: number = DEFAULT_NODE_STYLES.width / 2

  label?: string

  animationTime: number = 0

  private nodeStyleSelector: NodeStyleSelector
  private startX: number = 0 // TODO - initialize prev position to position of a related node, or to avg position of all related nodes
  private startY: number = 0
  private endX: number = 0
  private endY: number = 0
  private interpolateX: (percent: number) => number = () => this.endX
  private interpolateY: (percent: number) => number = () => this.endY

  constructor(nodeStyleSelector: NodeStyleSelector) {
    super()
    this.nodeStyleSelector = nodeStyleSelector
  }

  updateStyle = (node: PositionedNode) => {
    this.radius = this.nodeStyleSelector(node, 'width') / 2

    if (node.label !== this.label) {
      this.label = node.label

      if (node.label) {
        const labelText = new PIXI.Text(node.label || '', {
          fontFamily: 'Helvetica',
          fontSize: 12 * 2,
          fill: 0x333333,
          lineJoin: "round",
          stroke: "#fafafaee",
          strokeThickness: 2 * 2,
        })
        labelText.x = 0
        labelText.y = this.radius + LABEL_Y_PADDING
        labelText.scale.set(0.5)
        labelText.anchor.set(0.5, 0)
        this.labelContainer.addChild(labelText)
      } else {
        this.labelContainer.removeChildren()
      }
    }

    return this
  }

  updatePosition = (x: number, y: number) => {
    this.startX = this.x
    this.startY = this.y

    this.endX = x
    this.endY = y

    const interpolateXNumber = interpolateNumber(this.startX, this.endX)
    const interpolateYNumber = interpolateNumber(this.startY, this.endY)
    this.interpolateX = interpolateBasis([interpolateXNumber(0), interpolateXNumber(0.1), interpolateXNumber(0.8), interpolateXNumber(0.95), interpolateXNumber(1)])
    this.interpolateY = interpolateBasis([interpolateYNumber(0), interpolateYNumber(0.1), interpolateYNumber(0.8), interpolateYNumber(0.95), interpolateYNumber(1)])
    this.animationTime = 0

    return this
  }

  animate = (deltaTime: number) => {
    if (this.animationTime < ANIMATION_DURATION) {
      this.animationTime += deltaTime
      const percent = this.animationTime / ANIMATION_DURATION
      this.x = this.interpolateX(percent)
      this.y = this.interpolateY(percent)
    } else {
      this.x = this.endX
      this.y = this.endY
    }

    this.labelContainer.position.x = this.x
    this.labelContainer.position.y = this.y

    return this
  }

  move = (x: number, y: number) => {
    this.x = x
    this.y = y
    this.startX = x
    this.startY = y
    this.endX = x
    this.endY = y
    this.labelContainer.position.x = x
    this.labelContainer.position.y = y
    this.animationTime = ANIMATION_DURATION
    return this
  }

  animationIsPending = () => this.animationTime < ANIMATION_DURATION

}


const colorToNumber = (colorString: string): number => {
  const c = color(colorString)
  if (c === null) {
    return 0x000000
  }

  return parseInt(c.hex().slice(1), 16)
}


const LABEL_X_PADDING = 4
const LABEL_Y_PADDING = 2
const ANIMATION_DURATION = 800


class Renderer {

  onNodeMouseEnter?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseDown?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeDrag?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseUp?: (node: PositionedNode, details: { x: number, y: number }) => void
  onNodeMouseLeave?: (node: PositionedNode, details: { x: number, y: number }) => void

  nodeStyleSelector: NodeStyleSelector
  edgeStyleSelector: EdgeStyleSelector
  hoveredNode?: PositionedNode
  clickedNode?: PositionedNode
  dirtyData = false
  updateTime = Date.now()
  linksLayer = new PIXI.Container()
  nodesLayer = new PIXI.Container()
  labelsLayer = new PIXI.Container()
  frontNodeLayer = new PIXI.Container()
  frontLabelLayer = new PIXI.Container()
  nodesById: { [key: string]: { node: PositionedNode, nodeGfx: NodeContainer } } = {}
  edgesById: { [key: string]: { edge: PositionedEdge, edgeGfx: PIXI.Graphics, labelGfx: PIXI.Container } } = {}

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

  layout = ({ nodes, edges }: { nodes: { [key: string]: PositionedNode }, edges: { [key: string]: PositionedEdge } }) => {
    for (const edgeId in edges) {
      if (this.edgesById[edgeId] !== undefined) {
        this.edgesById[edgeId].edge = edges[edgeId]
        continue        
      }

      const edge = edges[edgeId]

      const edgeGfx = new PIXI.Graphics()

      const labelGfx = new PIXI.Container()

      /**
       * TODO
       * - don't render label if doesn't exist
       */
      const labelText = new PIXI.Text(edge.label || '', {
        fontFamily: 'Helvetica',
        fontSize: 10 * 2,
        fill: 0x444444,
        lineJoin: "round",
        stroke: "#fafafaee",
        strokeThickness: 2 * 2,
      })
      labelText.name = 'text'
      labelText.scale.set(0.5)
      labelText.anchor.set(0.5, 0.5)
      labelGfx.addChild(labelText)

      this.linksLayer.addChild(edgeGfx)
      this.linksLayer.addChild(labelGfx)

      this.edgesById[edge.id] = { edge, edgeGfx, labelGfx }

      this.dirtyData = true
    }

    for (const nodeId in nodes) {
      if (this.nodesById[nodeId] === undefined) {
        // enter
        /**
         * TODO - implement occlusion for nodes and node text
         */
        const node = nodes[nodeId]
        const radius = this.nodeStyleSelector(node, 'width') / 2
        const nodeGfx = new NodeContainer(this.nodeStyleSelector)
          .updateStyle(nodes[nodeId])
          .updatePosition(node.x || 0, node.y || 0) // TODO - is x/y always defined?

        // TODO - move all this to the NodeContainer constructor
        nodeGfx.name = node.id
        nodeGfx.interactive = true
        nodeGfx.buttonMode = true
        nodeGfx.hitArea = new PIXI.Circle(0, 0, radius + 5)
        nodeGfx.on('mouseover', this.nodeMouseOver)
        nodeGfx.on('mouseout', this.nodeMouseOut)
        nodeGfx.on('mousedown', this.nodeMouseDown)
        nodeGfx.on('mouseup', this.nodeMouseUp)
        nodeGfx.on('mouseupoutside', this.nodeMouseUp)
  
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
  
        this.nodesLayer.addChild(nodeGfx)
        this.labelsLayer.addChild(nodeGfx.labelContainer)
  
        this.nodesById[node.id] = { node, nodeGfx }
  
        this.dirtyData = true
      } else {
        // update
        this.nodesById[nodeId].nodeGfx
          .updateStyle(nodes[nodeId])
          .updatePosition(nodes[nodeId].x || 0, nodes[nodeId].y || 0) // TODO - is x/y always defined?
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
        this.nodesById[nodeId].nodeGfx.animate(deltaTime)
        animationPending = animationPending || this.nodesById[nodeId].nodeGfx.animationIsPending()
      }

      for (const edgeId in this.edgesById) {
        const edge = this.edgesById[edgeId].edge
        const edgeGfx = this.edgesById[edgeId].edgeGfx
        const labelGfx = this.edgesById[edgeId].labelGfx

        edgeGfx.clear()
        // edgeGfx.interactive = true
        // edgeGfx.buttonMode = true
        // edgeGfx.hitArea = new PIXI.Circle(0, 0, 20 + 5)
        // edgeGfx.on('mouseover', () => console.log('line'))
        // edgeGfx.on('mouseout', () => console.log('line'))
        // edgeGfx.on('mousedown', () => console.log('line'))
        // edgeGfx.on('mouseup', () => console.log('line'))
        // edgeGfx.on('mouseupoutside', () => console.log('line'))

        edgeGfx.lineStyle(
          this.edgeStyleSelector(edge, 'width'),
          colorToNumber(this.edgeStyleSelector(edge, 'stroke')),
          this.edgeStyleSelector(edge, 'strokeOpacity')
        )

        const x0 = this.nodesById[edge.source.id].nodeGfx.x
        const y0 = this.nodesById[edge.source.id].nodeGfx.y
        const x1 = this.nodesById[edge.target.id].nodeGfx.x
        const y1 = this.nodesById[edge.target.id].nodeGfx.y
        edgeGfx.moveTo(x0, y0)
        edgeGfx.lineTo(x1, y1)
        edgeGfx.endFill()

        labelGfx.position = new PIXI.Point(x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.5)
        const rotation = Math.atan2(y1 - y0, x1 - x0)
        if (rotation > (Math.PI / 2)) {
          labelGfx.rotation = rotation - Math.PI
        } else if (rotation < (Math.PI / 2) * -1) {
          labelGfx.rotation = rotation + Math.PI
        } else {
          labelGfx.rotation = rotation
        }

        const text = labelGfx.getChildByName('text') as PIXI.Text
        // labelGfx.visible = false
        /**
         * TODO
         * - only double text resolution at high zoom, using occlusion (edge can't be occluded, but edge label can)
         * - half text resolution at low zoom
         * - though dynamically changing font size has really bad performance... maybe separate text objects should be created on initialization, and they are swapped on zoom
         */
        // if (this.viewport.scale.x > 1) {
        //   text.style.fontSize *= 2
        //   text.style.strokeThickness *= 2
        //   text.scale.set(0.5)
        // } else {
        //   text.style.fontSize /= 2
        //   text.style.strokeThickness /= 2
        //   text.scale.set(1)
        // }

        /**
         * hide label if line is too long 
         * TODO
         * - truncate text, rather than hiding, or shrink size
         * - improve text resolution at high zoom, and maybe decrease/hide at low zoom
         */
        // const edgeLength = Math.sqrt(Math.pow(xEnd - xStart, 2) + Math.pow(yEnd - yStart, 2)) -
        //   (this.nodeStyleSelector(edge.source, 'width') / 2) - 
        //   (this.nodeStyleSelector(edge.target, 'width') / 2) -
        //   (LABEL_X_PADDING * 2)
        const edgeLength = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2))
        if (text.width > edgeLength) {
          text.visible = false
        } else {
          text.visible = true
        }
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
        
        this.nodesLayer.removeChild(nodeGfx)
        this.labelsLayer.removeChild(nodeGfx.labelContainer)
        this.frontNodeLayer.addChild(nodeGfx)
        this.frontLabelLayer.addChild(nodeGfx.labelContainer)
        
        const circleBorder = new PIXI.Graphics()
        circleBorder.name = 'hoverBorder'
        circleBorder.x = 0
        circleBorder.y = 0
        circleBorder.lineStyle(this.nodeStyleSelector(this.hoveredNode, 'strokeWidth'), 0xaaaaaa)
        circleBorder.drawCircle(0, 0, radius)
        nodeGfx.addChild(circleBorder)
      }

      this.dirtyData = animationPending
      this.viewport.dirty = false
      this.app.render()
    } else if (this.viewport.dirty) {
      // console.log(this.viewport.scale.x, this.viewport.scale.y)
      this.viewport.dirty = false
      this.app.render()
    }
  }

  private nodeMouseOver = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode === undefined) {
      const node = this.nodesById[event.currentTarget.name].node
      this.hoveredNode = node
      this.dirtyData = true
      const { x, y } = this.viewport.toWorld(event.data.global)
      this.onNodeMouseEnter && this.onNodeMouseEnter(node, { x, y })
    }
  }

  private nodeMouseOut = (event: PIXI.interaction.InteractionEvent) => {
    const node = this.nodesById[event.currentTarget.name].node
    if (this.clickedNode === undefined && this.hoveredNode === node) {
      this.hoveredNode = undefined
      this.dirtyData = true
      const { x, y } = this.viewport.toWorld(event.data.global)
      this.onNodeMouseLeave && this.onNodeMouseLeave(node, { x, y })
    }
  }

  private nodeMouseDown = (event: PIXI.interaction.InteractionEvent) => {
    this.clickedNode = this.nodesById[event.currentTarget.name].node
    this.app.renderer.plugins.interaction.on('mousemove', this.nodeMove)
    this.viewport.pause = true
    this.dirtyData = true
    const { x, y } = this.viewport.toWorld(event.data.global)
    this.onNodeMouseDown && this.onNodeMouseDown(this.nodesById[event.currentTarget.name].node, { x, y })
  }

  private nodeMouseUp = (event: PIXI.interaction.InteractionEvent) => {
    if (this.clickedNode !== undefined) {
      const node = this.nodesById[this.clickedNode.id].node
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
      const node = this.nodesById[this.clickedNode.id].node
      const { x, y } = this.viewport.toWorld(event.data.global)
      this.nodesById[this.clickedNode.id].nodeGfx.move(x, y)
      this.dirtyData = true
      this.onNodeDrag && this.onNodeDrag(node, { x, y })
    }
  }
}

export const PixiRenderer = (options: RendererOptions) => new Renderer(options)
