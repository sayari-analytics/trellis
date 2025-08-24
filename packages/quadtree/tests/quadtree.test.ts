/* eslint-disable no-console */
import test from 'tape'
import { Quadtree } from '../'

/**
 * utils
 */
const generateTypedArray = (elements: [x: number, y: number, r: number][]): Float32Array => {
  const typedArray = new Float32Array(elements.length * 3)

  for (let i = 0; i < elements.length; i++) {
    const elementPtr = i * 3
    typedArray[elementPtr] = elements[i][0]
    typedArray[elementPtr + 1] = elements[i][1]
    typedArray[elementPtr + 2] = elements[i][2]
  }

  return typedArray
}

/**
 * test quadtree creation
 */
test('creates empty quadtree', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(generateTypedArray([]))

  t.deepEquals(quadtree.materialize(), {
    id: 0,
    minX: 0,
    minY: 0,
    maxX: 1,
    maxY: 1,
    centerOfMassX: undefined,
    centerOfMassY: undefined,
    aggregateMass: 0,
    elements: []
  })
})

test('indexes elements in quad when element count is less than max capacity', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    generateTypedArray([
      [10, 10, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1]
    ]),
    3,
    0,
    1,
    2,
    4, // max capacity
    6
  )

  t.deepEquals(quadtree.materialize(), {
    id: 0,
    minX: -11,
    minY: -11,
    maxX: 11,
    maxY: 11,
    centerOfMassX: 0,
    centerOfMassY: 0,
    aggregateMass: 4,
    elements: [
      { id: 3, x: -10, y: -10, radius: 1 },
      { id: 2, x: 10, y: -10, radius: 1 },
      { id: 1, x: -10, y: 10, radius: 1 },
      { id: 0, x: 10, y: 10, radius: 1 }
    ]
  })
})

test('indexes elements in child quads when parent quad capcity is exceeded', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    generateTypedArray([
      [10, 10, 1],
      [-10, 10, 1],
      [10, -10, 1],
      [-10, -10, 1],
      [-5, -5, 1]
    ]),
    3,
    0,
    1,
    2,
    4, // max capacity
    6
  )

  t.deepEquals(quadtree.materialize(), {
    id: 0,
    minX: -11,
    minY: -11,
    maxX: 11,
    maxY: 11,
    centerOfMassX: -1,
    centerOfMassY: -1,
    aggregateMass: 5,
    elements: [],
    children: {
      nw: {
        id: 1,
        minX: -11,
        minY: 0,
        maxX: 0,
        maxY: 11,
        centerOfMassX: -10,
        centerOfMassY: 10,
        aggregateMass: 1,
        elements: [{ id: 1, x: -10, y: 10, radius: 1 }]
      },
      ne: {
        id: 2,
        minX: 0,
        minY: 0,
        maxX: 11,
        maxY: 11,
        centerOfMassX: 10,
        centerOfMassY: 10,
        aggregateMass: 1,
        elements: [{ id: 0, x: 10, y: 10, radius: 1 }]
      },
      sw: {
        id: 3,
        minX: -11,
        minY: -11,
        maxX: 0,
        maxY: 0,
        centerOfMassX: -7.5,
        centerOfMassY: -7.5,
        aggregateMass: 2,
        elements: [
          { id: 3, x: -10, y: -10, radius: 1 },
          { id: 4, x: -5, y: -5, radius: 1 }
        ]
      },
      se: {
        id: 4,
        minX: 0,
        minY: -11,
        maxX: 11,
        maxY: 0,
        centerOfMassX: 10,
        centerOfMassY: -10,
        aggregateMass: 1,
        elements: [{ id: 2, x: 10, y: -10, radius: 1 }]
      }
    }
  })
})

test('indexes elements that overlap quad boundaries across all overlapping child quads', (t) => {
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
    3,
    0,
    1,
    2,
    4, // max capacity
    6
  )

  t.deepEquals(quadtree.materialize(), {
    id: 0,
    minX: -11,
    minY: -11,
    maxX: 11,
    maxY: 11,
    centerOfMassX: -1.6666666666666667,
    centerOfMassY: -0.75,
    aggregateMass: 6,
    elements: [],
    children: {
      nw: {
        id: 1,
        minX: -11,
        minY: 0,
        maxX: 0,
        maxY: 11,
        centerOfMassX: -7.5,
        centerOfMassY: 5.25,
        aggregateMass: 2,
        elements: [
          { id: 5, x: -5, y: 0.5, radius: 1 },
          { id: 1, x: -10, y: 10, radius: 1 }
        ]
      },
      ne: {
        id: 2,
        minX: 0,
        minY: 0,
        maxX: 11,
        maxY: 11,
        centerOfMassX: 10,
        centerOfMassY: 10,
        aggregateMass: 1,
        elements: [{ id: 0, x: 10, y: 10, radius: 1 }]
      },
      sw: {
        id: 3,
        minX: -11,
        minY: -11,
        maxX: 0,
        maxY: 0,
        centerOfMassX: -6.666666666666667,
        centerOfMassY: -4.833333333333333,
        aggregateMass: 3,
        elements: [
          { id: 5, x: -5, y: 0.5, radius: 1 },
          { id: 3, x: -10, y: -10, radius: 1 },
          { id: 4, x: -5, y: -5, radius: 1 }
        ]
      },
      se: {
        id: 4,
        minX: 0,
        minY: -11,
        maxX: 11,
        maxY: 0,
        centerOfMassX: 10,
        centerOfMassY: -10,
        aggregateMass: 1,
        elements: [{ id: 2, x: 10, y: -10, radius: 1 }]
      }
    }
  })
})

/**
 * test many bodies and center of mass
 */
test('computes quad center of mass', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(
    generateTypedArray([
      [10, 10, 1],
      [-10, 10, 1],
      [10, -10, 1]
    ]),
    3,
    0,
    1,
    2,
    4, // max capacity
    6
  )

  t.deepEquals(quadtree.materialize(), {
    id: 0,
    minX: -11,
    minY: -11,
    maxX: 11,
    maxY: 11,
    centerOfMassX: 10 / 3,
    centerOfMassY: 10 / 3,
    aggregateMass: 3,
    elements: [
      { id: 2, x: 10, y: -10, radius: 1 },
      { id: 1, x: -10, y: 10, radius: 1 },
      { id: 0, x: 10, y: 10, radius: 1 }
    ]
  })
})

test('forEachBody iterates over all bodies', (t) => {
  t.plan(2)

  const elements = generateTypedArray([
    [10, 10, 1],
    [-10, 10, 1],
    [10, -10, 1],
    [-10, -10, 1]
  ])
  const quadtree = new Quadtree(elements)

  const iteratedBodies: { elementId: number; bodyX: number; bodyY: number }[] = []
  quadtree.forEachBody((elementId, bodyX, bodyY) => {
    iteratedBodies.push({ elementId, bodyX, bodyY })
  })

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

test('forEachBody approximates distant bodies using quad center of mass', (t) => {
  t.plan(4)

  const elements = generateTypedArray([
    // Cluster of elements in the top-left
    [10, 10, 1],
    [11, 11, 1],
    [12, 12, 1],
    // A single distant element
    [100, 100, 1]
  ])
  const quadtree = new Quadtree(elements, 3, 0, 1, 2, 2, 4)

  const materialized = quadtree.materialize()
  t.deepEquals(materialized.children?.ne.elements, [{ id: 3, x: 100, y: 100, radius: 1 }], 'distant element is indexed in ne quad')
  t.deepEquals(
    materialized.children?.sw.children?.sw.children?.sw.children?.sw.elements,
    [
      { id: 2, x: 12, y: 12, radius: 1 },
      { id: 1, x: 11, y: 11, radius: 1 },
      { id: 0, x: 10, y: 10, radius: 1 }
    ],
    'clustered elements are indexed in sw quad'
  )

  const iteratedBodies: { elementId: number; bodyX: number; bodyY: number; mass: number }[] = []
  quadtree.forEachBody((elementId, bodyX, bodyY, mass) => {
    iteratedBodies.push({ elementId, bodyX, bodyY, mass })
  })

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
test('forEachCollision finds all colliding pairs', (t) => {
  t.plan(1)

  const elements = generateTypedArray([
    [10, 10, 2],
    [11, 11, 2], // Collides with the first element
    [20, 20, 1],
    [20, 20, 1], // Collides with the third element
    [50, 50, 1]
  ])
  const quadtree = new Quadtree(elements)

  const collidingPairs: [number, number][] = []
  quadtree.forEachCollision((a, b) => {
    collidingPairs.push([a, b].sort() as [number, number])
  })

  t.deepEqual(
    collidingPairs.sort(),
    [
      [0, 1],
      [2, 3]
    ].sort(),
    'should find all colliding pairs'
  )
})

test('forEachCollision reports no collisions when elements are far apart', (t) => {
  t.plan(1)

  const elements = generateTypedArray([
    [10, 10, 1],
    [20, 20, 1],
    [30, 30, 1],
    [40, 40, 1]
  ])
  const quadtree = new Quadtree(elements)

  const collidingPairs: [number, number][] = []
  quadtree.forEachCollision((a, b) => {
    collidingPairs.push([a, b])
  })

  t.equal(collidingPairs.length, 0, 'should report no collisions')
})

test('forEachCollision reports duplicate collisions for elements spanning multiple quads', (t) => {
  // TODO - this documents the undesirable behavior that elements indexed in multiple quads can produce duplicate collision checks
  t.plan(2)

  const elements = generateTypedArray([
    [0, 0, 2],
    [1, 1, 2]
  ])
  // With a max capacity of 1, the quadtree will subdivide, and both elements will exist in all child quads, leading to duplicate collision checks
  const quadtree = new Quadtree(elements, 3, 0, 1, 2, 1, 1)

  const quadElements = [
    { id: 0, x: 0, y: 0, radius: 2 },
    { id: 1, x: 1, y: 1, radius: 2 }
  ]
  t.deepEquals(quadtree.materialize(), {
    id: 0,
    minX: -2,
    minY: -2,
    maxX: 3,
    maxY: 3,
    centerOfMassX: 0.5,
    centerOfMassY: 0.5,
    aggregateMass: 2,
    elements: [],
    children: {
      nw: {
        id: 1,
        minX: -2,
        minY: 0.5,
        maxX: 0.5,
        maxY: 3,
        centerOfMassX: 0.5,
        centerOfMassY: 0.5,
        aggregateMass: 2,
        elements: quadElements
      },
      ne: {
        id: 2,
        minX: 0.5,
        minY: 0.5,
        maxX: 3,
        maxY: 3,
        centerOfMassX: 0.5,
        centerOfMassY: 0.5,
        aggregateMass: 2,
        elements: quadElements
      },
      sw: {
        id: 3,
        minX: -2,
        minY: -2,
        maxX: 0.5,
        maxY: 0.5,
        centerOfMassX: 0.5,
        centerOfMassY: 0.5,
        aggregateMass: 2,
        elements: quadElements
      },
      se: {
        id: 4,
        minX: 0.5,
        minY: -2,
        maxX: 3,
        maxY: 0.5,
        centerOfMassX: 0.5,
        centerOfMassY: 0.5,
        aggregateMass: 2,
        elements: quadElements
      }
    }
  })

  const collidingPairs: [number, number][] = []
  quadtree.forEachCollision((a, b) => {
    collidingPairs.push([a, b])
  })

  t.deepEqual(collidingPairs, [[0, 1]], 'should report collisions for each child quad')
})
