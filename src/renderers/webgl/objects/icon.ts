import { Container, Sprite, Texture } from 'pixi.js'

export default class Icon {
  mounted = false

  private x = 0
  private y = 0
  private object: Sprite

  constructor(
    private container: Container,
    private texture: Texture,
    private fill: { getContainerIndex: () => number },
    public offset?: { x?: number; y?: number },
    public scale = 1
  ) {
    this.container = container
    this.texture = texture
    this.fill = fill
    this.scale = scale
    this.offset = offset
    this.object = this.create()
  }

  update(texture: Texture, scale = 1, offset?: { x?: number; y?: number }) {
    this.scale = scale
    this.offset = offset

    if (texture !== this.object.texture) {
      this.texture = texture
      this.object.texture = texture
      this.object.scale.set(scale)
    }

    return this
  }

  moveTo(_x: number, _y: number) {
    const x = _x + this.offsetX
    const y = _y + this.offsetY

    if (x !== this.x) {
      this.x = x
      this.object.x = x
    }

    if (y !== this.y) {
      this.y = y
      this.object.y = y
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.container.addChildAt(this.object, this.fill.getContainerIndex() + 1)
      this.mounted = true
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.container.removeChild(this.object)
      this.mounted = false
    }

    return this
  }

  delete() {
    this.unmount()
    this.object.destroy()

    return undefined
  }

  private get offsetX() {
    return this.offset?.x ?? 0
  }

  private get offsetY() {
    return this.offset?.y ?? 0
  }

  private create() {
    const icon = new Sprite(this.texture)
    icon.scale.set(this.scale)
    icon.anchor.set(0.5)
    icon.x = this.x
    icon.y = this.y
    return icon
  }
}
