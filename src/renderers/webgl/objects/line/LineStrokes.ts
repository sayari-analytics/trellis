import { RenderObject, Stroke } from '../../../../types'
import { Container } from 'pixi.js'
import { equals } from '../../../../utils/api'
import LineSegment from './LineSegment'

export default class LineStrokes implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private length = 0
  private angle = 0
  private minWidth = 0
  private maxWidth = 0
  private objects: LineSegment[] = []

  constructor(
    private container: Container,
    private fill: LineSegment,
    private strokes: Stroke[] = []
  ) {
    this.container = container
    this.fill = fill
    this.length = fill.length
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
    } else if (this.fill.width !== this.minWidth) {
      this.minWidth = this.fill.width
      this.maxWidth = this.minWidth

      for (let i = 0; i < this.strokes.length; i += 1) {
        const { color, width, opacity } = this.strokes[i]
        this.objects[i].update(color, this.increment(width), opacity)
      }
    }

    return this
  }

  moveTo(x: number, y: number) {
    const dirty = x !== this.x || y !== this.y

    if (dirty) {
      this.x = x
      this.y = y

      for (const object of this.objects) {
        object.moveTo(x, y)
      }
    }

    return this
  }

  resize(length: number) {
    if (length !== this.length) {
      this.length = length

      for (const object of this.objects) {
        object.resize(length)
      }
    }

    return this
  }

  rotate(angle: number) {
    if (angle !== this.angle) {
      this.angle = angle
      for (const object of this.objects) {
        object.rotate(angle)
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
    this.maxWidth = this.minWidth

    return undefined
  }

  get width() {
    return this.maxWidth
  }

  private increment(value: number) {
    this.maxWidth += value
    return this.maxWidth
  }

  private applyStrokes(strokes: Stroke[]) {
    this.objects = []
    this.strokes = strokes
    this.minWidth = this.fill.width
    this.maxWidth = this.minWidth

    for (const stroke of strokes) {
      const object = new LineSegment(this.container, { ...stroke, width: this.increment(stroke.width) })
      this.objects.push(object.rotate(this.angle).resize(this.length).moveTo(this.x, this.y))
    }

    return this
  }
}
