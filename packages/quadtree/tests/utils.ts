import { Quadtree } from '../'

export const generateTypedArray = (elements: [x: number, y: number, r: number][]): Float32Array => {
  const typedArray = new Float32Array(elements.length * 3)

  for (let i = 0; i < elements.length; i++) {
    const elementPtr = i * 3
    typedArray[elementPtr] = elements[i][0]
    typedArray[elementPtr + 1] = elements[i][1]
    typedArray[elementPtr + 2] = elements[i][2]
  }

  return typedArray
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

export const createTreeGrid = <T>(depth: number): (null | T)[][][] => {
  return new Array(depth + 1).fill(null).map((_, depth) => {
    const dimension = 2 ** depth
    return new Array(dimension).fill(null).map(() => new Array(dimension).fill(null))
  })
}

export const quadIdToGridCell = (quadId: number, depth: number): [row: number, col: number] => {
  const offset = quadIdOffset(depth)
  return fromZIndex(quadId - offset)
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

export const recordQuadProperties = (quadtree: Quadtree, quads: { [quadId: number]: Quad }) => {
  return (quadId: number, depth: number, minX: number, maxX: number, minY: number, maxY: number) => {
    if (quads[quadId] !== undefined) {
      throw new Error(`forEachQuad emitted quad ${quadId} multiple times`)
    }

    const { centerOfMassX, centerOfMassY, aggregateMass } = quadtree.getQuad(quadId)

    quads[quadId] = {
      depth,
      minX,
      maxX,
      minY,
      maxY,
      centerOfMassX,
      centerOfMassY,
      aggregateMass,
      elements: []
    }

    for (const element of quadtree.getQuadElements(quadId)) {
      quads[quadId].elements.push(element)
    }

    quads[quadId].elements.sort()

    return true
  }
}

export const stringifyTreeGrid = (treeGrid: (number[] | null)[][][], depth: number): string => {
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

export const treeGridIsEmpty = (treeGrid: (number[] | null)[][][], depth: number): boolean => {
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
