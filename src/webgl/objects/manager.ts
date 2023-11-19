import { RenderObject } from './../../types'

export class ObjectManager<Object extends RenderObject = RenderObject> {
  private batchSize: number

  private batch = new Map<Object, 0 | 1 | 2>()

  constructor(batchSize: number) {
    this.batchSize = batchSize
  }

  mount(object: Object) {
    this.batch.set(object, 0)
  }

  unmount(object: Object) {
    this.batch.set(object, 1)
  }

  delete(object: Object) {
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
