import { BitmapText, Text as PixiText } from 'pixi.js'

export type Extend<T, R> = {
  [K in Exclude<keyof T, keyof R>]: T[K]
} & R

export type TextObject = PixiText | BitmapText
