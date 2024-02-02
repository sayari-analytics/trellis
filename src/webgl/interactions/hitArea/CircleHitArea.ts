import { Container, Circle as PixiCircle } from 'pixi.js'
import HitArea from './HitArea'

export default class CircleHitArea extends HitArea<PixiCircle> {
  constructor(container: Container) {
    super(container, new PixiCircle())
  }

  get radius() {
    return this.shape.radius
  }

  set radius(radius: number) {
    if (this.shape.radius !== radius) {
      this.shape.radius = radius
    }
  }

  override moveTo(x: number, y: number) {
    if (this.x !== x) {
      this.x = x
      this.shape.x = x
    }

    if (this.y !== y) {
      this.y = y
      this.shape.y = y
    }

    return this
  }
}
