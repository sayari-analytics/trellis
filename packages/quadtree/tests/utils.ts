import { Quadtree } from '../src'

export const createGrid = <T>(depth: number): (null | T)[][][] => {
  return new Array(depth + 1).fill(null).map((_, depth) => {
    const dimension = 2 ** depth
    return new Array(dimension).fill(null).map(() => new Array(dimension).fill(null))
  })
}

export const zIndex = (col: number, row: number): number => {
  col = (col | (col << 8)) & 0x00ff00ff
  col = (col | (col << 4)) & 0x0f0f0f0f
  col = (col | (col << 2)) & 0x33333333
  col = (col | (col << 1)) & 0x55555555

  row = (row | (row << 8)) & 0x00ff00ff
  row = (row | (row << 4)) & 0x0f0f0f0f
  row = (row | (row << 2)) & 0x33333333
  row = (row | (row << 1)) & 0x55555555

  return (row << 1) | col
}

export const fromZIndex = (z: number): [row: number, col: number] => {
  let col = z & 0x55555555
  col = (col | (col >> 1)) & 0x33333333
  col = (col | (col >> 2)) & 0x0f0f0f0f
  col = (col | (col >> 4)) & 0x00ff00ff
  col = (col | (col >> 8)) & 0x0000ffff

  let row = (z >> 1) & 0x55555555
  row = (row | (row >> 1)) & 0x33333333
  row = (row | (row >> 2)) & 0x0f0f0f0f
  row = (row | (row >> 4)) & 0x00ff00ff
  row = (row | (row >> 8)) & 0x0000ffff

  return [row, col]
}

export const quadIdOffset = (depth: number) => (4 ** depth - 1) / 3

export const quadIdToGridCell = (quadId: number): [row: number, col: number] => {
  const depth = Math.floor(Math.log(3 * quadId + 1) / Math.log(4))
  const offset = quadIdOffset(depth)
  return fromZIndex(quadId - offset)
}

export const quadtreeToGrid = (quads: Uint32Array, quadElements: Uint32Array, maxDepth: number): (null | number[])[][][] => {
  const grid = createGrid<number[]>(maxDepth)

  const maxQuadId = quadIdOffset(maxDepth + 1)
  const NULL_POINTER = 0xffffffff
  const BRANCH_POINTER = 0xfffffffe
  let quadId = 0

  while (quadId < maxQuadId) {
    const depth = Math.floor(Math.log(3 * quadId + 1) / Math.log(4))
    const [row, col] = quadIdToGridCell(quadId)
    let quadElementPtr = quads[quadId]

    if (quadElementPtr !== BRANCH_POINTER && quadElementPtr !== NULL_POINTER) {
      const cell: number[] = (grid[depth][row][col] = [])

      while (quadElementPtr !== NULL_POINTER) {
        cell.push(quadElements[quadElementPtr])
        quadElementPtr = quadElements[quadElementPtr + 1]
      }
    }

    quadId++
  }

  return grid
}

export type Quad = {
  depth: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  centerOfMassX: number | undefined
  centerOfMassY: number | undefined
  aggregateMass: number
  elements: number[]
}

export const stringifyGrid = (treeGrid: (number[] | null)[][][], depth: number): string => {
  let maxCellElementCount = 0
  for (const row of treeGrid[depth]) {
    for (const cell of row) {
      if (cell !== null && cell.length > maxCellElementCount) maxCellElementCount = cell.length
    }
  }

  const nullString = Array(maxCellElementCount * 2 + 1)
    .fill(' ')
    .join('')

  return treeGrid[depth]
    .map((row) => {
      return `[${row
        .map((cell) => {
          if (cell === null) return nullString
          return ` ${new Array(maxCellElementCount)
            .fill(null)
            .map((_, i) => (cell[i] === undefined ? ' ' : cell[i]))
            .join('|')} `
        })
        .join(',')}]`
    })
    .join('\n')
}

export const gridIsEmpty = (treeGrid: (number[] | null)[][][], depth: number): boolean => {
  for (const row of treeGrid[depth]) {
    for (const cell of row) {
      if (cell !== null) {
        return false
      }
    }
  }
  return true
}

export const stringifyQuadElements = (quads: Uint32Array, quadElements: Uint32Array, depth: number) => {
  return (
    '\n**quadElements:**\n' +
    Array.from(quadElements)
      .map((element, idx) => (element === 0xffffffff ? '_' : element.toString()).padEnd(Math.floor(Math.log10(idx)) + 1, ' '))
      .join(',') +
    '\n' +
    Array.from(quadElements)
      .map((_, idx) => idx.toString().padEnd(Math.floor(Math.log10(idx))))
      .join(',') +
    `\n**quadElementPtr at depth ${depth}:**\n` +
    Array.from(quads)
      .filter((_, idx) => idx % 2 === 0)
      .map((quadElementPtr, idx) =>
        (quadElementPtr === 0xffffffff ? '_' : quadElementPtr.toString()).padEnd(Math.floor(Math.log10(idx)) + 1, ' ')
      )
      .slice(quadIdOffset(depth), quadIdOffset(depth + 1))
      .join(',') +
    '\n' +
    Array.from(quads)
      .filter((_, idx) => idx % 2 === 0)
      .map((_, idx) => idx.toString().padEnd(Math.floor(Math.log10(idx))))
      .slice(quadIdOffset(depth), quadIdOffset(depth + 1))
      .join(',') +
    '\n'
  )
}

export const recordQuadProperties = (quadtree: Quadtree, quads: { [quadId: number]: Quad }) => {
  return (
    quadId: number,
    depth: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    mass: number,
    massX?: number,
    massY?: number
  ) => {
    if (quads[quadId] !== undefined) {
      throw new Error(`forEachQuad emitted quad ${quadId} multiple times`)
    }

    quads[quadId] = {
      depth,
      minX,
      maxX,
      minY,
      maxY,
      aggregateMass: mass,
      centerOfMassX: massX,
      centerOfMassY: massY,
      elements: []
    }

    for (const element of quadtree.forEachQuadElement(quadId)) {
      quads[quadId].elements.push(element)
    }

    quads[quadId].elements.sort()

    return true
  }
}
