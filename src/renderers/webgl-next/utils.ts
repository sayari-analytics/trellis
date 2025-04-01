/* eslint-disable no-console */
import type { Edge } from '../../types'
import { throttle } from '../../utils/helpers'

export const HALF_PI = Math.PI / 2

export const TWO_PI = Math.PI * 2

export const THREE_HALF_PI = HALF_PI * 3

export const RADIANS_PER_DEGREE = Math.PI / 180

export const movePoint = (x: number, y: number, theta: number, distance: number): [x: number, y: number] => [
  x + Math.cos(theta) * distance,
  y + Math.sin(theta) * distance
]

export const midPoint = (x0: number, y0: number, x1: number, y1: number): [x: number, y: number] => [(x0 + x1) / 2, (y0 + y1) / 2]

export const isASCII = (str: string) => {
  for (const char of str) {
    if (char.codePointAt(0)! > 126) {
      return false
    }
  }

  return true
}

export type Canceler = void | (() => void)

export type Executor<T> = (resolve: (result: T) => void, reject: (err: unknown) => void) => Canceler

export const doAsync = <T>(executor: Executor<T>, onfulfilled: (result: T) => void, onrejected: (result: unknown) => void) => {
  let cancelled = false

  const onCancel = executor(
    (result) => {
      if (!cancelled) onfulfilled(result)
    },
    (err) => {
      if (!cancelled) onrejected(err)
    }
  )

  return () => {
    cancelled = true
    onCancel?.()
  }
}

export const doAllAsync = <T>(executors: Executor<T>[], onfulfilled: (result: T[]) => void, onrejected: (result: unknown) => void) => {
  const results: T[] = new Array(executors.length)
  let resultCount = 0
  let cancelled = false

  const onCancelFns = executors.map((executor, idx) => {
    return executor(
      (result) => {
        if (!cancelled) {
          results[idx] = result
          if (++resultCount === results.length) {
            onfulfilled(results)
          }
        }
      },
      (err) => {
        if (!cancelled) {
          onrejected(err)
        }
        cancelled = true
      }
    )
  })

  return () => {
    cancelled = true
    onCancelFns.forEach((onCancel) => onCancel?.())
  }
}

export const logUnknownEdgeError = throttle((edge: Edge) => {
  console.error(`Error: Cannot render edge between unknown nodes ${edge.source} and ${edge.target}`)
}, 10)

export const time = (fn: () => void) => {
  const t0 = Date.now()
  fn()
  return Date.now() - t0
}
