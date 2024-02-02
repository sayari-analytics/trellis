import { Container, Rectangle } from 'pixi.js'
import HitArea from './HitArea'

export default class RectangleHitArea extends HitArea<Rectangle> {
  private _width: number
  private _height: number

  constructor(container: Container, x = 0, y = 0, width = 200, height = 200) {
    super(container, new Rectangle(x, y, width, height))
    this.x = x
    this.y = y
    this._width = width
    this._height = height
  }

  get width() {
    return this._width
  }

  set width(width: number) {
    if (width !== this.width) {
      this.width = width
      this.shape.width = width
    }
  }

  get height() {
    return this._height
  }

  set height(height: number) {
    if (height !== this.height) {
      this.height = height
      this.shape.height = height
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
