import raf from 'raf'


// TODO - move to renderers/utils.ts?
export const throttle = <T extends unknown[]>(cb: (...args: T) => void, duration: number) => {
  let clear = true

  return (...args: T) => {
    if (clear) {
      setTimeout(() => {
        cb(...args)
        clear = true
      }, duration)

      clear = false
    }
  }
}


export const batch = <T extends unknown>(cb: (args: T[]) => void, duration: number) => {
  let values: T[] = []
  let clear = true

  return (arg: T) => {
    if (clear) {
      setTimeout(() => {
        cb(values)
        values = []
        clear = true
      }, duration)

      clear = false
    }

    values.push(arg)
  }
}


export const animationFrameLoop = (cb: () => void) => {
  let frame: number

  const tick = () => {
    cb()
    frame = raf(tick)
  }

  frame = raf(tick)

  return () => raf.cancel(frame)
}


export const throttleAnimationFrame = <T extends unknown[]>(cb: (...args: T) => void) => {
  let clear = true

  return (...args: T) => {
    if (clear) {
      raf(() => {
        cb(...args)
        clear = true
      })

      clear = false
    }
  }
}


export const identity = <T>(value: T) => value


export const interpolateInterval = (count: number, duration: number) => {
  let i = 0
  let interval: number | undefined = undefined

  return (cb: (n: number) => void) => {
    if (interval !== undefined) {
      clearInterval(interval)
      i = 0
    }

    interval = setInterval(() => {
      if (i++ >= count - 1) {
        clearInterval(interval)
        interval = undefined
      }

      cb(i / count)
    }, duration / count) as unknown as number
  }
}


export const interpolateDuration = (duration: number) => {
  let start: number | undefined
  let end: number | undefined
  let frame: number | undefined

  return (cb: (n: number) => void) => {
    if (frame !== undefined) {
      raf.cancel(frame)
    }

    start = Date.now()
    end = start + duration

    const rafCallback = () => {
      const now = Date.now()
      if (now > end!) {
        raf.cancel(frame!)
        frame = undefined
        cb(1)
        return
      }

      cb((now - start!) / (end! - start!))
      frame = raf(rafCallback)
    }

    frame = raf(rafCallback)
  }
}
