import { FederatedPointerEvent } from 'pixi.js'

export type Extend<T, R> = {
  [K in Exclude<keyof T, keyof R>]: T[K]
} & R

export interface RenderObject {
  mounted: boolean
  // moveTo(...args: number[]): this
  mount(): this
  unmount(): this
  delete(): void
}

export interface Interactions {
  pointerEnter(event: FederatedPointerEvent): void
  pointerDown(event: FederatedPointerEvent): void
  pointerUp(event: FederatedPointerEvent): void
  pointerLeave(event: FederatedPointerEvent): void
}

export interface RenderObjectLifecycle {
  mounted: boolean
  mount(index?: number): this
  unmount(): this
  delete(): void
}

export interface RendererClass {
  update(...args: unknown[]): this
  render(dt: number): this
  delete(): void
}

export interface InterpolateFunction {
  (dt: number): { value: number; done: boolean }
}
