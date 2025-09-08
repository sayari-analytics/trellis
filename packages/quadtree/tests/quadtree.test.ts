/* eslint-disable no-console */
import test from 'tape'
import { Quadtree } from '../'
import { generateTypedArray, Quad, recordQuadProperties } from './utils'

/**
 * test quadtree creation
 */
test('[quadtree.test.ts] creates empty quadtree', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(generateTypedArray([]), { maxDepth: 7 })
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, { 0: { depth: 0, minX: 0, maxX: 1, minY: 0, maxY: 1, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] } }) // eslint-disable-line
})

test('[quadtree.test.ts] indexes elements in parent quad while element count is less than quad capacity', (t) => {
  t.plan(5)

  {
    const quadtree = new Quadtree(generateTypedArray([[10, 10, 1]]), { maxDepth: 7 })
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      { 0: { depth: 0, minX: 9, maxX: 11, minY: 9, maxY: 11, centerOfMassX: 10, centerOfMassY: 10, aggregateMass: 1, elements: [0] } }, // eslint-disable-line
      'correctly indexes one element in root quad'
    )
  }

  {
    const quadtree = new Quadtree(
      generateTypedArray([
        [10, 10, 1],
        [-10, 10, 1]
      ]),
      { maxCapacity: 4, maxDepth: 2 }
    )
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      { 0: { depth: 0, minX: -11, maxX: 11, minY: 9, maxY: 11, centerOfMassX: 0, centerOfMassY: 10, aggregateMass: 2, elements: [0, 1] } }, // eslint-disable-line
      'correctly indexes two elements in root quad'
    )
  }

  {
    const quadtree = new Quadtree(
      generateTypedArray([
        [10, 10, 1],
        [-10, 10, 1],
        [10, -10, 1],
        [-10, -10, 1]
      ]),
      { maxCapacity: 4, maxDepth: 2 }
    )
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      { 0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: 0, centerOfMassY: 0, aggregateMass: 4, elements: [0, 1, 2, 3] } }, // eslint-disable-line
      'correctly indexes four elements in root quad'
    )
  }

  {
    const quadtree = new Quadtree(
      generateTypedArray([
        [10, 10, 1],
        [-10, 10, 1],
        [10, -10, 1],
        [-10, -10, 1]
      ]),
      { maxCapacity: 1, maxDepth: 3 }
    )
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      {
        0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: 0, centerOfMassY: 0, aggregateMass: 4, elements: [] }, // eslint-disable-line
        1: { depth: 1, minX: -11, maxX: 0, minY: 0, maxY: 11, centerOfMassX: -10, centerOfMassY: 10, aggregateMass: 1, elements: [1] }, // eslint-disable-line
        2: { depth: 1, minX: 0, maxX: 11, minY: 0, maxY: 11, centerOfMassX: 10, centerOfMassY: 10, aggregateMass: 1, elements: [0] }, // eslint-disable-line
        3: { depth: 1, minX: -11, maxX: 0, minY: -11, maxY: 0, centerOfMassX: -10, centerOfMassY: -10, aggregateMass: 1, elements: [3] }, // eslint-disable-line
        4: { depth: 1, minX: 0, maxX: 11, minY: -11, maxY: 0, centerOfMassX: 10, centerOfMassY: -10, aggregateMass: 1, elements: [2] } // eslint-disable-line
      },
      'correctly indexes 4 element in depth 1 quads'
    )
  }

  {
    const elements = generateTypedArray([
      [10, 10, 1],
      [10, 9, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1],
      [-10, -9, 1]
    ])
    const quadtree = new Quadtree(elements, { maxCapacity: 4, maxDepth: 5 })

    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))
    t.deepEqual(
      quads,
      {
        0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: 0, centerOfMassY: 0, aggregateMass: 6, elements: [] }, // eslint-disable-line
        1: { depth: 1, minX: -11, maxX: 0, minY: 0, maxY: 11, centerOfMassX: -10, centerOfMassY: 10, aggregateMass: 1, elements: [2] }, // eslint-disable-line
        2: { depth: 1, minX: 0, maxX: 11, minY: 0, maxY: 11, centerOfMassX: 10, centerOfMassY: 9.5, aggregateMass: 2, elements: [0, 1] }, // eslint-disable-line
        3: { depth: 1, minX: -11, maxX: 0, minY: -11, maxY: 0, centerOfMassX: -10, centerOfMassY: -9.5, aggregateMass: 2, elements: [4, 5] }, // eslint-disable-line
        4: { depth: 1, minX: 0, maxX: 11, minY: -11, maxY: 0, centerOfMassX: 10, centerOfMassY: -10, aggregateMass: 1, elements: [3] } // eslint-disable-line
      },
      'correctly indexes multiple elements in depth 1 quads'
    )
  }
})

test('[quadtree.test.ts] indexes elements in child quads if parent quad capcity is exceeded', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    generateTypedArray([
      [10, 10, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1],
      [-5, -5, 1]
    ]),
    { maxCapacity: 4, maxDepth: 3 }
  )
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(
    quads,
    {
      0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: -1, centerOfMassY: -1, aggregateMass: 5, elements: [] }, // eslint-disable-line
      1: { depth: 1, minX: -11, maxX: 0, minY: 0, maxY: 11, centerOfMassX: -10, centerOfMassY: 10, aggregateMass: 1, elements: [1] }, // eslint-disable-line
      2: { depth: 1, minX: 0, maxX: 11, minY: 0, maxY: 11, centerOfMassX: 10, centerOfMassY: 10, aggregateMass: 1, elements: [0] }, // eslint-disable-line
      3: { depth: 1, minX: -11, maxX: 0, minY: -11, maxY: 0, centerOfMassX: -7.5, centerOfMassY: -7.5, aggregateMass: 2, elements: [3, 4] }, // eslint-disable-line
      4: { depth: 1, minX: 0, maxX: 11, minY: -11, maxY: 0, centerOfMassX: 10, centerOfMassY: -10, aggregateMass: 1, elements: [2] } // eslint-disable-line
    },
    'indexes multiple elements per quad'
  )
})

test('[quadtree.test.ts] indexes elements that overlap quad boundaries across all overlapping child quads', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    generateTypedArray([
      [10, 10, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1],
      [-5, -5, 1],
      [-5, 0.5, 1]
    ]),
    { maxCapacity: 4 }
  )
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, {
    0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: -1.6666666666666667, centerOfMassY: -0.75, aggregateMass: 6, elements: [] }, // eslint-disable-line
    1: { depth: 1, minX: -11, maxX: 0, minY: 0, maxY: 11, centerOfMassX: -7.5, centerOfMassY: 5.25, aggregateMass: 2, elements: [1, 5] }, // eslint-disable-line
    2: { depth: 1, minX: 0, maxX: 11, minY: 0, maxY: 11, centerOfMassX: 10, centerOfMassY: 10, aggregateMass: 1, elements: [0] }, // eslint-disable-line
    3: { depth: 1, minX: -11, maxX: 0, minY: -11, maxY: 0, centerOfMassX: -7.5, centerOfMassY: -7.5, aggregateMass: 2, elements: [3, 4, 5] }, // eslint-disable-line
    4: { depth: 1, minX: 0, maxX: 11, minY: -11, maxY: 0, centerOfMassX: 10, centerOfMassY: -10, aggregateMass: 1, elements: [2] } // eslint-disable-line
  })
})

/**
 * test many bodies and center of mass
 */
test('[quadtree.test.ts] computes quad center of mass', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    generateTypedArray([
      [10, 10, 1],
      [-10, 10, 1],
      [10, -10, 1]
    ]),
    { maxCapacity: 4 }
  )
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, {
    0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: 10 / 3, centerOfMassY: 10 / 3, aggregateMass: 3, elements: [0, 1, 2] } // eslint-disable-line
  })
})

test('[quadtree.test.ts] forEachBody iterates over all bodies', (t) => {
  t.plan(2)

  const elements = generateTypedArray([
    [10, 10, 1],
    [-10, 10, 1],
    [10, -10, 1],
    [-10, -10, 1]
  ])
  const quadtree = new Quadtree(elements)

  const iteratedBodies: { elementId: number; bodyX: number; bodyY: number }[] = []
  quadtree.forEachBody((elementId, bodyX, bodyY) => iteratedBodies.push({ elementId, bodyX, bodyY }))

  t.equal(iteratedBodies.length, 4 * 3, 'should iterate over all body pairs')

  const expectedPairs = [
    { elementId: 0, bodyX: -10, bodyY: 10 },
    { elementId: 0, bodyX: 10, bodyY: -10 },
    { elementId: 0, bodyX: -10, bodyY: -10 },
    { elementId: 1, bodyX: 10, bodyY: 10 },
    { elementId: 1, bodyX: 10, bodyY: -10 },
    { elementId: 1, bodyX: -10, bodyY: -10 },
    { elementId: 2, bodyX: 10, bodyY: 10 },
    { elementId: 2, bodyX: -10, bodyY: 10 },
    { elementId: 2, bodyX: -10, bodyY: -10 },
    { elementId: 3, bodyX: 10, bodyY: 10 },
    { elementId: 3, bodyX: -10, bodyY: 10 },
    { elementId: 3, bodyX: 10, bodyY: -10 }
  ]

  t.deepEqual(
    iteratedBodies.sort((a, b) => a.elementId - b.elementId || a.bodyX - b.bodyX || a.bodyY - b.bodyY),
    expectedPairs.sort((a, b) => a.elementId - b.elementId || a.bodyX - b.bodyX || a.bodyY - b.bodyY),
    'should contain all body pairs'
  )
})

test('[quadtree.test.ts] forEachBody approximates distant bodies using quad center of mass', (t) => {
  t.plan(3)

  const elements = generateTypedArray([
    // Cluster of elements in the top-left
    [10, 10, 1],
    [11, 11, 1],
    [12, 12, 1],
    // A single distant element
    [100, 100, 1]
  ])
  const quadtree = new Quadtree(elements, { maxCapacity: 2, maxDepth: 4 })
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, {
    0: { depth: 0, minX: 9, maxX: 101, minY: 9, maxY: 101, centerOfMassX: 33.25, centerOfMassY: 33.25, aggregateMass: 4, elements: [] }, // eslint-disable-line
    1: { depth: 1, minX: 9, maxX: 55, minY: 55, maxY: 101, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    2: { depth: 1, minX: 55, maxX: 101, minY: 55, maxY: 101, centerOfMassX: 100, centerOfMassY: 100, aggregateMass: 1, elements: [3] }, // eslint-disable-line
    3: { depth: 1, minX: 9, maxX: 55, minY: 9, maxY: 55, centerOfMassX: 11, centerOfMassY: 11, aggregateMass: 3, elements: [] }, // eslint-disable-line
    4: { depth: 1, minX: 55, maxX: 101, minY: 9, maxY: 55, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    13: { depth: 2, minX: 9, maxX: 32, minY: 32, maxY: 55, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    14: { depth: 2, minX: 32, maxX: 55, minY: 32, maxY: 55, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    15: { depth: 2, minX: 9, maxX: 32, minY: 9, maxY: 32, centerOfMassX: 11, centerOfMassY: 11, aggregateMass: 3, elements: [] }, // eslint-disable-line
    16: { depth: 2, minX: 32, maxX: 55, minY: 9, maxY: 32, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    61: { depth: 3, minX: 9, maxX: 20.5, minY: 20.5, maxY: 32, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    62: { depth: 3, minX: 20.5, maxX: 32, minY: 20.5, maxY: 32, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    63: { depth: 3, minX: 9, maxX: 20.5, minY: 9, maxY: 20.5, centerOfMassX: 11, centerOfMassY: 11, aggregateMass: 3, elements: [] }, // eslint-disable-line
    64: { depth: 3, minX: 20.5, maxX: 32, minY: 9, maxY: 20.5, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    253: { depth: 4, minX: 9, maxX: 14.75, minY: 14.75, maxY: 20.5, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    254: { depth: 4, minX: 14.75, maxX: 20.5, minY: 14.75, maxY: 20.5, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }, // eslint-disable-line
    255: { depth: 4, minX: 9, maxX: 14.75, minY: 9, maxY: 14.75, centerOfMassX: 11, centerOfMassY: 11, aggregateMass: 3, elements: [0, 1, 2] }, // eslint-disable-line
    256: { depth: 4, minX: 14.75, maxX: 20.5, minY: 9, maxY: 14.75, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] }  // eslint-disable-line
  })

  const iteratedBodies: { elementId: number; bodyX: number; bodyY: number; mass: number }[] = []
  quadtree.forEachBody((elementId, bodyX, bodyY, mass) => iteratedBodies.push({ elementId, bodyX, bodyY, mass }))

  const expectedPairs = [
    { elementId: 0, bodyX: 11, bodyY: 11, mass: 1 },
    { elementId: 0, bodyX: 12, bodyY: 12, mass: 1 },
    { elementId: 0, bodyX: 100, bodyY: 100, mass: 1 },
    { elementId: 1, bodyX: 10, bodyY: 10, mass: 1 },
    { elementId: 1, bodyX: 12, bodyY: 12, mass: 1 },
    { elementId: 1, bodyX: 100, bodyY: 100, mass: 1 },
    { elementId: 2, bodyX: 10, bodyY: 10, mass: 1 },
    { elementId: 2, bodyX: 11, bodyY: 11, mass: 1 },
    { elementId: 2, bodyX: 100, bodyY: 100, mass: 1 },
    { elementId: 3, bodyX: 11, bodyY: 11, mass: 3 }
  ]

  t.deepEquals(
    iteratedBodies.filter(({ elementId }) => elementId === 3),
    [{ elementId: 3, bodyX: 11, bodyY: 11, mass: 3 }],
    'distant element is only compared to one body approximating cluster of 3 elements'
  )

  t.deepEqual(
    iteratedBodies.sort((a, b) => a.elementId - b.elementId || a.bodyX - b.bodyX || a.bodyY - b.bodyY),
    expectedPairs.sort((a, b) => a.elementId - b.elementId || a.bodyX - b.bodyX || a.bodyY - b.bodyY),
    'distant element'
  )
})

/**
 * test collision detection
 */
// test('[quadtree.test.ts] forEachCollision finds all colliding pairs', (t) => {
//   t.plan(1)

//   const elements = generateTypedArray([
//     [10, 10, 2],
//     [11, 11, 2], // Collides with the first element
//     [20, 20, 2],
//     [21, 21, 2], // Collides with the third element
//     [50, 50, 1]
//   ])
//   const quadtree = new Quadtree(elements, { maxCapacity: 1 })

//   const collidingPairs: [number, number][] = []
//   quadtree.forEachCollision((a, b) => collidingPairs.push([a, b].sort() as [number, number]))

//   t.deepEqual(
//     collidingPairs.sort(),
//     [
//       [0, 1],
//       [2, 3]
//     ].sort(),
//     'should find all colliding pairs'
//   )
// })

test.skip('[quadtree.test.ts] forEachCollision finds all colliding pairs', (t) => {
  t.plan(2)

  {
    const elements = generateTypedArray([
      [10, 10, 1],
      [10, 9, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1],
      [-10, -9, 1]
    ])
    const quadtree = new Quadtree(elements)

    // const quads: { [quadId: number]: Quad } = {}
    // quadtree.forEachQuad(recordQuadProperties(quadtree, quads))
    // console.log(quads)

    const collidingPairs: [number, number][] = []
    quadtree.forEachCollision((a, b) => collidingPairs.push([a, b].sort() as [number, number]))

    t.deepEqual(
      collidingPairs.sort(),
      [
        [0, 1],
        [4, 5]
      ].sort(),
      'should find colliding pairs contained in same quad'
    )
  }

  {
    const elements = generateTypedArray([
      [10, 10, 1],
      [10, 9, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1],
      [-10, -9, 1]
    ])
    const quadtree = new Quadtree(elements, { maxCapacity: 4 })

    // const quads: { [quadId: number]: Quad } = {}
    // quadtree.forEachQuad(recordQuadProperties(quadtree, quads))
    // console.log(quads)

    const collidingPairs: [number, number][] = []
    quadtree.forEachCollision((a, b) => collidingPairs.push([a, b].sort() as [number, number]))

    t.deepEqual(
      collidingPairs.sort(),
      [
        [0, 1],
        [4, 5]
      ].sort(),
      'should find colliding pairs across different quads'
    )
  }
})

test.skip('[quadtree.test.ts] forEachCollision reports no collisions when elements are far apart', (t) => {
  t.plan(1)

  const elements = generateTypedArray([
    [10, 10, 1],
    [20, 20, 1],
    [30, 30, 1],
    [40, 40, 1]
  ])
  const quadtree = new Quadtree(elements)

  const collidingPairs: [number, number][] = []
  quadtree.forEachCollision((a, b) => collidingPairs.push([a, b].sort() as [number, number]))

  t.equal(collidingPairs.length, 0, 'should report no collisions')
})

test.skip('[quadtree.test.ts] forEachCollision reports duplicate collisions for elements spanning multiple quads', (t) => {
  // TODO - this documents the undesirable behavior that elements indexed in multiple quads can produce duplicate collision checks
  t.plan(2)

  const elements = generateTypedArray([
    [0, 0, 2],
    [1, 1, 2]
  ])
  const quadtree = new Quadtree(elements, { maxCapacity: 1, maxDepth: 1 })
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, {
    0: { depth: 0, minX: -2, maxX: 3, minY: -2, maxY: 3, centerOfMassX: 0.5, centerOfMassY: 0.5, aggregateMass: 2, elements: [] }, // eslint-disable-line
    1: { depth: 1, minX: -2, maxX: 0.5, minY: 0.5, maxY: 3, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [0, 1] }, // eslint-disable-line
    2: { depth: 1, minX: 0.5, maxX: 3, minY: 0.5, maxY: 3, centerOfMassX: 1, centerOfMassY: 1, aggregateMass: 1, elements: [0, 1] }, // eslint-disable-line
    3: { depth: 1, minX: -2, maxX: 0.5, minY: -2, maxY: 0.5, centerOfMassX: 0, centerOfMassY: 0, aggregateMass: 1, elements: [0, 1] }, // eslint-disable-line
    4: { depth: 1, minX: 0.5, maxX: 3, minY: -2, maxY: 0.5, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [0, 1] } // eslint-disable-line
  })

  const collidingPairs: [number, number][] = []
  quadtree.forEachCollision((a, b) => collidingPairs.push([a, b].sort() as [number, number]))

  t.deepEqual(collidingPairs, [[0, 1]], 'should report collisions for each child quad')
})
