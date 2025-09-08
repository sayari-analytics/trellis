/* eslint-disable no-console */
import test from 'tape'
import { createTreeGrid, quadIdToGridCell, stringifyTreeGrid, treeGridIsEmpty } from './utils'
import { Quadtree } from '../'

test('[insert.test.ts] creates empty tree grid', (t) => {
  t.plan(1)

  const _ = null
  const maxDepth = 4
  t.deepEquals(createTreeGrid(maxDepth), [
    // depth 0 [1x1]
    [[_]],
    // depth 1 [2x2]
    [
      [_, _],
      [_, _]
    ],
    // depth 2 [4x4]
    [
      [_, _, _, _],
      [_, _, _, _],
      [_, _, _, _],
      [_, _, _, _]
    ],
    // depth 3 [8x8]
    [
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _]
    ],
    // depth 4 [16x16]
    [
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]
    ]
  ])
})

test('[insert.test.ts] inserts elements into correct leaf quads', (t) => {
  t.plan(4)

  {
    const maxDepth = 3
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const quadtree = new Quadtree(
      new Float32Array([...[-99, 99, 1], ...[99, 99, 1], ...[-99, -99, 1], ...[99, -99, 1], ...[30, 30, 1], ...[-5, 22, 1]]),
      { maxDepth }
    )
    const { insert, forEachQuad } = quadtree._debug()
    insert()

    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    t.true(treeGridIsEmpty(treeGrid, 0), 'tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'tree is empty at depth 2')
    t.equals(
      stringifyTreeGrid(treeGrid, 3),
      `\
[ 0 ,   ,   ,   ,   ,   ,   , 1 ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   , 4 ,   ,   ]
[   ,   ,   , 5 ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[ 2 ,   ,   ,   ,   ,   ,   , 3 ]`,
      'tree is populated at depth 3'
    )
  }
})

test('[insert.test.ts] inserts elements that overlap multiple quads into correct leaf quads', (t) => {
  t.plan(16)

  {
    const maxDepth = 3
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const quadtree = new Quadtree(new Float32Array([...[50, 50, 24], ...[1, 199, 1], ...[199, 199, 1], ...[1, 1, 1]]), { maxDepth })
    const { insert, forEachQuad } = quadtree._debug()
    insert()

    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    t.true(treeGridIsEmpty(treeGrid, 0), 'tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'tree is empty at depth 2')
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
      'tree is populated at depth 3'
    )
  }

  {
    const maxDepth = 5
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1]]), {
      maxCapacity: 4,
      maxDepth: 5
    })
    const { insert, forEachQuad } = quadtree._debug()
    insert()

    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    t.true(treeGridIsEmpty(treeGrid, 0), 'tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'tree is empty at depth 2')
    t.true(treeGridIsEmpty(treeGrid, 3), 'tree is empty at depth 3')
    t.true(treeGridIsEmpty(treeGrid, 4), 'tree is empty at depth 4')
    t.deepEqual(
      stringifyTreeGrid(treeGrid, 5),
      `\
[ 1 , 1 , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 0 , 0 , 0 ]
[ 1 , 1 , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 0 , 0 , 0 ]
[ 1 , 1 , 1 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 0 , 0 , 0 ]
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
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ]
[ 3 , 3 , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 2 , 2 , 2 ]
[ 3 , 3 , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 2 , 2 , 2 ]
[ 3 , 3 , 3 ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   , 2 , 2 , 2 ]`,
      'tree is populated at depth 5'
    )
  }

  {
    const maxDepth = 5
    const treeGrid = createTreeGrid<number[]>(maxDepth)
    const quadtree = new Quadtree(
      new Float32Array([...[10, 10, 1], ...[10, 9, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1], ...[-10, -9, 1]]),
      { maxCapacity: 4, maxDepth: 5 }
    )
    const { insert, forEachQuad } = quadtree._debug()
    insert()

    forEachQuad((quadId, depth) => {
      const [row, col] = quadIdToGridCell(quadId, depth)
      for (const element of quadtree.getQuadElements(quadId)) {
        treeGrid[depth][row][col] ??= []
        treeGrid[depth][row][col].push(element)
      }
      return true
    })

    t.true(treeGridIsEmpty(treeGrid, 0), 'tree is empty at depth 0')
    t.true(treeGridIsEmpty(treeGrid, 1), 'tree is empty at depth 1')
    t.true(treeGridIsEmpty(treeGrid, 2), 'tree is empty at depth 2')
    t.true(treeGridIsEmpty(treeGrid, 3), 'tree is empty at depth 3')
    t.true(treeGridIsEmpty(treeGrid, 4), 'tree is empty at depth 4')
    t.deepEqual(
      stringifyTreeGrid(treeGrid, 5),
      `\
[ 2|  , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 0|  , 0|  , 0|  ]
[ 2|  , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 1|0 , 1|0 , 1|0 ]
[ 2|  , 2|  , 2|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 1|0 , 1|0 , 1|0 ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 1|  , 1|  , 1|  ]
[     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 1|  , 1|  , 1|  ]
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
[ 5|  , 5|  , 5|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|  , 5|  , 5|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ]
[ 5|4 , 5|4 , 5|4 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|  , 3|  , 3|  ]
[ 5|4 , 5|4 , 5|4 ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|  , 3|  , 3|  ]
[ 4|  , 4|  , 4|  ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     ,     , 3|  , 3|  , 3|  ]`,
      'tree is populated at depth 5'
    )
  }
})

test('[insert.test.ts] doesnt insert into a quad elements that touch but dont overlap with it', (t) => {
  t.plan(4)

  const maxDepth = 3
  const treeGrid = createTreeGrid<number[]>(maxDepth)
  const quadtree = new Quadtree(
    new Float32Array([...[1, 199, 1], ...[199, 199, 1], ...[1, 1, 1], ...[50, 50, 25], ...[37.5, 137.5, 12.5], ...[130, 48, 28]]),
    { maxDepth }
  )
  const { insert, forEachQuad } = quadtree._debug()
  insert()

  forEachQuad((quadId, depth) => {
    const [row, col] = quadIdToGridCell(quadId, depth)
    for (const element of quadtree.getQuadElements(quadId)) {
      treeGrid[depth][row][col] ??= []
      treeGrid[depth][row][col].push(element)
    }
    return true
  })

  t.true(treeGridIsEmpty(treeGrid, 0), 'tree is empty at depth 0')
  t.true(treeGridIsEmpty(treeGrid, 1), 'tree is empty at depth 1')
  t.true(treeGridIsEmpty(treeGrid, 2), 'tree is empty at depth 2')
  t.deepEquals(
    stringifyTreeGrid(treeGrid, 3),
    `\
[ 0 ,   ,   ,   ,   ,   ,   , 1 ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   , 4 ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   ,   ,   ,   ,   ]
[   ,   ,   ,   , 5 , 5 ,   ,   ]
[   , 3 , 3 ,   , 5 , 5 , 5 ,   ]
[   , 3 , 3 ,   , 5 , 5 , 5 ,   ]
[ 2 ,   ,   ,   , 5 , 5 ,   ,   ]`,
    'tree is populated at depth 3'
  )
})
