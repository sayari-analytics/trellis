import { IComponent } from '.'
import { NodeHitArea } from '../objects/nodeHitArea'
import { NodeStrokes } from '../objects/nodeStrokes'
import { NodeFill } from '../objects/nodeFill'
import { TextIcon } from '../objects/textIcon'
import { ImageIcon } from '../objects/imageIcon'
import { NodeLabel } from '../objects/nodelabel'
import type { Renderer } from '..'
import { interpolate } from '../../../utils/helpers'
import type { Node } from '../../..'
import { MIN_LABEL_ZOOM } from '../../../utils/constants'

export const DEFAULT_NODE_OPTIONS = { x: 0, y: 0, radius: 12 }

export class NodeComponent implements IComponent {
  node?: Node
  x: number = DEFAULT_NODE_OPTIONS.x
  y: number = DEFAULT_NODE_OPTIONS.y
  radius: number = DEFAULT_NODE_OPTIONS.radius

  fill: NodeFill
  strokes: NodeStrokes
  imageIcon: ImageIcon
  textIcon: TextIcon
  label: NodeLabel
  hitArea: NodeHitArea

  private interpolateX?: (dt: number) => { value: number; done: boolean }
  private interpolateY?: (dt: number) => { value: number; done: boolean }
  private interpolateRadius?: (dt: number) => { value: number; done: boolean }

  constructor(private renderer: Renderer) {
    this.fill = new NodeFill(this.renderer.containers.nodes, this.renderer.textures.circle)
    this.strokes = new NodeStrokes(this.renderer.containers.nodes, this.renderer.textures.circle, this.fill)
    this.imageIcon = new ImageIcon(this.renderer.containers.nodes, this.renderer.textures.image)
    this.textIcon = new TextIcon(this.renderer.containers.nodes, this.renderer.textures.text)
    this.label = new NodeLabel(this.renderer.containers.labels, this.renderer.components.viewport.maxZoom)
    this.hitArea = new NodeHitArea(this.renderer, this)
  }

  render(dt: number, nextNode: Node) {
    /**
     * interpolate position/radius if:
     * - animateNodePosition option is enabled
     * - the node is not being dragged
     * - it's not the first time nodes have been rendered
     */
    const animateNodePosition = this.renderer.components.viewport.animateNodePosition
    const animateNodeRadius = this.renderer.components.viewport.animateNodeRadius
    const interpolatePosition = animateNodePosition && this.renderer.interactions.draggedNode !== this && this.renderer.renderedNodes

    // Calculate Next X Position
    let nextX = this.x
    if ((nextNode.x ?? 0) !== this.x) {
      if (interpolatePosition) {
        this.interpolateX = interpolate(this.x, nextNode.x ?? 0, animateNodePosition)
      } else {
        nextX = nextNode.x ?? 0
        this.interpolateX = undefined
      }
    } else if (this.interpolateX) {
      const { value, done } = this.interpolateX(dt)
      nextX = value

      if (done) this.interpolateX = undefined
    }

    // Calculate Next Y Position
    let nextY = this.y
    if ((nextNode.y ?? 0) !== this.y) {
      if (interpolatePosition) {
        this.interpolateY = interpolate(this.y, nextNode.y ?? 0, animateNodePosition)
      } else {
        nextY = nextNode.y ?? 0
        this.interpolateY = undefined
      }
    } else if (this.interpolateY) {
      const { value, done } = this.interpolateY(dt)
      nextY = value

      if (done) this.interpolateY = undefined
    }

    // Calculate Next Radius
    let nextRadius = this.radius
    if (nextNode.radius !== this.radius) {
      if (animateNodeRadius) {
        this.interpolateRadius = interpolate(this.radius, nextNode.radius, animateNodeRadius)
      } else {
        nextRadius = nextNode.radius
        this.interpolateRadius = undefined
      }
    } else if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(dt)
      nextRadius = value

      if (done) this.interpolateRadius = undefined
    }

    // Update Changes
    if (nextNode !== this.node || nextX !== this.x || nextY !== this.y || nextRadius !== this.radius) {
      // Update Node Fill
      this.fill.update(nextX, nextY, nextNode.style?.color, nextRadius)

      // Update Node Strokes
      if (nextNode.style?.stroke) {
        this.strokes.update(nextX, nextY, nextNode.style.stroke, nextRadius)
      } else {
        this.strokes.exit()
      }

      // Update Node Icon
      if (nextNode.style?.icon) {
        if (nextNode.style.icon.type === 'imageIcon') {
          this.imageIcon.update(nextX, nextY, nextNode.style.icon)
        } else {
          this.textIcon.update(nextX, nextY, nextNode.style.icon)
        }
      } else {
        this.imageIcon.exit()
        this.textIcon.exit()
      }

      // Update Node Label
      if (nextNode.label) {
        this.label.update(nextX, nextY, nextNode.label, nextNode.style?.label, nextRadius)
      } else {
        this.label.exit()
      }

      // Update Hit Area
      this.hitArea.update(nextX, nextY, nextRadius)
    }

    this.x = nextX
    this.y = nextY
    this.radius = nextRadius
    this.node = nextNode

    if (this.shouldCull()) {
      this.label.unmount()
      this.hitArea.unmount()
    } else {
      this.label.mount()
      this.hitArea.mount()
    }

    return this
  }

  delete() {
    this.fill.exit()
    this.strokes.exit()
    this.imageIcon.exit()
    this.textIcon.exit()
    this.label.exit()
    this.hitArea.exit()
  }

  private shouldCull() {
    const radius = this.strokes.radius ?? this.radius
    const left = this.x - radius
    const right = this.x + radius
    const top = this.y - radius
    const bottom = this.y + radius
    const viewport = this.renderer.components.viewport

    return (
      right < viewport.minX ||
      left > viewport.maxX ||
      bottom < viewport.minY ||
      top > viewport.maxY ||
      this.renderer.components.viewport.zoom < MIN_LABEL_ZOOM
    )
  }
}
