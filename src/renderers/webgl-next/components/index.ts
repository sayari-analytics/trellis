export interface IComponent {
  render(...args: unknown[]): this
  delete(): void
}
