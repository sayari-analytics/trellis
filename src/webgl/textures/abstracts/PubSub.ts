import { warn } from '../../../utils'

export interface Subscriber<T> {
  (asset: T): void
}

export interface Subscription {
  ready: boolean
  unsubscribe(): void
}

export default abstract class Publisher<T, S extends Subscription> {
  ready = false
  asset: T | null = null
  subscribers = new Set<Subscriber<T>>()

  protected abstract caller(): Promise<T>
  protected abstract subscription(subscriber: Subscriber<T>): S

  subscribe(subscriber: Subscriber<T>) {
    if (this.ready && this.asset !== null) {
      subscriber(this.asset)
    } else {
      this.subscribers.add(subscriber)
    }

    return this.subscription(subscriber)
  }

  unsubscribe(fn: Subscriber<T>) {
    this.subscribers.delete(fn)
    return undefined
  }

  delete() {
    this.subscribers = new Set()
    return undefined
  }

  protected async load() {
    try {
      this.asset = await this.caller()
      this.ready = true
      this.notify(this.asset)
    } catch (error) {
      warn(error)
      this.asset = null
      this.ready = false
      this.delete()
    }
  }

  protected notify(asset: T) {
    for (const fn of this.subscribers) {
      fn(asset)
    }

    this.subscribers = new Set()
  }
}
