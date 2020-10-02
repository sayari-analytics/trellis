export type Extend<T, R> = {
  [K in Exclude<keyof T, keyof R>]: T[K];
} & R
