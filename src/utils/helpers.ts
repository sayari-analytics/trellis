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

export const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value))

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
    if (Object.keys(a ?? {}).length !== Object.keys(b ?? {}).length) {
      return false
    }

    for (const key in a) {
      if (!equals(a[key], b?.[key])) {
        return false
      }
    }

    return true
  }

  return false
}

export const interpolate = (from: number, to: number, duration: number) => {
  let elapsed = 0
  const interpolator = interpolateNumber(from, to)
  const ease = interpolateBasis([from, interpolator(0.3), interpolator(0.8), interpolator(0.95), to])

  return (dt: number) => {
    elapsed += Math.max(20, dt)

    if (elapsed >= duration) {
      return { done: true, value: to }
    }

    return { done: false, value: ease(elapsed / duration) }
  }
}
