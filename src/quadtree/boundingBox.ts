import { Indexable } from '.'

export class BoundingBox implements Indexable {
  minX: number
  minY: number
  maxX: number
  maxY: number

  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }

  subnodes(centerX: number, centerY: number): (0 | 1 | 2 | 3)[] {
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

  contains(x: number, y: number) {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY
  }
}
