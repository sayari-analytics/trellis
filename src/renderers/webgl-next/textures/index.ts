export interface ITexture {
  scaleFactor: number
  getTexture(...args: unknown[]): void
  delete(): void
}
