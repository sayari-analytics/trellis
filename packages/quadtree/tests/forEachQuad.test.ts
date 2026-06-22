/* eslint-disable no-console */
import test from 'tape'
import { createGrid, quadIdToGridCell } from './utils'
import { Quadtree } from '../src'

test('[forEachQuad.test.ts] returns correct quadId and depth', (t) => {
  t.plan(1)

  const maxDepth = 3
  const treeGrid = createGrid<string>(maxDepth)
  const elements: number[] = []
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) elements.push(x, y, 0.1)
  const quadtree = new Quadtree(new Float32Array(elements), { maxDepth, maxCapacity: 0 })

  quadtree.forEachQuad((quadId, depth) => {
    const [row, col] = quadIdToGridCell(quadId)
    treeGrid[depth][row][col] = `${depth}|${quadId}`
    return true
  })

  t.deepEquals(treeGrid, [
    // depth 0 [1x1]
    [['0|0']],
    // depth 1 [2x2]
    [
      ['1|1', '1|2'],
      ['1|3', '1|4']
    ],
    // depth 2 [4x4]
    [
      ['2|5', '2|6', '2|9', '2|10'],
      ['2|7', '2|8', '2|11', '2|12'],
      ['2|13', '2|14', '2|17', '2|18'],
      ['2|15', '2|16', '2|19', '2|20']
    ],
    // depth 3 [8x8]
    [
      ['3|21', '3|22', '3|25', '3|26', '3|37', '3|38', '3|41', '3|42'],
      ['3|23', '3|24', '3|27', '3|28', '3|39', '3|40', '3|43', '3|44'],
      ['3|29', '3|30', '3|33', '3|34', '3|45', '3|46', '3|49', '3|50'],
      ['3|31', '3|32', '3|35', '3|36', '3|47', '3|48', '3|51', '3|52'],
      ['3|53', '3|54', '3|57', '3|58', '3|69', '3|70', '3|73', '3|74'],
      ['3|55', '3|56', '3|59', '3|60', '3|71', '3|72', '3|75', '3|76'],
      ['3|61', '3|62', '3|65', '3|66', '3|77', '3|78', '3|81', '3|82'],
      ['3|63', '3|64', '3|67', '3|68', '3|79', '3|80', '3|83', '3|84']
    ]
  ])
})

test('[forEachQuad.test.ts] returns correct quad min/max x/y', (t) => {
  t.plan(1)

  const maxDepth = 3
  const treeGrid = createGrid<string>(maxDepth)
  const elements: number[] = []
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) elements.push(x + 0.5, y + 0.5, 0.5)
  const quadtree = new Quadtree(new Float32Array(elements), { maxDepth, maxCapacity: 0 })

  quadtree.forEachQuad((quadId, depth, minX, maxX, minY, maxY) => {
    const [row, col] = quadIdToGridCell(quadId)
    treeGrid[depth][row][col] = `${minX.toFixed(1)}..${maxX.toFixed(1)}|${minY.toFixed(1)}..${maxY.toFixed(1)}`
    return true
  })

  t.deepEquals(treeGrid, [
    // depth 0 [1x1]
    [['0.0..4.0|0.0..4.0']],
    // depth 1 [2x2]
    [
      ['0.0..2.0|2.0..4.0', '2.0..4.0|2.0..4.0'],
      ['0.0..2.0|0.0..2.0', '2.0..4.0|0.0..2.0']
    ],
    // depth 2 [4x4]
    [
      ['0.0..1.0|3.0..4.0', '1.0..2.0|3.0..4.0', '2.0..3.0|3.0..4.0', '3.0..4.0|3.0..4.0'],
      ['0.0..1.0|2.0..3.0', '1.0..2.0|2.0..3.0', '2.0..3.0|2.0..3.0', '3.0..4.0|2.0..3.0'],
      ['0.0..1.0|1.0..2.0', '1.0..2.0|1.0..2.0', '2.0..3.0|1.0..2.0', '3.0..4.0|1.0..2.0'],
      ['0.0..1.0|0.0..1.0', '1.0..2.0|0.0..1.0', '2.0..3.0|0.0..1.0', '3.0..4.0|0.0..1.0']
    ],
    // depth 3 [8x8]
    [
      ['0.0..0.5|3.5..4.0', '0.5..1.0|3.5..4.0', '1.0..1.5|3.5..4.0', '1.5..2.0|3.5..4.0', '2.0..2.5|3.5..4.0', '2.5..3.0|3.5..4.0', '3.0..3.5|3.5..4.0', '3.5..4.0|3.5..4.0'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|3.0..3.5', '0.5..1.0|3.0..3.5', '1.0..1.5|3.0..3.5', '1.5..2.0|3.0..3.5', '2.0..2.5|3.0..3.5', '2.5..3.0|3.0..3.5', '3.0..3.5|3.0..3.5', '3.5..4.0|3.0..3.5'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|2.5..3.0', '0.5..1.0|2.5..3.0', '1.0..1.5|2.5..3.0', '1.5..2.0|2.5..3.0', '2.0..2.5|2.5..3.0', '2.5..3.0|2.5..3.0', '3.0..3.5|2.5..3.0', '3.5..4.0|2.5..3.0'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|2.0..2.5', '0.5..1.0|2.0..2.5', '1.0..1.5|2.0..2.5', '1.5..2.0|2.0..2.5', '2.0..2.5|2.0..2.5', '2.5..3.0|2.0..2.5', '3.0..3.5|2.0..2.5', '3.5..4.0|2.0..2.5'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|1.5..2.0', '0.5..1.0|1.5..2.0', '1.0..1.5|1.5..2.0', '1.5..2.0|1.5..2.0', '2.0..2.5|1.5..2.0', '2.5..3.0|1.5..2.0', '3.0..3.5|1.5..2.0', '3.5..4.0|1.5..2.0'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|1.0..1.5', '0.5..1.0|1.0..1.5', '1.0..1.5|1.0..1.5', '1.5..2.0|1.0..1.5', '2.0..2.5|1.0..1.5', '2.5..3.0|1.0..1.5', '3.0..3.5|1.0..1.5', '3.5..4.0|1.0..1.5'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|0.5..1.0', '0.5..1.0|0.5..1.0', '1.0..1.5|0.5..1.0', '1.5..2.0|0.5..1.0', '2.0..2.5|0.5..1.0', '2.5..3.0|0.5..1.0', '3.0..3.5|0.5..1.0', '3.5..4.0|0.5..1.0'], // eslint-disable-line prettier/prettier
      ['0.0..0.5|0.0..0.5', '0.5..1.0|0.0..0.5', '1.0..1.5|0.0..0.5', '1.5..2.0|0.0..0.5', '2.0..2.5|0.0..0.5', '2.5..3.0|0.0..0.5', '3.0..3.5|0.0..0.5', '3.5..4.0|0.0..0.5'] // eslint-disable-line prettier/prettier
    ]
  ])
})

test('[forEachQuad.test.ts] only traverses quads that merge does not prune', (t) => {
  t.plan(1)

  const maxDepth = 3
  const treeGrid = createGrid<number[]>(0)
  const quadtree = new Quadtree(new Float32Array([...[-1, 1, 0.1], ...[1, 1, 0.1], ...[-1, -1, 0.1], ...[1, -1, 0.1]]), { maxDepth })

  quadtree.forEachQuad((quadId, depth) => {
    const [row, col] = quadIdToGridCell(quadId)
    const cell: number[] = (treeGrid[depth][row][col] = [])

    for (const element of quadtree.forEachQuadElement(quadId)) {
      cell.push(element)
    }

    return true
  })

  t.deepEquals(
    treeGrid,
    [
      // depth 0 [1x1]
      [[[0, 1, 2, 3]]]
    ],
    'elements are correctly inserted into quads'
  )
})
