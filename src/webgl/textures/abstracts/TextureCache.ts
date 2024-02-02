export default abstract class TextureCache<T extends { delete: () => void }> {
  protected cache: { [key: string]: T } = {}

  delete() {
    for (const key in this.cache) {
      this.cache[key].delete()
    }

    this.cache = {}
  }
}
