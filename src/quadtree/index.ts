export interface Indexable {
  minX: number
  minY: number
  maxX: number
  maxY: number

  subnodes(centerX: number, centerY: number): (0 | 1 | 2 | 3)[]
  contains(x: number, y: number): boolean
}
