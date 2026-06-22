/* eslint-disable no-console */
import test from 'tape'
import { Quadtree } from '../src'
import { Quad, recordQuadProperties } from './utils'

test('[forEachBody.test.ts] forEachBody iterates over all bodies', (t) => {
  t.plan(2)

  const quadtree = new Quadtree(new Float32Array([...[10, 10, 1], ...[-10, 10, 1], ...[10, -10, 1], ...[-10, -10, 1]]))

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

test('[forEachBody.test.ts] forEachBody approximates distant bodies using quad center of mass', (t) => {
  t.plan(3)

  const quadtree = new Quadtree(
    new Float32Array([
      // Cluster of elements in the top-left
      ...[10, 10, 1],
      ...[11, 11, 1],
      ...[12, 12, 1],
      // A single distant element
      ...[100, 100, 1]
    ]),
    { maxCapacity: 2, maxDepth: 4 }
  )
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
