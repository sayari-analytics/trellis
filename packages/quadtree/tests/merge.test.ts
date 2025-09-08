/* eslint-disable no-console */
import test from 'tape'
import { createTreeGrid, quadIdToGridCell, stringifyTreeGrid, treeGridIsEmpty } from './utils'
import { Quadtree } from '../'

test('[merge.test.ts] merges elements that overlap multiple quads into correct parent quads', (t) => {
  t.plan(16)

  const maxDepth = 3
  const quadtree = new Quadtree(new Float32Array([...[50, 50, 24], ...[1, 199, 1], ...[199, 199, 1], ...[1, 1, 1]]), { maxDepth })
  const { insert, merge, forEachQuad, quadElements: _, quads: __ } = quadtree._debug()

  /**
   * insert elements into depth 3
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    insert()
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after insert: tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after insert: tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'after insert: tree is empty at depth 2')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 3),
      `\
[ 1 ,   ,   ,   ,   ,   ,   , 2 ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   , 0 , 0 ,   ,   ,   ,   ,   ]
[   , 0 , 0 ,   ,   ,   ,   ,   ]
[ 3 ,   ,   ,   ,   ,   ,   ,   ]`,
      'after insert: tree is populated at depth 3'
    )
  }

  /**
   * merge depth 3 elements to depth 2
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const depth = 2
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after tier 3 merge: tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after tier 3 merge: tree is empty at depth 1')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 2),
      `\
[ 1|  ,     ,     , 2|  ]
[     ,     ,     ,     ]
[ 0|  , 0|  ,     ,     ]
[ 0|3 , 0|  ,     ,     ]`,
      'after tier 3 merge: tree is populated at depth 2'
    )
    t.true(treeGridIsEmpty(treeGrid, 3), 'after tier 3 merge: tree is empty at depth 3')
  }

  /**
   * merge depth 2 elements to depth 1
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const depth = 1
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after tier 2 merge: tree is empty at depth 0')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 1),
      `\
[ 1|  , 2|  ]
[ 0|3 ,     ]`,
      'after tier 2 merge: tree is populated at depth 1'
    )
    t.true(treeGridIsEmpty(treeGrid, 2), 'after tier 2 merge: tree is empty at depth 2')
    t.true(treeGridIsEmpty(treeGrid, 3), 'after tier 2 merge: tree is empty at depth 3')
  }

  /**
   * merge depth 1 elements to depth 0
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    merge(0, 0)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.deepEquals(stringifyTreeGrid(treeGrid, 0), '[ 1|2|0|3 ]')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after tier 1 merge: tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'after tier 1 merge: tree is empty at depth 2')
    t.true(treeGridIsEmpty(treeGrid, 3), 'after tier 1 merge: tree is empty at depth 3')
  }
})

test('[merge.test.ts] doesnt merge overlapping elements into parent quads when quad capacity is exceeded', (t) => {
  t.plan(30)

  const maxDepth = 5
  const quadtree = new Quadtree(
    new Float32Array([
      ...[10, 10, 1],
      ...[-6, -0.5, 1],
      ...[-3, -6, 0.5],
      ...[-7, -10, 1],
      ...[-10, -10, 1],
      ...[-10, -9, 1],
      ...[-9.5, -6, 0.5],
      ...[-9.5, -4, 0.5],
      ...[-7.5, -7, 0.5],
      ...[-5, -8, 0.5]
    ]),
    { maxCapacity: 4, maxDepth: 5 }
  )
  const { insert, merge, forEachQuad, quadElements: _, quads: __ } = quadtree._debug()

  /**
   * insert elements into depth 5
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    insert()
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, 5))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after insert: tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after insert: tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'after insert: tree is empty at depth 2')
    t.true(treeGridIsEmpty(treeGrid, 3), 'after insert: tree is empty at depth 3')
    t.true(treeGridIsEmpty(treeGrid, 4), 'after insert: tree is empty at depth 4')
    t.deepEqual(
      stringifyTreeGrid(treeGrid, 5),
      `\
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 0|  , 0|  , 0|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 0|  , 0|  , 0|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 0|  , 0|  , 0|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     , 1|  , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     , 1|  , 1|  , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     , 1|  , 1|  , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     , 7|  , 7|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     , 7|  , 7|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     , 6|  , 6|  ,     ,     ,     ,     ,     ,     ,     , 2|  , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     , 6|  , 6|  ,     , 8|  , 8|  ,     ,     ,     ,     , 2|  , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     , 8|  , 8|  ,     ,     , 9|  , 9|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|  , 5|  , 5|  ,     ,     ,     ,     ,     , 9|  , 9|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|  , 5|  , 5|  ,     ,     ,     ,     ,     , 9|  , 9|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 5|4 , 5|4 ,     , 3|  , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 5|4 , 5|4 ,     , 3|  , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 4|  , 4|  , 4|  ,     , 3|  , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]`
    )
  }

  /**
   * merge depth 5 elements to depth 4
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const depth = 4
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after tier 5 merge: tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after tier 5 merge: tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'after tier 5 merge: tree is empty at depth 2')
    t.true(treeGridIsEmpty(treeGrid, 3), 'after tier 5 merge: tree is empty at depth 3')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 4),
      `\
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 0|  , 0|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 0|  , 0|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     , 1|  , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 7|  , 7|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 7|  , 7|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 6|  , 6|  , 8|  ,     ,     , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|  , 5|  , 8|  ,     , 9|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 5|4 , 3|  , 3|  , 9|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 5|4 , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]`,
      'after tier 5 merge: tree is populated at depth 4'
    )
    t.true(treeGridIsEmpty(treeGrid, 5), 'after tier 5 merge: tree is empty at depth 5')
  }

  /**
   * merge depth 4 elements to depth 3
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const depth = 3
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after tier 4 merge: tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after tier 4 merge: tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'after tier 4 merge: tree is empty at depth 2')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 3),
      `\
[     ,     ,     ,     ,     ,     ,     , 0|  ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     , 1|  , 1|  ,     ,     ,     ,     ,     ]
[     , 1|  , 1|  ,     ,     ,     ,     ,     ]
[ 7|  ,     ,     ,     ,     ,     ,     ,     ]
[ 6|5 , 8|  , 2|9 , 2|  ,     ,     ,     ,     ]
[ 5|4 , 3|  , 9|  ,     ,     ,     ,     ,     ]`,
      'after tier 4 merge: tree is populated at depth 3'
    )
    t.true(treeGridIsEmpty(treeGrid, 4), 'after tier 4 merge: tree is empty at depth 4')
    t.true(treeGridIsEmpty(treeGrid, 5), 'after tier 4 merge: tree is empty at depth 5')
  }

  /**
   * merge depth 3 elements to depth 2
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const depth = 2
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after tier 3 merge: tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'after tier 3 merge: tree is empty at depth 1')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 2),
      `\
[     ,     ,     , 0|  ]
[ 1|  , 1|  ,     ,     ]
[ 1|7 , 1|  ,     ,     ]
[     , 2|9 ,     ,     ]`,
      'after tier 3 merge: tree is populated at depth 2'
    )
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 3),
      `\
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[ 6|5 , 8|  ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 3|  ,     ,     ,     ,     ,     ,     ]`,
      'after tier 3 merge: tree is populated at depth 3'
    )
    t.true(treeGridIsEmpty(treeGrid, 4), 'after tier 3 merge: tree is empty at depth 4')
    t.true(treeGridIsEmpty(treeGrid, 5), 'after tier 3 merge: tree is empty at depth 5')
  }

  /**
   * merge depth 2 elements to depth 1
   */
  {
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const depth = 1
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(treeGridIsEmpty(treeGrid, 0), 'after tier 2 merge: tree is empty at depth 0')
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 1),
      `\
[ 1 , 0 ]
[   ,   ]`,
      'after tier 2 merge: tree is populated at depth 2'
    )
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 2),
      `\
[     ,     ,     ,     ]
[     ,     ,     ,     ]
[ 1|7 , 1|  ,     ,     ]
[     , 2|9 ,     ,     ]`,
      'after tier 2 merge: tree is populated at depth 2'
    )
    t.deepEquals(
      stringifyTreeGrid(treeGrid, 3),
      `\
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[ 6|5 , 8|  ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 3|  ,     ,     ,     ,     ,     ,     ]`,
      'after tier 2 merge: tree is populated at depth 3'
    )
    t.true(treeGridIsEmpty(treeGrid, 4), 'after tier 2 merge: tree is empty at depth 4')
    t.true(treeGridIsEmpty(treeGrid, 5), 'after tier 2 merge: tree is empty at depth 5')
  }
})
