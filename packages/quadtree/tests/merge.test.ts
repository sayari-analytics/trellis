/* eslint-disable no-console */
import test from 'tape'
import { stringifyGrid, gridIsEmpty, quadtreeToGrid } from './utils'
import { Quadtree } from '../'

test('[merge.test.ts] merges elements that overlap multiple quads into correct parent quads', (t) => {
  t.plan(16)

  const maxDepth = 3
  const quadtree = new Quadtree(new Float32Array([...[50, 50, 24], ...[1, 199, 1], ...[199, 199, 1], ...[1, 1, 1]]), { maxDepth })
  const { rebuild, insert, merge, quads, quadElements } = quadtree._debug()
  rebuild()

  /**
   * insert elements into depth 3
   */
  {
    insert()
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after insert: tree is empty at depth 0')
    t.true(gridIsEmpty(grid, 1), 'after insert: tree is empty at depth 1')
    t.true(gridIsEmpty(grid, 2), 'after insert: tree is empty at depth 2')
    t.deepEquals(
      stringifyGrid(grid, 3),
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
    const depth = 2
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after tier 3 merge: tree is empty at depth 0')
    t.true(gridIsEmpty(grid, 1), 'after tier 3 merge: tree is empty at depth 1')
    t.deepEquals(
      stringifyGrid(grid, 2),
      `\
[ 1|  ,     ,     , 2|  ]
[     ,     ,     ,     ]
[ 0|  , 0|  ,     ,     ]
[ 0|3 , 0|  ,     ,     ]`,
      'after tier 3 merge: tree is populated at depth 2'
    )
    t.true(gridIsEmpty(grid, 3), 'after tier 3 merge: tree is empty at depth 3')
  }

  /**
   * merge depth 2 elements to depth 1
   */
  {
    const depth = 1
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after tier 2 merge: tree is empty at depth 0')
    t.deepEquals(
      stringifyGrid(grid, 1),
      `\
[ 1|  , 2|  ]
[ 0|3 ,     ]`,
      'after tier 2 merge: tree is populated at depth 1'
    )
    t.true(gridIsEmpty(grid, 2), 'after tier 2 merge: tree is empty at depth 2')
    t.true(gridIsEmpty(grid, 3), 'after tier 2 merge: tree is empty at depth 3')
  }

  /**
   * merge depth 1 elements to depth 0
   */
  {
    merge(0, 0)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.deepEquals(stringifyGrid(grid, 0), '[ 1|2|0|3 ]')
    t.true(gridIsEmpty(grid, 1), 'after tier 1 merge: tree is empty at depth 1')
    t.true(gridIsEmpty(grid, 2), 'after tier 1 merge: tree is empty at depth 2')
    t.true(gridIsEmpty(grid, 3), 'after tier 1 merge: tree is empty at depth 3')
  }
})

test('[merge.test.ts] doesnt merge elements into parent quads when quad capacity is exceeded', (t) => {
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
  const { rebuild, insert, merge, quads, quadElements } = quadtree._debug()
  rebuild()

  /**
   * insert elements into depth 5
   */
  {
    insert()
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, 5))
    t.true(gridIsEmpty(grid, 0), 'after insert: tree is empty at depth 0')
    t.true(gridIsEmpty(grid, 1), 'after insert: tree is empty at depth 1')
    t.true(gridIsEmpty(grid, 2), 'after insert: tree is empty at depth 2')
    t.true(gridIsEmpty(grid, 3), 'after insert: tree is empty at depth 3')
    t.true(gridIsEmpty(grid, 4), 'after insert: tree is empty at depth 4')
    t.deepEqual(
      stringifyGrid(grid, 5),
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
    const depth = 4
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after tier 5 merge: tree is empty at depth 0')
    t.true(gridIsEmpty(grid, 1), 'after tier 5 merge: tree is empty at depth 1')
    t.true(gridIsEmpty(grid, 2), 'after tier 5 merge: tree is empty at depth 2')
    t.true(gridIsEmpty(grid, 3), 'after tier 5 merge: tree is empty at depth 3')
    t.deepEquals(
      stringifyGrid(grid, 4),
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
    t.true(gridIsEmpty(grid, 5), 'after tier 5 merge: tree is empty at depth 5')
  }

  /**
   * merge depth 4 elements to depth 3
   */
  {
    const depth = 3
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after tier 4 merge: tree is empty at depth 0')
    t.true(gridIsEmpty(grid, 1), 'after tier 4 merge: tree is empty at depth 1')
    t.true(gridIsEmpty(grid, 2), 'after tier 4 merge: tree is empty at depth 2')
    t.deepEquals(
      stringifyGrid(grid, 3),
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
    t.true(gridIsEmpty(grid, 4), 'after tier 4 merge: tree is empty at depth 4')
    t.true(gridIsEmpty(grid, 5), 'after tier 4 merge: tree is empty at depth 5')
  }

  /**
   * merge depth 3 elements to depth 2
   */
  {
    const depth = 2
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after tier 3 merge: tree is empty at depth 0')
    t.true(gridIsEmpty(grid, 1), 'after tier 3 merge: tree is empty at depth 1')
    t.deepEquals(
      stringifyGrid(grid, 2),
      `\
[     ,     ,     , 0|  ]
[ 1|  , 1|  ,     ,     ]
[ 1|7 , 1|  ,     ,     ]
[     , 2|9 ,     ,     ]`,
      'after tier 3 merge: tree is populated at depth 2'
    )
    t.deepEquals(
      stringifyGrid(grid, 3),
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
    t.true(gridIsEmpty(grid, 4), 'after tier 3 merge: tree is empty at depth 4')
    t.true(gridIsEmpty(grid, 5), 'after tier 3 merge: tree is empty at depth 5')
  }

  /**
   * merge depth 2 elements to depth 1
   */
  {
    const depth = 1
    const firstQuadId = (4 ** depth - 1) / 3
    const lastQuadId = (4 ** (depth + 1) - 1) / 3
    for (let quadId = firstQuadId; quadId < lastQuadId; quadId++) merge(quadId, depth)
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    // console.log(stringifyQuadElements(quads, quadElements, depth))
    t.true(gridIsEmpty(grid, 0), 'after tier 2 merge: tree is empty at depth 0')
    t.deepEquals(
      stringifyGrid(grid, 1),
      `\
[ 1 , 0 ]
[   ,   ]`,
      'after tier 2 merge: tree is populated at depth 2'
    )
    t.deepEquals(
      stringifyGrid(grid, 2),
      `\
[     ,     ,     ,     ]
[     ,     ,     ,     ]
[ 1|7 , 1|  ,     ,     ]
[     , 2|9 ,     ,     ]`,
      'after tier 2 merge: tree is populated at depth 2'
    )
    t.deepEquals(
      stringifyGrid(grid, 3),
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
    t.true(gridIsEmpty(grid, 4), 'after tier 2 merge: tree is empty at depth 4')
    t.true(gridIsEmpty(grid, 5), 'after tier 2 merge: tree is empty at depth 5')
  }
})

test('[merge.test.ts] doesnt merge elements into parent quads when quad capacity is exceeded', (t) => {
  t.plan(8)

  const maxDepth = 6

  {
    const quadtree = new Quadtree(
      new Float32Array([
        ...[10, 10, 2],
        ...[11, 11, 2], // overlaps with first
        ...[20, 20, 2],
        ...[21, 21, 2], // overlaps with third
        ...[50, 50, 1]
      ]),
      {
        maxDepth,
        maxCapacity: 1
      }
    )
    const { rebuild, insert, quads, quadElements } = quadtree._debug()
    rebuild()
    insert()
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    t.deepEqual(
      stringifyGrid(grid, 6),
      `\
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 4|  , 4|  , 4|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 4|  , 4|  , 4|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 4|  , 4|  , 4|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|  , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|  , 3|  , 3|  , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 3|2 , 3|2 , 3|2 , 3|2 , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 3|2 , 3|2 , 3|2 , 3|2 , 3|2 , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 2|  , 3|2 , 3|2 , 3|2 , 3|2 , 3|2 , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 2|  , 3|2 , 3|2 , 3|2 , 3|2 , 3|2 , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 2|  , 3|2 , 3|2 , 3|2 , 3|2 , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 2|  , 2|  , 2|  , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     , 1|  , 1|  , 1|  , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     , 1|  , 1|  , 1|  , 1|  , 1|  , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 , 1|  , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 0|  , 0|  , 0|  , 0|  , 0|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]`,
      'tier 6 should be populated'
    )
  }

  {
    const maxDepth = 6
    const quadtree = new Quadtree(
      new Float32Array([
        ...[10, 10, 2],
        ...[11, 11, 2], // overlaps with first
        ...[20, 20, 2],
        ...[21, 21, 2], // overlaps with third
        ...[50, 50, 1]
      ]),
      {
        maxDepth,
        maxCapacity: 1
      }
    )
    const { quads, quadElements } = quadtree._debug()
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    t.deepEqual(
      stringifyGrid(grid, 6),
      `\
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|  , 3|  , 3|  , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|2 , 3|2 , 3|2 , 3|2 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|2 , 3|2 , 3|2 , 3|2 , 3|2 , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|2 , 3|2 , 3|2 , 3|2 , 3|2 , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|2 , 3|2 , 3|2 , 3|2 , 3|2 , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 2|  , 3|2 , 3|2 , 3|2 , 3|2 , 3|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 0|  , 1|0 , 1|0 , 1|0 , 1|0 , 1|0 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     , 1|0 , 1|0 , 1|0 , 1|0 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     , 0|  , 0|  , 0|  , 0|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]`,
      'tier 6 should be populated'
    )

    t.deepEqual(
      stringifyGrid(grid, 5),
      `\
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   , 3 , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[ 1 , 1 , 1 , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[ 0 ,   ,   , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]`,
      'tier 5 should be populated'
    )

    t.deepEqual(
      stringifyGrid(grid, 4),
      `\
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]`,
      'tier 4 should be populated'
    )

    t.deepEqual(
      stringifyGrid(grid, 3),
      `\
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   , 2 ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]`,
      'tier 3 should be populated'
    )

    t.deepEqual(
      stringifyGrid(grid, 2),
      `\
[   ,   ,   ,   ]
[   ,   ,   ,   ]
[ 2 ,   ,   ,   ]
[   , 2 ,   ,   ]`,
      'tier 2 should be populated'
    )

    t.deepEqual(
      stringifyGrid(grid, 1),
      `\
[   , 4 ]
[   ,   ]`,
      'tier 1 should be populated'
    )

    t.deepEqual(stringifyGrid(grid, 0), `[ ]`, 'tier 0 should not be populated')
  }
})
