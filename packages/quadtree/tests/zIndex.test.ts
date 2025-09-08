/* eslint-disable no-console */
import test from 'tape'

const zIndex = (col: number, row: number): number => {
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

test('[zIndex.test.ts] computes correct z index morton code', (t) => {
  t.plan(5)

  /**
   * depth 0
   * [0]
   *
   * depth 1
   * [0,1]
   * [2,3]
   *
   * depth 2
   * [00,01,04,05]
   * [02,03,06,07]
   * [08,09,12,13]
   * [10,11,14,15]
   *
   * depth 3
   * [00,01,04,05,16,17,20,21]
   * [02,03,06,07,18,19,22,23]
   * [08,09,12,13,24,25,28,29]
   * [10,11,14,15,26,27,30,31]
   * [32,33,36,37,48,49,52,53]
   * [34,35,38,39,50,51,54,55]
   * [40,41,44,45,56,57,60,61]
   * [42,43,46,47,58,59,62,63]
   */
  t.equals(zIndex(0, 0), 0)
  t.equals(zIndex(0, 2), 8)
  t.equals(zIndex(2, 0), 4)
  t.equals(zIndex(5, 3), 27)
  t.equals(zIndex(6, 7), 62)
})

const getQuadId = (x: number, y: number, depth: number): number => {
  const offset = (4 ** depth - 1) / 3
  return offset + zIndex(x, y)
}

test('[zIndex.test.ts] computes correct quadId given x, y and depth', (t) => {
  t.plan(5)

  /**
   * depth 0
   * [0]
   *
   * depth 1
   * [1,2]
   * [3,4]
   *
   * depth 2
   * [05,06,09,10]
   * [07,08,11,12]
   * [13,14,17,18]
   * [15,16,19,20]
   *
   * depth 3
   * [21,22,25,26,37,38,41,42]
   * [23,24,27,28,39,40,43,44]
   * [29,30,33,34,45,46,49,50]
   * [31,32,35,36,47,48,51,52]
   * [53,54,57,58,69,70,73,74]
   * [55,56,59,60,71,72,75,76]
   * [61,62,65,66,77,78,81,82]
   * [63,64,67,68,79,80,83,84]
   */
  t.equals(getQuadId(0, 0, 0), 0)
  t.equals(getQuadId(0, 1, 1), 3)
  t.equals(getQuadId(2, 1, 2), 11)
  t.equals(getQuadId(5, 3, 3), 48)
  t.equals(getQuadId(4, 5, 3), 71)
})

const getFirstChildQuadId = (parentQuadId: number): number => 4 * parentQuadId + 1

const getParentQuadId = (childQuadId: number): number => Math.floor((childQuadId - 1) / 4)

test('[zIndex.test.ts] computes parent and child quads', (t) => {
  t.plan(11)

  t.equals(getFirstChildQuadId(0), 1)
  t.equals(getFirstChildQuadId(3), 13)
  t.equals(getFirstChildQuadId(11), 45)
  t.equals(getFirstChildQuadId(17), 69)

  t.equals(getParentQuadId(66), 16)
  t.equals(getParentQuadId(47), 11)
  t.equals(getParentQuadId(24), 5)
  t.equals(getParentQuadId(17), 4)
  t.equals(getParentQuadId(18), 4)
  t.equals(getParentQuadId(19), 4)
  t.equals(getParentQuadId(20), 4)
})

const getElementLeafQuadIds = (
  element: { x: number; y: number; r: number },
  grid: { minX: number; maxX: number; minY: number; maxY: number; depth: number }
): number[] => {
  const quadIds: number[] = []

  const { x, y, r } = element
  const { minX, maxX, minY, maxY, depth } = grid

  const offset = (4 ** depth - 1) / 3
  const leafQuadDimension = 2 ** depth
  const cellWidth = (maxX - minX) / leafQuadDimension
  const cellHeight = (maxY - minY) / leafQuadDimension

  // Find all leaf quads at depth overlapping the element's aabb
  const startCol = Math.max(0, Math.floor((x - r - minX) / cellWidth))
  const endCol = Math.min(leafQuadDimension - 1, Math.floor((x + r - minX) / cellWidth))
  const startRow = Math.max(0, Math.floor((maxY - (y + r)) / cellHeight))
  const endRow = Math.min(leafQuadDimension - 1, Math.floor((maxY - (y - r)) / cellHeight))

  // Compute quadId for each leaf quad
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      let x = (col | (col << 8)) & 0x00ff00ff
      x = (col | (col << 4)) & 0x0f0f0f0f
      x = (col | (col << 2)) & 0x33333333
      x = (col | (col << 1)) & 0x55555555

      let y = (row | (row << 8)) & 0x00ff00ff
      y = (row | (row << 4)) & 0x0f0f0f0f
      y = (row | (row << 2)) & 0x33333333
      y = (row | (row << 1)) & 0x55555555

      quadIds.push(offset + ((y << 1) | x))
    }
  }

  return quadIds
}

test('[zIndex.test.ts] indexes element in correct leaf quads', (t) => {
  t.plan(9)

  const minX = 16
  const maxX = 32
  const minY = 16
  const maxY = 32

  t.deepEquals(getElementLeafQuadIds({ x: 24, y: 24, r: 1 }, { minX, maxX, minY, maxY, depth: 0 }), [0], 'insert into root quad')

  t.deepEquals(getElementLeafQuadIds({ x: 18, y: 30, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }), [1], 'insert into depth 1 nw quad')
  t.deepEquals(getElementLeafQuadIds({ x: 30, y: 30, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }), [2], 'insert into depth 1 ne quad')
  t.deepEquals(getElementLeafQuadIds({ x: 18, y: 18, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }), [3], 'insert into depth 1 sw quad')
  t.deepEquals(getElementLeafQuadIds({ x: 30, y: 18, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }), [4], 'insert into depth 1 se quad')

  t.deepEquals(
    getElementLeafQuadIds({ x: 24, y: 30, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }),
    [1, 2],
    'insert overlapping element into nw and ne quad'
  )
  t.deepEquals(
    getElementLeafQuadIds({ x: 30, y: 24, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }),
    [2, 4],
    'insert overlapping element into ne and se quad'
  )
  t.deepEquals(
    getElementLeafQuadIds({ x: 24, y: 24, r: 1 }, { minX, maxX, minY, maxY, depth: 1 }),
    [1, 2, 3, 4],
    'insert overlapping element into all quads'
  )
  t.deepEquals(
    getElementLeafQuadIds({ x: 24, y: 24, r: 1 }, { minX, maxX, minY, maxY, depth: 2 }),
    [8, 11, 14, 17],
    'insert overlapping element into all quads'
  )
})
