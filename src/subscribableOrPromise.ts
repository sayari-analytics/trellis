import { Subscribable, PartialObserver, Unsubscribable, Observable } from 'rxjs'


const noop = () => {}

// how to make this generic for all observables?
export class SubscribableOrPromise<T> implements PromiseLike<T>, Subscribable<T> {

  observableOrPromise: Observable<T> | Promise<T>

  constructor(observableOrPromise: Observable<T> | Promise<T>) {
    this.observableOrPromise = observableOrPromise
  }

  then = <Success = T, Error = never>(
    onfulfilled?: (value: T) => Success | PromiseLike<Success>,
    onrejected?: (reason: any) => Error | PromiseLike<Error>,
  ): PromiseLike<Success | Error> => {
    if (this.observableOrPromise instanceof Promise) {
      return this.observableOrPromise.then(onfulfilled, onrejected)
    } else {
      const source = this.observableOrPromise

      return new Promise<T>((accept, reject) => {
        let _data: T

        source.subscribe({
          next: (data) => { _data = data },
          error: reject,
          complete: () => {
            if (_data !== undefined) {
              accept(_data)
            }
          }
        })
      }).then(onfulfilled, onrejected)
    }
  }

  subscribe(observer?: PartialObserver<T>): Unsubscribable;

  subscribe(next: null | undefined, error: null | undefined, complete: () => void): Unsubscribable;

  subscribe(next: null | undefined, error: (error: any) => void, complete?: () => void): Unsubscribable;

  subscribe(next: (value: T) => void, error: null | undefined, complete: () => void): Unsubscribable;

  subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Unsubscribable;

  subscribe(a?: null | undefined | PartialObserver<T> | ((value: T) => void), b?: null | undefined | ((error: any) => void), c?: null | undefined | (() => void)) {
    if (this.observableOrPromise instanceof Promise) {
      let unsubscribed = false
      let next: (data: T) => void = noop
      let error: (err: any) => void = noop
      let complete: () => void = noop

      if (typeof a === 'function') {
        next = a
        if (typeof b === 'function') {
          error = b
        }
        if (typeof c === 'function') {
          complete = c
        }
      } else if (a === null || a === undefined) {
        if (typeof b === 'function') {
          error = b
        }
        if (typeof c === 'function') {
          complete = c
        }
      } else {
        if (a.next) {
          next = a.next.bind(a)
        }
        if (a.error) {
          error = a.error.bind(a)
        }
        if (a.complete) {
          complete = a.complete.bind(a)
        }
      }

    try {
      this.observableOrPromise
        .then((data) => {
          if (!unsubscribed) {
            next(data)
            complete()
          }
        })
        .catch((err) => {
          if (!unsubscribed) {
            error(err)
          }
        })
      } catch (e) {
        error(e)
      }

      return { unsubscribe: () => {} }
    } else {
      return this.observableOrPromise.subscribe(a as any, b as any, c as any)
    }
  }
}
