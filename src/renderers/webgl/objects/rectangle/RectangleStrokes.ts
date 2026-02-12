import { Dimensions, RenderObject, Stroke } from '../../../../types'
import { Container } from 'pixi.js'
import { equals } from '../../../../utils/api'
import Rectangle from './Rectangle'

export default class RectangleStrokes implements RenderObject {
  mounted = false

  private x = 0
  private y = 0

  private minSize: Dimensions = { width: 0, height: 0 }
  private maxSize: Dimensions = { width: 0, height: 0 }
  private objects: Rectangle[] = []

  constructor(
    private container: Container,
    private fill: Rectangle,
    private strokes: Stroke[] = []
  ) {
    this.container = container
    this.fill = fill
    this.applyStrokes(strokes)
  }

  update(strokes: Stroke[] = []) {
    if (!equals(this.strokes, strokes)) {
      const isMounted = this.mounted

      this.delete()
      this.applyStrokes(strokes)

      if (isMounted) {
        this.mount()
      }
    }

    return this
  }

  moveTo(x: number, y: number) {
    const dirty = x !== this.x || y !== this.y

    if (dirty) {
      this.x = x
      this.y = y
      let _x = x
      let _y = y

      for (let i = 0; i < this.strokes.length; i += 1) {
        _x -= this.strokes[i].width
        _y -= this.strokes[i].width
        this.objects[i].moveTo(_x, _y)
      }
    }

    return this
  }

  resize({ width, height }: Dimensions) {
    if (width !== this.minSize.width || height !== this.minSize.height) {
      this.minSize = { width, height }
      this.maxSize = this.minSize

      for (let i = 0; i < this.strokes.length; i += 1) {
        this.objects[i].resize(this.increment(this.strokes[i].width))
      }
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.mounted = true

      const index = this.fill.getContainerIndex()

      for (const object of this.objects) {
        object.mount(index)
      }
    }

    return this
  }

  unmount() {
    if (this.mounted) {
      this.mounted = false

      for (const object of this.objects) {
        object.unmount()
      }
    }

    return this
  }

  delete() {
    this.mounted = false

    for (const object of this.objects) {
      object.delete()
    }

    this.strokes = []
    this.objects = []
    this.maxSize = this.minSize

    return undefined
  }

  get size() {
    return this.maxSize
  }

  private increment(value: number) {
    const { width, height } = this.size
    this.maxSize = { width: width + value * 2, height: height + value * 2 }
    return this.maxSize
  }

  private applyStrokes(strokes: Stroke[]) {
    this.objects = []
    this.strokes = strokes
    this.minSize = this.fill.size
    this.maxSize = this.minSize

    let x = this.x
    let y = this.y

    for (const { width, ...style } of strokes) {
      x -= width
      y -= width
      const object = new Rectangle(this.container, style)
      this.objects.push(object.resize(this.increment(width)).moveTo(x, y))
    }

    return this
  }
}
