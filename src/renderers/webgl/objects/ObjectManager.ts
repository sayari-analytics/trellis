import { RenderObjectLifecycle } from '../../../types'

export default class ObjectManager<T extends RenderObjectLifecycle> {
  private batch = new Map<T, 0 | 1 | 2>()

  constructor(private limit: number) {
    this.limit = limit
  }

  mount(object: T) {
    this.batch.set(object, 0)
  }

  unmount(object: T) {
    this.batch.set(object, 1)
  }

  delete(object: T) {
    this.batch.set(object, 2)
  }

  render() {
    let count = 0

    for (const [object, operation] of this.batch) {
      if (count === this.limit) {
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

  isMounted(object: T) {
    const code = this.batch.get(object)
    return code === 0 || (code === undefined && object.mounted)
  }
}
