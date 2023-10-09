export interface RenderObject {
  mounted: boolean

  mount(): this

  unmount(): this

  delete(): void
}

export class ObjectManager {
  private batchSize: number

  private batch = new Map<RenderObject, 0 | 1 | 2>()

  constructor(batchSize: number) {
    this.batchSize = batchSize
  }

  mount(object: RenderObject) {
    this.batch.set(object, 0)
  }

  unmount(object: RenderObject) {
    this.batch.set(object, 1)
  }

  delete(object: RenderObject) {
    this.batch.set(object, 2)
  }

  render() {
    let count = 0

    for (const [object, operation] of this.batch) {
      if (count === this.batchSize) {
        break
      }

      switch (operation) {
        case 0:
          object.mount()
          break
        case 1:
          object.unmount()
          break
        case 2:
          object.delete()
      }

      this.batch.delete(object)

      count++
    }
  }
}
