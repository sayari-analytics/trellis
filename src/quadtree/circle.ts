import { Indexable } from '.'
import { BoundingBox } from './boundingBox'

export class Circle extends BoundingBox implements Indexable {
  protected radiusSquared: number

  constructor(
    protected x: number,
    protected y: number,
    protected radius: number
  ) {
    super(x - radius, y - radius, x + radius, y + radius)
    this.radiusSquared = radius * radius
  }

  override contains(x: number, y: number): boolean {
    return (
      x >= this.minX &&
      x <= this.maxX &&
      y >= this.minY &&
      y <= this.maxY &&
      Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) <= this.radiusSquared
    )
  }
}
