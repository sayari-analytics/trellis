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

// export const interpolateInterval = (count: number, duration: number) => {
//   let i = 0
//   let interval: number | undefined = undefined

//   return (cb: (n: number) => void) => {
//     if (interval !== undefined) {
//       clearInterval(interval)
//       i = 0
//     }

//     interval = setInterval(() => {
//       if (i++ >= count - 1) {
//         clearInterval(interval)
//         interval = undefined
//       }

//       cb(i / count)
//     }, duration / count) as unknown as number
//   }
// }

// export const interpolateDuration = (duration: number) => {
//   let start: number | undefined
//   let end: number | undefined
//   let frame: number | undefined

//   return (cb: (n: number) => void) => {
//     if (frame !== undefined) {
//       cancelAnimationFrame(frame)
//     }

//     start = performance.now()
//     end = start + duration

//     const rafCallback = () => {
//       const now = performance.now()
//       if (now > end!) {
//         cancelAnimationFrame(frame!)
//         frame = undefined
//         cb(1)
//         return
//       }

//       cb((now - start!) / (end! - start!))
//       frame = requestAnimationFrame(rafCallback)
//     }

//     frame = requestAnimationFrame(rafCallback)
//   }
// }

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

/**
 * generic function for representing a value that is possibly asynchronous
 * think of this as a promise, except that
 * - it can resolve synchronously
 * - it can be cancelled
 * - it is lazy
 * - it doesn't automatically catch unhandled errors
 * - it can't be chained
 *
 * // given the following promise
 * const delay = new Promise((resolve) => setTimeout(() => resolve('done'), 1000))
 * delay
 *   .then((message) => console.log(message))
 *   .catch((error) => console.error(message))
 *
 * // the above can be rewritten using Async as
 * const delay = Async((resolve, reject) => setTimeout(() => resolve('done'), 1000))
 * delay(
 *   (message) => console.log(message),
 *   (error) => console.error(error)
 * )
 *
 * // to illustrate what an Async function can do that a Promise can't:
 * // create the Async function delay, which randomly resolves synchronously, asynchronously, or rejects
 * const delay = Async((resolve, reject) => {
 *   let timeout: NodeJS.Timeout
 *
 *   const random = Math.random() > 0.5
 *   if (random < 0.3) {
 *     // resolve synchronously
 *     resolve('done synchronously')
 *   } else if (random < 0.6) {
 *     // resolve asynchronously
 *     timeout = setTimeout(() => resolve('done asynchronously'), 1000)
 *   } else {
 *     // reject
 *     timeout = setTimeout(() => reject(new Error('nope')), 1000)
 *   }
 *
 *   return () => clearTimeout(timeout)
 * })
 *
 * // delay's inner logic is lazy, so not run until delay is invoked
 * const cancel = delay(
 *   (message) => console.log(message),
 *   (error) => console.error(error)
 * )
 *
 * // a new execution of delay is run every time delay is invoked
 * const cancel2 = delay(
 *   (message) => console.log(message),
 *   (error) => console.error(error)
 * )
 *
 * // any execution of delay can be cancelled at any time
 * cancel()
 * setTimeout(() => cancel2(), 100)
 *
 */

export type Executor<T, E> = (resolve: (result: T) => void, reject: (error: E) => void) => CancelAsyncHandler

export type CancelAsyncHandler = void | (() => void)

export const Async = <T, E>(executor: Executor<T, E>) => {
  return (onResolved: (result: T) => void = noop, onRejected: (error: E) => void = noop) => {
    let cancelled = false

    const onCancelled = executor(
      (result: T) => {
        if (!cancelled) {
          onResolved(result)
        }
      },
      (error: E) => {
        if (!cancelled) {
          onRejected(error)
        }
      }
    )

    return () => {
      cancelled = true
      onCancelled?.()
    }
  }
}

export const isNumber = (value: unknown): value is number => typeof value === 'number'
export const isString = (value: unknown): value is string => typeof value === 'string'
