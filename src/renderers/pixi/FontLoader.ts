import FontFaceObserver from 'fontfaceobserver'

const cache: { [family: string]: boolean } = {}

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

export const FontLoader = (family: string): CancellablePromise<string> => {	
  if (cache[family]) {	
    return new CancellablePromise<string>((resolve) => resolve(family))	
  } else if ((document as any)?.fonts?.load) {	
    return new CancellablePromise<string>((resolve) => {	
      (document as any).fonts.load(`1em ${family}`).then(() => {	
        cache[family] = true	
        resolve(family)	
      })	
    })	
  } else {	
    return new CancellablePromise<string>((resolve) => {	
      new FontFaceObserver(family).load().then(() => {	
        cache[family] = true	
        resolve(family)	
      })	
    })	
  }	
}