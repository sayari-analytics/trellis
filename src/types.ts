export type Extend<T, R> = {
  [K in Exclude<keyof T, keyof R>]: T[K]
} & R

export type Stroke = {
  color: string
  width: number
}

export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'
