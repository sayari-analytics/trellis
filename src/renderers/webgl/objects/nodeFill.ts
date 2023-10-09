import { Container, Sprite } from 'pixi.js'
import * as Graph from '../../..'
import { NodeRenderer } from '../node'
import { CircleTexture } from '../textures/circle'

const DEFAULT_NODE_FILL = 0xaaaaaa

export class NodeFill {
  mounted = false
  containerIndex: number
  fill: Sprite // TODO - make private

  private container: Container
  private circleTexture: CircleTexture
  private nodeRenderer: NodeRenderer
  private radius?: number
  private style?: Graph.NodeStyle

  constructor(container: Container, circleTexture: CircleTexture, nodeRenderer: NodeRenderer) {
    this.container = container
    this.circleTexture = circleTexture
    this.nodeRenderer = nodeRenderer
    this.fill = new Sprite(this.circleTexture.texture)
    this.fill.anchor.set(0.5)
    this.fill.visible = false

    // TODO - disable events if node has no event handlers
    // TODO - disable events if node diameter > ~5px
    // TODO - disable events when dragging/scrolling
    this.fill.eventMode = 'static'
    // why doesn't this work? does this need a container?
    // this.#fill.hitArea = new Circle(this.node.x ?? 0, this.node.y ?? 0, fullRadius)
    this.fill.addEventListener('pointerenter', this.nodeRenderer.pointerEnter)
    this.fill.addEventListener('pointerdown', this.nodeRenderer.pointerDown)
    this.fill.addEventListener('pointerup', this.nodeRenderer.pointerUp)
    this.fill.addEventListener('pointerupoutside', this.nodeRenderer.pointerUp)
    this.fill.addEventListener('pointercancel', this.nodeRenderer.pointerUp)
    this.fill.addEventListener('pointerleave', this.nodeRenderer.pointerLeave)

    this.container.addChild(this.fill)
    this.containerIndex = this.container.getChildIndex(this.fill)
  }

  update(x: number, y: number, radius: number, style?: Graph.NodeStyle) {
    if ((style?.color ?? DEFAULT_NODE_FILL) !== (this.style?.color ?? DEFAULT_NODE_FILL)) {
      this.fill.tint = style?.color ?? DEFAULT_NODE_FILL
    }

    if (radius !== this.radius) {
      this.fill.scale.set(radius / this.circleTexture.scaleFactor)
      this.radius = radius
    }

    this.fill.x = x
    this.fill.y = y

    this.style = style

    return this
  }

  mount() {
    if (!this.mounted) {
      // TODO - why is mounting/unmouting fill Sprite less efficient?
      this.fill.visible = true
      // this.container.addChild(this.fill)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.fill.visible = false
      // this.container.removeChild(this.fill)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.fill.destroy()

    return undefined
  }
}
