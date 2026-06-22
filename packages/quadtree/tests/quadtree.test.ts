/* eslint-disable no-console */
import test from 'tape'
import { Quadtree } from '../src'
import { Quad, recordQuadProperties } from './utils'

test('[quadtree.test.ts] creates empty quadtree', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(new Float32Array([]), { maxDepth: 7 })
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, { 0: { depth: 0, minX: 0, maxX: 1, minY: 0, maxY: 1, centerOfMassX: undefined, centerOfMassY: undefined, aggregateMass: 0, elements: [] } }) // eslint-disable-line
})

test('[quadtree.test.ts] indexes elements in parent quad while element count is less than quad capacity', (t) => {
  t.plan(5)

  {
    const quadtree = new Quadtree(new Float32Array([10, 10, 1]), { maxDepth: 7 })
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      { 0: { depth: 0, minX: 9, maxX: 11, minY: 9, maxY: 11, centerOfMassX: 10, centerOfMassY: 10, aggregateMass: 1, elements: [0] } }, // eslint-disable-line
      'correctly indexes one element in root quad'
    )
  }

  {
    const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1]]), { maxCapacity: 4, maxDepth: 2 })
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      { 0: { depth: 0, minX: -11, maxX: 11, minY: 9, maxY: 11, centerOfMassX: 0, centerOfMassY: 10, aggregateMass: 2, elements: [0, 1] } }, // eslint-disable-line
      'correctly indexes two elements in root quad'
    )
  }

  {
    const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1]]), {
      maxCapacity: 4,
      maxDepth: 2
    })
    const quads: { [quadId: number]: Quad } = {}
    quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

    t.deepEquals(
      quads,
      { 0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: 0, centerOfMassY: 0, aggregateMass: 4, elements: [0, 1, 2, 3] } }, // eslint-disable-line
      'correctly indexes four elements in root quad'
    )
  }

  {
    const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1]]), {
      maxCapacity: 1,
      maxDepth: 3
    })
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
    const quadtree = new Quadtree(
      new Float32Array([...[10, 10, 1], ...[10, 9, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1], ...[-10, -9, 1]]),
      { maxCapacity: 4, maxDepth: 5 }
    )

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

  const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1], ...[-5, -5, 1]]), {
    maxCapacity: 4,
    maxDepth: 3
  })
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
    new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1], ...[-5, -5, 1], ...[-5, 0.5, 1]]),
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

test('[quadtree.test.ts] computes quad center of mass', (t) => {
  t.plan(1)

  const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1]]), { maxCapacity: 4 })
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  t.deepEquals(quads, {
    0: { depth: 0, minX: -11, maxX: 11, minY: -11, maxY: 11, centerOfMassX: 10 / 3, centerOfMassY: 10 / 3, aggregateMass: 3, elements: [0, 1, 2] } // eslint-disable-line
  })
})
