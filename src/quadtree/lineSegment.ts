import { Indexable } from '.'
import { BoundingBox } from './boundingBox'

// const MIN_LINE_HOVER_RADIUS = 2

export class LineSegment extends BoundingBox implements Indexable {
  constructor(
    protected x0: number,
    protected y0: number,
    protected x1: number,
    protected y1: number,
    protected width: number
  ) {
    // TODO
    let minX: number
    let minY: number
    let maxX: number
    let maxY: number

    if (x0 <= x1) {
      minX = x0
      maxX = x1
    } else {
      minX = x1
      maxX = x0
    }

    if (y0 <= y1) {
      minY = y0
      maxY = y1
    } else {
      minY = y1
      maxY = y0
    }

    super(minX, minY, maxX, maxY)
  }

  override subnodes(centerX: number, centerY: number): (0 | 1 | 2 | 3)[] {
    // TODO
    const indexes: (0 | 1 | 2 | 3)[] = [],
      overlapsTopNodes = this.minY < centerY,
      overlapsBottomNodes = this.maxY >= centerY,
      overlapsLeftNodes = this.minX < centerX,
      overlapsRightNodes = this.maxX >= centerX

    if (overlapsTopNodes) {
      if (overlapsRightNodes) {
        indexes.push(0)
      }
      if (overlapsLeftNodes) {
        indexes.push(1)
      }
    }
    if (overlapsBottomNodes) {
      if (overlapsRightNodes) {
        indexes.push(3)
      }
      if (overlapsLeftNodes) {
        indexes.push(2)
      }
    }

    return indexes
  }

  override contains(x: number, y: number): boolean {
    // TODO
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY
  }
}
