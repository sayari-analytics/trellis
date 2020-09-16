import FontFaceObserver from 'fontfaceobserver'


const cache: { [family: string]: undefined | true } = {}


export class CancellablePromise <T> {
  private thenCallback?: (result: T) => void
  private result?: T
  private cancelled = false

  constructor(resolver: (resolve: (result: T) => void) => void) {
    resolver((result) => {
      this.result = result
      this.thenCallback && this.thenCallback(result)
    })
  }

  then(cb: (result: T) => void) {
    if (!this.cancelled) {
      if (this.result) {
        cb(this.result)
      } else {
        this.thenCallback = cb
      }
    }
  }

  cancel() {
    this.cancelled = true
  }
}


export const FontLoader = (family: string) => {
  if (cache[family]) {
    return new CancellablePromise<void>((resolve) => resolve())
  } else {
    return new CancellablePromise<void>((resolve) => {
      new FontFaceObserver(family).load().then(() => resolve())
    })
  }
}
