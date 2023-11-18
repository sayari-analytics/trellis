import type { RenderObject, Interactions } from '@/types'
import { Circle, Container } from 'pixi.js'

export class NodeHitArea implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private _radius = 0
  private circle = new Circle()
  private hitArea = new Container()
  private container: Container
  private nodeRenderer: Interactions

  constructor(container: Container, nodeRenderer: Interactions) {
    this.container = container
    this.nodeRenderer = nodeRenderer

    this.hitArea.hitArea = this.circle
    this.hitArea.eventMode = 'static'
    this.hitArea.addEventListener('pointerenter', this.nodeRenderer.pointerEnter)
    this.hitArea.addEventListener('pointerdown', this.nodeRenderer.pointerDown)
    this.hitArea.addEventListener('pointerup', this.nodeRenderer.pointerUp)
    this.hitArea.addEventListener('pointercancel', this.nodeRenderer.pointerUp)
    this.hitArea.addEventListener('pointerleave', this.nodeRenderer.pointerLeave)
  }

  set radius(radius: number) {
    if (this._radius !== radius) {
      this._radius = radius
      this.circle.radius = radius
    }
  }

  moveTo(x: number, y: number) {
    if (this.x !== x) {
      this.x = x
      this.circle.x = x
    }
    if (this.y !== y) {
      this.y = y
      this.circle.y = y
    }

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
