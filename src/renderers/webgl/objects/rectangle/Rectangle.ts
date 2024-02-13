import { RenderObject } from '../../../../types'

export default class Rectangle implements RenderObject {
  mounted = false

  moveTo(): this {
    return this
  }
  mount() {
    this.mounted = true
    return this
  }
  unmount(): this {
    this.mounted = false
    return this
  }
  delete(): void {
    this.unmount()
  }
}
