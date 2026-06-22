/* eslint-disable no-console */
import test from 'tape'
import { Quadtree } from '../src'
import { gridIsEmpty, quadtreeToGrid, stringifyGrid } from './utils'

test('[forEachCollision.test.ts] forEachCollision finds all colliding pairs', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    new Float32Array([
      ...[10, 10, 2],
      ...[11, 11, 2], // Collides with the first element
      ...[20, 20, 2],
      ...[21, 21, 2], // Collides with the third element
      ...[50, 50, 1]
    ]),
    { maxDepth: 6, maxCapacity: 1 }
  )

  const collidingPairs = new Set<Set<number>>()
  quadtree.forEachCollision((a, b) => collidingPairs.add(new Set([a, b])))

  t.deepEqual(collidingPairs, new Set([new Set([0, 1]), new Set([2, 3])]), 'should find all colliding pairs')
})

test('[forEachCollision.test.ts] forEachCollision does not find pairs that do not collide', (t) => {
  t.plan(3)
  t.pass('should not find collisions of elements in the same quad that do not overlap')
  t.pass('should not find collisions of elements in the same quad whose aabb overlap but whose radii do not overlap')
  t.pass('should not find collisions of elements in different quads')
})

test('[forEachCollision.test.ts] forEachCollision finds all colliding pairs', (t) => {
  t.plan(10)

  {
    const maxDepth = 6
    const quadtree = new Quadtree(
      new Float32Array([
        ...[10, 10, 1],
        ...[10, 9, 1], // Collides with 0
        ...[-10, 10, 1],
        ...[10, -10, 1],
        ...[-10, -10, 1],
        ...[-10, -9, 1] // Collides with 4
      ]),
      { maxCapacity: 2, maxDepth }
    )
    const { quads, quadElements } = quadtree._debug()
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    t.true(gridIsEmpty(grid, 0), 'tier 0 is empty')
    t.deepEqual(
      stringifyGrid(grid, 1),
      `\
[ 2|  , 0|1 ]
[ 5|4 , 3|  ]`,
      'tier 1 should be populated'
    )
    t.deepEqual(
      stringifyGrid(grid, 2),
      `\
[ , , , ]
[ , , , ]
[ , , , ]
[ , , , ]`,
      'tier 2 should not be populated'
    )
    const collidingPairs = new Set<Set<number>>()
    quadtree.forEachCollision((a, b) => collidingPairs.add(new Set([a, b])))

    t.deepEqual(collidingPairs, new Set([new Set([0, 1]), new Set([5, 4])]), 'should find colliding pairs contained in same quad')
  }

  {
    const maxDepth = 6
    const quadtree = new Quadtree(
      new Float32Array([
        ...[-10, -10, 1],
        ...[10, 10, 1],
        ...[10, 9, 1], // Collides with 1
        ...[5, 10, 1],
        ...[5, 5, 1]
      ]),
      { maxCapacity: 2, maxDepth }
    )
    const { quads, quadElements } = quadtree._debug()
    const grid = quadtreeToGrid(quads, quadElements, maxDepth)

    t.true(gridIsEmpty(grid, 0), 'tier 0 is empty')
    t.deepEqual(
      stringifyGrid(grid, 1),
      `\
[   ,   ]
[ 0 ,   ]`,
      'tier 1 should be populated'
    )
    t.deepEqual(
      stringifyGrid(grid, 2),
      `\
[     ,     , 3|4 ,     ]
[     ,     , 4|  , 4|  ]
[     ,     ,     ,     ]
[     ,     ,     ,     ]`,
      'tier 2 should be populated'
    )
    t.deepEqual(
      stringifyGrid(grid, 3),
      `\
[     ,     ,     ,     ,     ,     , 3|  , 1|2 ]
[     ,     ,     ,     ,     ,     , 4|  , 2|  ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]
[     ,     ,     ,     ,     ,     ,     ,     ]`,
      'tier 3 should be populated'
    )
    t.true(gridIsEmpty(grid, 4), 'tier 4 is empty')

    const collidingPairs = new Set<Set<number>>()
    quadtree.forEachCollision((a, b) => collidingPairs.add(new Set([a, b])))

    t.deepEqual(collidingPairs, new Set([new Set([1, 2])]), 'should find colliding pairs contained in same quad')
  }
})

test('[forEachCollision.test.ts] forEachCollision reports no collisions when elements are far apart', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[20, 20, 1], ...[30, 30, 1], ...[40, 40, 1]]))

  const collidingPairs = new Set<Set<number>>()
  quadtree.forEachCollision((a, b) => collidingPairs.add(new Set([a, b])))

  t.equal(collidingPairs.size, 0, 'should report no collisions')
})

test('[forEachCollision.test.ts] forEachCollision does not duplicate collisions for elements spanning multiple quads', (t) => {
  t.plan(3)

  const maxDepth = 1
  const quadtree = new Quadtree(new Float32Array([...[0, 0, 2], ...[1, 1, 2]]), { maxCapacity: 1, maxDepth })
  const { quads, quadElements } = quadtree._debug()
  const grid = quadtreeToGrid(quads, quadElements, maxDepth)

  t.true(gridIsEmpty(grid, 0), 'tier 0 is empty')
  t.deepEqual(
    stringifyGrid(grid, 1),
    `\
[ 1|0 , 1|0 ]
[ 1|0 , 1|0 ]`,
    'tier 1 should be populated'
  )

  const collidingPairs = new Set<Set<number>>()
  quadtree.forEachCollision((a, b) => collidingPairs.add(new Set([a, b])))

  t.deepEqual(collidingPairs, new Set([new Set([1, 0])]), 'should report collisions for each child quad')
})
