/* eslint-disable no-console */
import test from 'tape'
import { MaterializedQuad, Quadtree } from '../'

/**
 * utils
 */
const createCircleData = (circles: [x: number, y: number, radius: number][]): Float32Array => {
  const data = new Float32Array(circles.length * 3)
  for (let i = 0; i < circles.length; i++) {
    const offset = i * 3
    data[offset] = circles[i][0] // x
    data[offset + 1] = circles[i][1] // y
    data[offset + 2] = circles[i][2] // radius
  }
  return data
}

const sort = (arr: number[]) => arr.sort((a, b) => a - b)

function assertRoughlyEqual(t: test.Test, actual: number, expected: number, message: string) {
  const tolerance = 1e-6
  t.ok(Math.abs(actual - expected) < tolerance, message)
}

const randomNumber = (max: number, fixed: number = 2) => {
  return parseFloat((Math.random() * max).toFixed(fixed))
}

const sortPairs = (pairs: [number, number][]) => {
  return pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

/**
 * tests
 */
test('Quadtree Creation', (t) => {
  t.plan(1)

  const count = 12
  const circles: [number, number, number][] = []
  for (let i = 0; i < count; i++) {
    circles.push([randomNumber(100), randomNumber(100), randomNumber(5, 1)])
  }
  // Add one point far away to ensure the bounds create a midpoint far from the cluster.
  circles.push([90, 90, 2])

  const elements = createCircleData(circles)
  new Quadtree(elements)

  t.comment(`quadtree with ${count} elements`)
  t.pass()
})

test('Quadtree Creation: Simple Indexing (No Subdivision)', (t) => {
  t.plan(1)

  const elements = createCircleData([
    [10, 10, 5],
    [90, 90, 5]
  ])

  const qt = new Quadtree(elements)
  const materialized = qt.materialize()

  // Elements are added to the head of a linked list, so they appear in reverse insertion order.
  const expectedElements = [
    { id: 1, x: 90, y: 90, radius: 5 },
    { id: 0, x: 10, y: 10, radius: 5 }
  ]

  t.deepEqual(materialized.elements, expectedElements, 'Root quad should contain all elements when capacity is not exceeded')
})

test('Quadtree Creation: Subdivision', (t) => {
  t.plan(2)

  const smallCircles: [number, number, number][] = []
  // Create 9 elements to exceed QUAD_MAX_CAPACITY (8).
  for (let i = 0; i < 9; i++) {
    smallCircles.push([-50 + i, -50 + i, 2])
  }
  // Add one point far away to ensure the bounds create a predictable midpoint.
  smallCircles.push([90, 90, 2])

  const elements = createCircleData(smallCircles)
  const qt = new Quadtree(elements)
  const materialized = qt.materialize()

  t.ok(materialized.children, 'Root quad should have children, confirming subdivision occurred')

  function countAllElements(quad: MaterializedQuad): number {
    let count = quad.elements.length
    if (quad.children) {
      count += countAllElements(quad.children.nw)
      count += countAllElements(quad.children.ne)
      count += countAllElements(quad.children.sw)
      count += countAllElements(quad.children.se)
    }
    return count
  }
  const totalElementsFound = countAllElements(materialized)

  t.equal(totalElementsFound, 10, 'The total number of elements should be conserved after subdivision')
})

test('Quadtree insert() and subdivide()', (t) => {
  t.test('insert should correctly update aggregate element counts', (st) => {
    st.plan(3)

    const elements = createCircleData([
      // 2 elements for the SW child
      [-50, -50, 5],
      [-55, -55, 5],
      // 7 elements for the NE child (total = 9, which > 8)
      [50, 50, 5],
      [51, 51, 5],
      [52, 52, 5],
      [53, 53, 5],
      [54, 54, 5],
      [55, 55, 5],
      [56, 56, 5]
    ])
    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    st.equal(materialized.totalMass, 9, 'Root quad aggregate count should be total number of elements')
    st.equal(materialized.children!.sw.totalMass, 2, 'SW child aggregate count should be 2')
    st.equal(materialized.children!.ne.totalMass, 7, 'NE child aggregate count should be 7')
  })

  t.test('subdivide should correctly redistribute elements', (st) => {
    st.plan(2)

    const circles: [number, number, number][] = []
    // Force bounds so the midpoint is (50, 50)
    circles.push([0, 0, 1])
    circles.push([100, 100, 1])

    // Add 7 elements that will fit in the SW child
    for (let i = 0; i < 7; i++) {
      circles.push([10, 10, 1])
    }
    // Add a 9th element that is guaranteed to straddle the (50,50) midpoint
    circles.push([50, 50, 5])

    const elements = createCircleData(circles)
    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    st.equal(materialized.elements.length, 1, 'Root quad should keep the 1 straddling element')
    // The SW child gets the element at (0,0) plus the 7 at (10,10)
    st.equal(materialized.children!.sw.elements.length, 8, 'SW child should receive the 8 fitting elements')
  })

  t.test('insert should stop subdividing at QUAD_MAX_DEPTH', (st) => {
    st.plan(2)

    const originalMaxDepth = Quadtree.QUAD_MAX_DEPTH
    ;(Quadtree as any).QUAD_MAX_DEPTH = 2 // Temporarily lower max depth for testing
    st.teardown(() => {
      ;(Quadtree as any).QUAD_MAX_DEPTH = originalMaxDepth // Restore original value
    })

    const circles: [number, number, number][] = []

    // Add scaffolding points to create a large, stable world
    circles.push([-1, -1, 0.1])
    circles.push([1, 1, 0.1])

    // Add 9 elements, clustered in what is now the NE quadrant.
    for (let i = 0; i < 9; i++) {
      circles.push([0.1 + i * 0.001, 0.1 + i * 0.001, 0.01])
    }

    const elements = createCircleData(circles)
    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    const child = materialized.children!.ne // This is the quad at depth 1
    const grandchild = child.children!.sw // The 9 clustered elements are in the SW child of that quad

    st.equal(grandchild.elements.length, 9, 'Leaf at max depth should contain all 9 clustered elements')

    st.notOk(grandchild.children, 'Leaf at max depth should not have children, even though it is over capacity')
  })

  t.test('should handle empty element array without errors', (st) => {
    st.plan(2)

    const elements = createCircleData([])
    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    st.equal(materialized.totalMass, 0, 'Root quad should have a total mass of 0')
    st.deepEqual(materialized.elements, [], 'Root quad should have no elements')
  })

  t.test('should keep elements that lie exactly on a boundary in the parent quad', (st) => {
    st.plan(1)

    // Force bounds from [-10,-10] to [10,10], making the midpoint (0,0)
    const elements = createCircleData([
      [-10, -10, 1],
      [10, 10, 1],
      [0, 5, 1], // On the vertical boundary line
      [5, 0, 1], // On the horizontal boundary line
      [0, 0, 1] // On the exact midpoint
    ])

    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    // Because capacity is not exceeded, the root never subdivides. All points are local.
    // If we force subdivision, the points on the boundaries would remain local to the root.
    st.equal(materialized.elements.length, 5, 'All boundary-hugging elements should be in the root (as it is a leaf)')
  })

  t.test('should correctly partition elements into all 4 children and the parent', (st) => {
    st.plan(5)

    // This test forces a subdivision where elements are distributed to all possible locations.
    const elements = createCircleData([
      // Force bounds from [-100,-100] to [100,100], making midpoint (0,0)
      [-100, -100, 1],
      [100, 100, 1],
      // 2 elements for each child quad
      [-50, 50, 1],
      [-51, 51, 1], // NW
      [50, 50, 1],
      [51, 51, 1], // NE
      [-50, -50, 1],
      [-51, -51, 1], // SW
      [50, -50, 1],
      [51, -51, 1], // SE
      // 1 straddling element to stay in the parent
      [0, 0, 10]
    ])

    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    st.equal(materialized.elements.length, 1, 'Root should contain the 1 straddling element')
    st.equal(materialized.children!.nw.elements.length, 2, 'NW child should contain 2 elements')
    st.equal(materialized.children!.ne.elements.length, 3, 'NE child should contain 3 elements (including the corner point)')
    st.equal(materialized.children!.sw.elements.length, 3, 'SW child should contain 3 elements (including the corner point)')
    st.equal(materialized.children!.se.elements.length, 2, 'SE child should contain 2 elements')
  })
})

test('Quadtree find() - Point Queries (radius = 0)', (t) => {
  const elements = createCircleData([
    [10, 10, 5],
    [12, 12, 5],
    [100, 100, 10]
  ])
  const qt = new Quadtree(elements)

  t.test('should find a single element containing the point', (st) => {
    st.plan(1)
    const result = qt.find(100, 100)
    st.deepEqual(sort(result), [2], 'finds the correct element')
  })

  t.test('should find multiple elements containing the point', (st) => {
    st.plan(1)
    const result = qt.find(11, 11)
    st.deepEqual(sort(result), [0, 1], 'finds both overlapping elements')
  })

  t.test('should find an element when the point is on its edge', (st) => {
    st.plan(1)
    const result = qt.find(5, 10)
    st.deepEqual(sort(result), [0], 'finds element on its edge')
  })

  t.test('should return an empty array when no elements contain the point', (st) => {
    st.plan(1)
    const result = qt.find(0, 0)
    st.deepEqual(sort(result), [], 'returns empty array for a point with no collisions')
  })
})

test('Quadtree find() - Region Queries (radius > 0)', (t) => {
  const elements = createCircleData([
    [0, 0, 10],
    [100, 100, 10],
    [5, 5, 5]
  ])
  const qt = new Quadtree(elements)

  t.test('should find elements that overlap the query circle', (st) => {
    st.plan(1)
    // Query circle at (2,2) with r=8 overlaps with elements 0 and 6
    const result = qt.find(2, 2, 8)
    st.deepEqual(sort(result), [0, 2], 'finds multiple overlapping elements')
  })

  t.test('should find an element that is just touching the query circle', (st) => {
    st.plan(1)
    // Query circle at (15,0) with r=5 just touches element 0 (r=10)
    const result = qt.find(15, 0, 5)
    st.deepEqual(sort(result), [0], 'finds touching element')
  })

  t.test('should find an element that is fully contained by the query circle', (st) => {
    st.plan(1)
    const result = qt.find(0, 0, 20)
    st.deepEqual(sort(result), [0, 2], 'finds contained elements')
  })

  t.test('should return an empty array when no elements overlap the query circle', (st) => {
    st.plan(1)
    const result = qt.find(50, 50, 5)
    st.deepEqual(sort(result), [], 'returns empty array for a region with no collisions')
  })
})

test('Quadtree rebuild()', (t) => {
  t.plan(3)

  const elements = createCircleData([
    [10, 10, 5],
    [100, 100, 5]
  ])

  const qt = new Quadtree(elements)

  // Manually move an element by modifying the underlying data array.
  // The quadtree's internal index is now stale.
  const elementIdToMove = 0
  const newX = 50
  const newY = 50
  elements[elementIdToMove * 3] = newX
  elements[elementIdToMove * 3 + 1] = newY

  // Call rebuild() to update the quadtree's internal structure.
  qt.rebuild()

  // Verify the tree is now correct.
  const resultAtOldPosition = qt.find(10, 10)
  t.deepEqual(resultAtOldPosition, [], 'should not find the element at its old position')

  const resultAtNewPosition = qt.find(newX, newY)
  t.deepEqual(resultAtNewPosition, [elementIdToMove], 'should find the element at its new position')

  const resultForUnchangedElement = qt.find(100, 100)
  t.deepEqual(resultForUnchangedElement, [1], 'should still find elements that were not moved')
})

test('Quadtree Center of Mass Aggregation', (t) => {
  t.test('should correctly calculate center of mass for a leaf node', (st) => {
    st.plan(3)

    const elements = createCircleData([
      [10, 20, 1], // id 0
      [30, 40, 1] // id 1
    ])
    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    // Expected center of mass is the average of the points' positions
    const expectedX = (10 + 30) / 2 // 20
    const expectedY = (20 + 40) / 2 // 30

    st.equal(materialized.totalMass, 2, 'Total mass should be the number of elements')
    assertRoughlyEqual(st, materialized.centerOfMassX!, expectedX, 'Center of mass X should be correct')
    assertRoughlyEqual(st, materialized.centerOfMassY!, expectedY, 'Center of mass Y should be correct')
  })

  test('should correctly aggregate center of mass for a branch node', (st) => {
    st.plan(6)

    const circles: [number, number, number][] = []

    // Force the bounds so the midpoint is exactly (0,0)
    circles.push([-100, -100, 1])
    circles.push([100, 100, 1])
    // Add a straddling element that is guaranteed to stay in the root
    circles.push([0, 0, 10])
    // Add 7 more elements guaranteed to be in the SW child
    for (let i = 1; i < 8; i++) {
      circles.push([-50 - i, -50 - i, 1])
    }

    const elements = createCircleData(circles)
    const qt = new Quadtree(elements)
    const materialized = qt.materialize()

    const swChild = materialized.children!.sw
    // Weighted X and Y of the 8 child elements = -100 + (-51...-57) = -478
    const expectedChildX = -478 / 8 // -59.75
    const expectedChildY = -478 / 8 // -59.75
    st.equal(swChild.totalMass, 8, 'SW child mass should be 8')
    assertRoughlyEqual(st, swChild.centerOfMassX!, expectedChildX, 'SW child center of mass X should be correct')
    assertRoughlyEqual(st, swChild.centerOfMassY!, expectedChildY, 'SW child center of mass Y should be correct')

    // Root total mass = 10
    // Root weighted X = (-478 from SW) + (0 from local) + (100 from NE) = -378
    // Root weighted Y = (-478 from SW) + (0 from local) + (100 from NE) = -378
    const expectedRootX = -378 / 10 // -37.8
    const expectedRootY = -378 / 10 // -37.8

    st.equal(materialized.totalMass, 10, 'Root total mass should be 10')
    assertRoughlyEqual(st, materialized.centerOfMassX!, expectedRootX, 'Root center of mass X should be aggregated correctly')
    assertRoughlyEqual(st, materialized.centerOfMassY!, expectedRootY, 'Root center of mass Y should be aggregated correctly')
  })
})

test('Quadtree forEachCollision()', (t) => {
  t.test('should find a single pair of colliding elements', (st) => {
    st.plan(1)
    const elements = createCircleData([
      [0, 0, 10], // id 0
      [12, 0, 5], // id 1, collides with 0
      [100, 100, 5] // id 2, does not collide
    ])
    const qt = new Quadtree(elements)
    const foundPairs: [number, number][] = []

    qt.forEachCollision((id1, _x1, _y1, _r1, id2, _x2, _y2, _r2) => {
      if (id1 < id2) {
        foundPairs.push([id1, id2])
      } else {
        foundPairs.push([id2, id1])
      }
    })

    const expected = [[0, 1]]
    st.deepEqual(sortPairs(foundPairs), expected, 'finds one correct collision pair')
  })

  t.test('should find multiple collision pairs in a cluster', (st) => {
    st.plan(1)
    const elements = createCircleData([
      [0, 0, 10], // id 0, collides with 1
      [8, 8, 10], // id 1, collides with 0 and 2
      [16, 16, 10], // id 2, collides with 1
      [100, 100, 5] // id 3, no collisions
    ])
    const qt = new Quadtree(elements)
    const foundPairs: [number, number][] = []

    qt.forEachCollision((id1, _x1, _y1, _r1, id2, _x2, _y2, _r2) => {
      if (id1 < id2) {
        foundPairs.push([id1, id2])
      } else {
        foundPairs.push([id2, id1])
      }
    })

    const expected = [
      [0, 1],
      [1, 2]
    ]
    st.deepEqual(sortPairs(foundPairs), expected, 'finds all correct collision pairs in a chain')
  })

  t.test('should find all collisions for one element overlapping many', (st) => {
    st.plan(1)
    const elements = createCircleData([
      [50, 50, 20], // id 0, the large central circle
      [50, 40, 5], // id 1, collides with 0
      [50, 60, 5], // id 2, collides with 0
      [100, 100, 5] // id 3, no collisions
    ])
    const qt = new Quadtree(elements)
    const foundPairs: [number, number][] = []

    qt.forEachCollision((id1, _x1, _y1, _r1, id2, _x2, _y2, _r2) => {
      if (id1 < id2) {
        foundPairs.push([id1, id2])
      } else {
        foundPairs.push([id2, id1])
      }
    })

    const expected = [
      [0, 1],
      [0, 2]
    ]
    st.deepEqual(sortPairs(foundPairs), expected, 'finds all collisions for a central element')
  })
})
