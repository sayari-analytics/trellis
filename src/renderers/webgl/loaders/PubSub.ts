import { warn } from '../../../utils'

export interface Subscriber<T, E = Error> {
  resolve: (result: T) => void
  reject: (error: E) => void
}

export class Subscription<T, E = Error> {
  private _unsubscribed = false

  constructor(
    private _publisher: Publisher<T, E>,
    private _executor: Subscriber<T, E>
  ) {
    this._publisher = _publisher
    this._executor = _executor
  }

  unsubscribe() {
    const done = this._publisher.completed || this._publisher.cancelled

    if (!done && !this._unsubscribed) {
      this._publisher.unsubscribe(this._executor)
    }

    this._unsubscribed = true
    return undefined
  }
}

export class Publisher<T, E = Error> {
  subscribers = new Set<Subscriber<T, E>>()

  private _loader: () => Promise<T>
  private _cancelled = false
  private _asset: T | null = null
  private _error: E | null = null

  constructor(asyncLoader: () => Promise<T>, syncLoader?: () => T | null) {
    this._loader = asyncLoader

    const asset = syncLoader?.() ?? null

    if (asset !== null) {
      this._asset = asset
    } else {
      this._load()
    }
  }

  subscribe(subscriber: Subscriber<T, E>) {
    if (this._asset !== null) {
      subscriber.resolve(this._asset)
    } else if (this._error !== null) {
      subscriber.reject(this._error)
    } else if (!this._cancelled) {
      this.subscribers.add(subscriber)
    }

    return new Subscription(this, subscriber)
  }

  unsubscribe(subscriber: Subscriber<T, E>) {
    this.subscribers.delete(subscriber)
    return undefined
  }

  cancel() {
    this._cancelled = true
    this.subscribers = new Set()
    return undefined
  }

  get completed() {
    return this._asset !== null || this._error !== null
  }

  get cancelled() {
    return this._cancelled
  }

  private async _load() {
    try {
      const asset = await this._loader()
      this._resolve(asset)
    } catch (error) {
      warn(error)
      this._reject(error as unknown as E)
    }
  }

  private _resolve(result: T) {
    if (!this.cancelled) {
      for (const { resolve } of this.subscribers) {
        resolve(result)
      }
    }

    this._asset = result
    this.subscribers = new Set()
  }

  private _reject(error: E) {
    if (!this.cancelled) {
      for (const { reject } of this.subscribers) {
        reject(error)
      }
    }

    this._error = error
    this.subscribers = new Set()
  }
}
