import { interpolateBasis, interpolateNumber } from 'd3-interpolate'


export const noop = () => {}


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


export const animationFrameLoop = (cb: (time: number) => void) => {
  let frame: number

  const tick = (time: number) => {
    frame = requestAnimationFrame(tick)
    cb(time)
  }

  frame = requestAnimationFrame(tick)

  return () => cancelAnimationFrame(frame)
}


export const throttleAnimationFrame = <T extends unknown[]>(cb: (...args: T) => void) => {
  let tailArgs: T | undefined
  let clear = true

  return (...args: T) => {
    if (clear) {
      clear = false
      cb(...args)

      requestAnimationFrame(() => {
        if (tailArgs) {
          cb(...tailArgs)
        }
        tailArgs = undefined
        clear = true
      })
    } else {
      tailArgs = args
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
      cancelAnimationFrame(frame)
    }

    start = performance.now()
    end = start + duration

    const rafCallback = () => {
      const now = performance.now()
      if (now > end!) {
        cancelAnimationFrame(frame!)
        frame = undefined
        cb(1)
        return
      }

      cb((now - start!) / (end! - start!))
      frame = requestAnimationFrame(rafCallback)
    }

    frame = requestAnimationFrame(rafCallback)
  }
}


export const equals = <T>(a: T, b: T) => {
  if (a === b) {
    return true
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i])) {
        return false
      }
    }

    return true
  } else if (typeof a === 'object' && typeof b === 'object') {
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false
    }

    for (const key in a) {
      if (!equals(a[key], b[key])) {
        return false
      }
    }

    return true
  }

  return false
}


export const interpolate = (from: number, to: number, duration: number) => {
  const start = performance.now()
  const interpolator = interpolateNumber(from, to)
  const ease = interpolateBasis([from, interpolator(0.7), interpolator(0.95), to])

  return () => {
    const elapsed = performance.now() - start
    if (elapsed >= duration) {
      return { done: true, value: to }
    }

    return { done: false, value: ease(elapsed / duration) }
  }
}
