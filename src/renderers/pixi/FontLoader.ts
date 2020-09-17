import FontFaceObserver from 'fontfaceobserver'


const cache: { [family: string]: undefined | true } = {}


export class CancellablePromise <T> {
  private thenCallback?: (result: T) => void
  private result?: T
  private cancelled = false

  constructor(resolver: (resolve: (result: T) => void) => void) {
    resolver((result) => {
      this.result = result
      if (this.thenCallback && !this.cancelled) {
        this.thenCallback(result)
      }
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
    this.thenCallback = undefined
  }
}


export const FontLoader = (family: string) => {
  if (cache[family]) {
    return new CancellablePromise<void>((resolve) => resolve())
  } else if ((document as any)?.fonts?.load) {
    return new CancellablePromise<void>((resolve) => {
      (document as any).fonts.load(`1em ${family}`).then(() => {
        cache[family] = true
        resolve()
      })
    })
  } else {
    return new CancellablePromise<void>((resolve) => {
      new FontFaceObserver(family).load().then(() => {
        cache[family] = true
        resolve()
      })
    })
  }
}
