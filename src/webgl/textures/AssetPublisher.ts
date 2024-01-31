export interface Subscriber<T> {
  (asset: T | false): void
}

export class AssetSubscription<T, Publisher extends AssetPublisher<T> = AssetPublisher<T>> {
  constructor(
    protected _publisher: Publisher,
    protected _subscriber: Subscriber<T>
  ) {
    this._publisher = _publisher
    this._subscriber = _subscriber
  }

  get ready() {
    return this._publisher.ready
  }

  unsubscribe() {
    this._publisher.unsubscribe(this._subscriber)
  }
}

export abstract class AssetPublisher<T> {
  asset: T | false = false
  subscribers = new Set<Subscriber<T>>()

  protected abstract load(): Promise<void>
  abstract subscribe(fn: Subscriber<T>): AssetSubscription<T>

  get ready() {
    return this.asset !== false
  }

  unsubscribe(fn: Subscriber<T>) {
    this.subscribers.delete(fn)
    return undefined
  }

  delete() {
    this.subscribers = new Set()
    return undefined
  }

  protected notify(asset: T | false) {
    for (const fn of this.subscribers) {
      fn(asset)
    }

    this.subscribers = new Set()
  }
}
