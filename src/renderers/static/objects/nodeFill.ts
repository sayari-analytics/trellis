import { Sprite } from 'pixi.js-legacy'
import * as Graph from '../../..'
import { StaticRenderer } from '..'
import { NodeRenderer } from '../node'


const DEFAULT_NODE_FILL = 0xaaaaaa


export class NodeFill {

  mounted = false
  containerIndex: number
  circle: Sprite // TODO - make private

  private renderer: StaticRenderer
  private nodeRenderer: NodeRenderer
  private radius?: number
  private style?: Graph.NodeStyle
  
  constructor(renderer: StaticRenderer, nodeRenderer: NodeRenderer) {
    this.renderer = renderer
    this.nodeRenderer = nodeRenderer
    this.circle = new Sprite(this.renderer.circle.texture)
    this.circle.anchor.set(0.5)
    this.circle.visible = false

    // TODO - disable events if node has no event handlers
    // TODO - disable events if node diameter > ~5px
    // TODO - disable events when dragging/scrolling
    this.circle.eventMode = 'static'
    // why doesn't this work? does this need a container?
    // this.#fill.hitArea = new Circle(this.node.x ?? 0, this.node.y ?? 0, fullRadius)
    this.circle.addEventListener('pointerenter', this.nodeRenderer.pointerEnter)
    this.circle.addEventListener('pointerdown', this.nodeRenderer.pointerDown)
    this.circle.addEventListener('pointerup', this.nodeRenderer.pointerUp)
    this.circle.addEventListener('pointerupoutside', this.nodeRenderer.pointerUp)
    this.circle.addEventListener('pointercancel', this.nodeRenderer.pointerUp)
    this.circle.addEventListener('pointerleave', this.nodeRenderer.pointerLeave)

    this.renderer.nodesContainer.addChild(this.circle)
    this.containerIndex = this.renderer.nodesContainer.getChildIndex(this.circle)
  }

  update(x: number, y: number, radius: number, style?: Graph.NodeStyle) {
    if ((style?.color ?? DEFAULT_NODE_FILL) !== (this.style?.color ?? DEFAULT_NODE_FILL)) {
      this.circle.tint = style?.color ?? DEFAULT_NODE_FILL
    }

    if (radius !== this.radius) {
      this.circle.scale.set(radius / this.renderer.circle.scaleFactor)
      this.radius = radius
    }

    this.circle.x = x
    this.circle.y = y

    this.style = style

    return this
  }

  mount() {
    if (!this.mounted) {
      // TODO - why is mounting/unmouting fill Sprite less efficient?
      this.circle.visible = true
      // this.renderer.nodesContainer.addChild(this.circle)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.circle.visible = false
      // this.renderer.nodesContainer.removeChild(this.circle)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.circle.destroy()

    return undefined
  }
}
