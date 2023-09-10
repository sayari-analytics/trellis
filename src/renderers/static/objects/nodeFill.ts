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
  private node?: Graph.Node
  
  constructor(renderer: StaticRenderer, nodeRenderer: NodeRenderer, node: Graph.Node) {
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

    this.update(node)
  }

  update(node: Graph.Node) {
    if ((node.style?.color ?? DEFAULT_NODE_FILL) !== (this.node?.style?.color ?? DEFAULT_NODE_FILL)) {
      this.circle.tint = node.style?.color ?? DEFAULT_NODE_FILL
    }

    if (node.radius !== this.node?.radius) {
      this.circle.scale.set(node.radius / this.renderer.circle.scaleFactor)
    }

    this.circle.x = node.x ?? 0
    this.circle.y = node.y ?? 0

    this.node = node

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
