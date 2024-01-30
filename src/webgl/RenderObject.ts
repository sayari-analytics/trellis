import { Container, DisplayObject } from 'pixi.js'
import { RenderObjectLifecycle } from '../types'

export default abstract class RenderObject<T extends DisplayObject = DisplayObject> implements RenderObjectLifecycle {
  mounted = false

  protected x = 0
  protected y = 0

  protected declare abstract object: T

  constructor(protected container: Container) {
    this.container = container
  }

  moveTo(...args: number[]): this
  moveTo(x: number, y: number): this {
    if (this.x !== x) {
      this.x = x
      this.object.x = x
    }

    if (this.y !== y) {
      this.y = y
      this.object.y = y
    }

    return this
  }

  mount(index?: number): this {
    if (this.mounted) {
      return this
    }

    if (index !== undefined) {
      this.container.addChildAt(this.object, index)
    } else {
      this.container.addChild(this.object)
    }

    this.mounted = true

    return this
  }

  unmount(): this {
    if (!this.mounted) {
      return this
    }

    this.container.removeChild(this.object)
    this.mounted = false

    return this
  }

  delete(): void {
    this.unmount()
    this.object.destroy()

    return undefined
  }

  getContainerIndex(): number {
    if (this.mounted) {
      return this.container.getChildIndex(this.object)
    }

    return -1
  }
}
