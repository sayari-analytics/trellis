import { BitmapText, Text as PixiText, RenderTexture } from 'pixi.js'

export type Extend<T, R> = {
  [K in Exclude<keyof T, keyof R>]: T[K]
} & R

export type TextObject = PixiText | BitmapText

export type PointTuple = [x: number, y: number]

export type LinePoints = [x0: number, y0: number, x1: number, y1: number]

export type Texture = {
  get(...args: unknown[]): RenderTexture
  delete(): void
}

export interface RenderObjectLifecycle {
  mounted: boolean
  mount(index?: number): this
  unmount(): this
  delete(): undefined
}

export interface RenderObject extends RenderObjectLifecycle {
  moveTo(...args: number[]): this
}

export type InterpolateFn = (dt: number) => { value: number; done: boolean }
