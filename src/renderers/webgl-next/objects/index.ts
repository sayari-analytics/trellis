export interface IRendererObject {
  style(...args: unknown[]): this
  position(...args: unknown[]): this
  exit(): void
}
