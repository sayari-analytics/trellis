import { IRendererObject } from '.'
import type { EdgeRenderer } from './edge'
import { NodeEventHandler } from '../eventHandlers/nodeEventHandler'
import { NodeStrokes } from './nodeStrokes'
import { NodeFill } from './nodeFill'
import { TextIcon } from './textIcon'
import { ImageIcon } from './imageIcon'
import { NodeLabel } from './nodelabel'
import type { Renderer } from '..'
import { type Node } from '../../..'
import { interpolate } from '../../../utils/helpers'

export class NodeRenderer implements IRendererObject {
  node?: Node
  x?: number
  y?: number
  radius?: number

  fill: NodeFill
  strokes: NodeStrokes
  imageIcon: ImageIcon
  textIcon: TextIcon
  label: NodeLabel
  eventHandler: NodeEventHandler
  outEdges = new Map<NodeRenderer, EdgeRenderer>()
  inEdges = new Map<NodeRenderer, EdgeRenderer>()
  renderIdx = -1

  private interpolateX?: { destination: number; next: (dt: number) => { value: number; done: boolean } }
  private interpolateY?: { destination: number; next: (dt: number) => { value: number; done: boolean } }
  private interpolateRadius?: { destination: number; next: (dt: number) => { value: number; done: boolean } }

  constructor(private renderer: Renderer) {
    this.fill = new NodeFill(this.renderer.containers.nodes, this.renderer.textures.circle)
    this.strokes = new NodeStrokes(this.renderer.containers.nodes, this.renderer.textures.circle, this.fill)
    this.imageIcon = new ImageIcon(this.renderer.containers.nodes, this.renderer.textures.image)
    this.textIcon = new TextIcon(this.renderer.containers.nodes, this.renderer.textures.text)
    this.label = new NodeLabel(this.renderer.containers.labels, this.renderer.components.viewport.maxZoom)
    this.eventHandler = new NodeEventHandler(this.renderer, this)
  }

  style(dt: number, nextNode: Node) {
    let nextRadius = nextNode.radius
    const animateNodeRadius = this.renderer.components.viewport.animateNodeRadius

    // Calculate next Radius
    if (this.interpolateRadius === undefined) {
      // we are not currently interpolating radius
      if (nextRadius !== this.radius && animateNodeRadius && this.radius !== undefined) {
        // we have a new radius to interpolate to
        this.interpolateRadius = { destination: nextRadius, next: interpolate(this.radius, nextRadius, animateNodeRadius) }
        nextRadius = this.radius
      }
    } else {
      // we are currently interpolating radius
      if (nextRadius !== this.interpolateRadius.destination) {
        // we have a new radius to interpolate to
        if (animateNodeRadius) {
          this.interpolateRadius = { destination: nextRadius, next: interpolate(this.radius!, nextRadius, animateNodeRadius) }
          nextRadius = this.radius!
        }
      } else {
        // we should continue the current interpolation
        const { value, done } = this.interpolateRadius.next(dt)
        nextRadius = value

        if (done) this.interpolateRadius = undefined
      }
    }

    // Style Node
    if (nextNode !== this.node || nextRadius !== this.radius) {
      if (this.renderer.components.debug) {
        this.renderer.components.debug.nodeUpdateCount++
      }

      this.node = nextNode
      this.radius = nextRadius

      // Update Node Fill
      this.fill.style(nextNode.style?.color, this.radius)

      // Update Node Strokes
      if (nextNode.style?.stroke) {
        this.strokes.style(nextNode.style.stroke, this.radius)
      } else {
        this.strokes.exit()
      }

      // Update Node Icon
      if (nextNode.style?.icon) {
        if (nextNode.style.icon.type === 'imageIcon') {
          this.textIcon.exit()
          this.imageIcon.style(nextNode.style.icon)
        } else {
          this.imageIcon.exit()
          this.textIcon.style(nextNode.style.icon)
        }
      } else {
        this.imageIcon.exit()
        this.textIcon.exit()
      }

      // Update Node Label
      if (nextNode.label) {
        this.label.style(nextNode.label, nextNode.style?.label, this.radius)
      } else {
        this.label.exit()
      }
    }

    return this
  }

  position(dt: number) {
    if (!this.node) {
      return this
    }

    let nextX = this.node.x ?? 0
    let nextY = this.node.y ?? 0

    /**
     * interpolate position/radius if:
     * - animateNodePosition option is enabled
     * - the node is not being dragged
     * - it's not the first time nodes have been rendered
     */
    const animateNodePosition = this.renderer.components.viewport.animateNodePosition
    const renderedNodes = this.renderer.components.nodes.renderedNodes
    const interpolatePosition = animateNodePosition && this.renderer.interactions.draggedNode !== this && renderedNodes

    // Calculate next X position
    if (this.interpolateX === undefined) {
      // we are not currently interpolating position
      if (nextX !== this.x && interpolatePosition) {
        // we have a new posistion to interpolate to
        if (this.x === undefined) {
          this.interpolateX = { destination: nextX, next: interpolate(0, nextX, animateNodePosition) }
          nextX = 0
        } else {
          this.interpolateX = { destination: nextX, next: interpolate(this.x, nextX, animateNodePosition) }
          nextX = this.x
        }
      }
    } else {
      // we are currently interpolating position
      if (nextX !== this.interpolateX.destination) {
        // we have a new position to interpolate to
        if (interpolatePosition) {
          this.interpolateX = { destination: nextX, next: interpolate(this.x!, nextX, animateNodePosition) }
          nextX = this.x!
        }
      } else {
        // we should continue the current interpolation
        const { value, done } = this.interpolateX.next(dt)
        nextX = value

        if (done) this.interpolateX = undefined
      }
    }

    // Calculate next Y position
    if (this.interpolateY === undefined) {
      // we are not currently interpolating position
      if (nextY !== this.y && interpolatePosition) {
        // we have a new posistion to interpolate to
        if (this.y === undefined) {
          this.interpolateY = { destination: nextY, next: interpolate(0, nextY, animateNodePosition) }
          nextY = 0
        } else {
          this.interpolateY = { destination: nextY, next: interpolate(this.y, nextY, animateNodePosition) }
          nextY = this.y
        }
      }
    } else {
      // we are currently interpolating position
      if (nextY !== this.interpolateY.destination) {
        // we have a new position to interpolate to
        if (interpolatePosition) {
          this.interpolateY = { destination: nextY, next: interpolate(this.y!, nextY, animateNodePosition) }
          nextY = this.y!
        }
      } else {
        // we should continue the current interpolation
        const { value, done } = this.interpolateY.next(dt)
        nextY = value

        if (done) this.interpolateY = undefined
      }
    }

    if (nextX !== this.x || nextY !== this.y) {
      if (this.renderer.components.debug) {
        this.renderer.components.debug.nodeUpdateCount++
      }

      this.x = nextX
      this.y = nextY

      this.fill.position(this.x, this.y)
      this.strokes.position(this.x, this.y)
      this.textIcon.position(this.x, this.y)
      this.imageIcon.position(this.x, this.y)
      this.label.position(this.x, this.y)
      this.eventHandler.update(this.x, this.y, this.strokes.radius ?? this.radius ?? 0)
      /**
       * TODO - if an edge's source and target both move, only update position once
       */
      for (const edgeComponent of this.outEdges.values()) edgeComponent.position()
      for (const edgeComponent of this.inEdges.values()) edgeComponent.position()
    }

    return this
  }

  exit() {
    this.fill.exit()
    this.strokes.exit()
    this.imageIcon.exit()
    this.textIcon.exit()
    this.label.exit()
  }
}
