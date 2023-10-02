export interface RenderObject {
  mounted: boolean

  mount(): this

  unmount(): this

  delete(): void
}

export class ObjectManager {

  private batchSize: number

  private toMount = new Set<RenderObject>()

  private toUnmount = new Set<RenderObject>()

  private toDelete = new Set<RenderObject>()

  constructor(batchSize: number) {
    this.batchSize = batchSize
  }

  mount(object: RenderObject) {
    this.toUnmount.delete(object)
    this.toMount.add(object)
  }

  unmount(object: RenderObject) {
    this.toMount.delete(object)
    this.toUnmount.add(object)
  }

  delete(object: RenderObject) {
    this.toMount.delete(object)
    this.toUnmount.delete(object)
    this.toDelete.add(object)
  }

  render() {
    let toDeleteCount = 0
    let toMountCount = 0
    let toUnmountCount = 0

    for (const object of this.toDelete) {
      if (toMountCount === this.batchSize) {
        break
      }

      object.delete()

      this.toDelete.delete(object)

      toDeleteCount++
    }

    for (const object of this.toMount) {
      if (toMountCount === this.batchSize) {
        break
      }

      object.mount()

      this.toMount.delete(object)

      toMountCount++
    }

    for (const object of this.toUnmount) {
      if (toUnmountCount === this.batchSize) {
        break
      }

      object.unmount()

      this.toUnmount.delete(object)

      toUnmountCount++
    }
  }
}
