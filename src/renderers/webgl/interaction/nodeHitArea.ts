import { Circle, Container } from 'pixi.js'
import { NodeRenderer } from '../node'

export class NodeHitArea {
  mounted = false

  private container: Container
  private nodeRenderer: NodeRenderer
  private hitArea = new Container()

  constructor(container: Container, nodeRenderer: NodeRenderer) {
    this.container = container
    this.nodeRenderer = nodeRenderer

    this.hitArea.eventMode = 'static'
    this.hitArea.addEventListener('pointerenter', this.nodeRenderer.pointerEnter)
    this.hitArea.addEventListener('pointerdown', this.nodeRenderer.pointerDown)
    this.hitArea.addEventListener('pointerup', this.nodeRenderer.pointerUp)
    this.hitArea.addEventListener('pointerupoutside', this.nodeRenderer.pointerUp)
    this.hitArea.addEventListener('pointercancel', this.nodeRenderer.pointerUp)
    this.hitArea.addEventListener('pointerleave', this.nodeRenderer.pointerLeave)
  }

  update(x: number, y: number, radius: number) {
    this.hitArea.hitArea = new Circle(x, y, radius)

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChild(this.hitArea)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.hitArea)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.hitArea.destroy()
    return undefined
  }
}
