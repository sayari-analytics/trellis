import { RenderObject, Stroke } from '../../../../types'
import { Container } from 'pixi.js'
import { equals } from '../../../../utils/api'
import CircleTexture from '../../textures/CircleTexture'
import Circle from './Circle'

export default class CircleStrokes implements RenderObject {
  mounted = false

  private x = 0
  private y = 0
  private minRadius = 0
  private maxRadius = 0
  private objects: Circle[] = []
  private strokes: Stroke[] = []

  constructor(
    private container: Container,
    private texture: CircleTexture,
    private fill: Circle
  ) {
    this.container = container
    this.texture = texture
    this.fill = fill
    this.minRadius = fill.radius
    this.maxRadius = fill.radius
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

      for (const object of this.objects) {
        object.moveTo(x, y)
      }
    }

    return this
  }

  resize(radius: number) {
    if (radius !== this.minRadius) {
      this.minRadius = radius
      this.maxRadius = radius

      for (let i = 0; i < this.strokes.length; i += 1) {
        this.objects[i].resize(this.increment(this.strokes[i].width))
      }
    }

    return this
  }

  mount() {
    if (!this.mounted) {
      this.mounted = true

      for (const object of this.objects) {
        object.mount()
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
    this.maxRadius = this.minRadius

    return undefined
  }

  get radius() {
    return this.maxRadius
  }

  private increment(width: number) {
    this.maxRadius += width
    return this.maxRadius
  }

  private applyStrokes(strokes: Stroke[]) {
    this.objects = []
    this.strokes = strokes
    this.maxRadius = this.minRadius

    const index = this.fill.getContainerIndex()

    for (const { color, width } of strokes) {
      const object = new Circle(this.container, this.texture, index)
      this.objects.push(object.update(color).resize(this.increment(width)).moveTo(this.x, this.y))
    }

    return this
  }
}
