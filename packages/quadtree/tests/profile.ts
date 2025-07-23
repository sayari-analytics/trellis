/* eslint-disable no-console */
import { Quadtree } from '../'

function generateRandomElements(count: number, bounds: number): Float32Array {
  const elements = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const offset = i * 3
    elements[offset] = Math.random() * bounds // x
    elements[offset + 1] = Math.random() * bounds // y
    elements[offset + 2] = Math.random() * 5 + 1 // radius between 1 and 6
  }
  return elements
}

function profileQuadtreeCreation(count: number) {
  const RUNS = 20
  const BOUNDS_SIZE = 100_000
  const PERCENTAGE_TO_MOVE = 0.1
  const durations: number[] = []
  const elements = generateRandomElements(count, BOUNDS_SIZE)

  for (let run = 0; run < RUNS; run++) {
    // Re-create the quadtree for each run to ensure a fair test
    const startTime = performance.now()
    new Quadtree(elements)
    const duration = performance.now() - startTime
    durations.push(duration)

    // Simulate changes
    for (let i = 0; i < Math.floor(count * PERCENTAGE_TO_MOVE); i++) {
      const elementIndex = Math.floor(Math.random() * count)
      const offset = elementIndex * 3
      elements[offset] += Math.random() * 2
      elements[offset + 1] += Math.random() * 2
    }
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n--- 📊 Quadtree Creation Profile ---')
  console.log(`Total Elements Indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:         ${RUNS}`)
  console.log(`Average Creation Time:  ${averageTime.toFixed(2)} ms`)
  console.log('--------------------------')
}

function profileQuadtreeRebuild(count: number) {
  const RUNS = 20
  const BOUNDS_SIZE = 100_000
  const PERCENTAGE_TO_MOVE = 0.1
  const durations: number[] = []
  const elements = generateRandomElements(count, BOUNDS_SIZE)
  const quadtree = new Quadtree(elements)

  for (let run = 0; run < RUNS; run++) {
    const startTime = performance.now()
    quadtree.rebuild()
    const duration = performance.now() - startTime
    durations.push(duration)

    // Simulate changes
    for (let i = 0; i < Math.floor(count * PERCENTAGE_TO_MOVE); i++) {
      const elementIndex = Math.floor(Math.random() * count)
      const offset = elementIndex * 3
      elements[offset] += Math.random() * 2
      elements[offset + 1] += Math.random() * 2
    }
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n--- 📊 Rebuild Profile ---')
  console.log(`Total Elements Re-indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Rebuild Time:      ${averageTime.toFixed(2)} ms`)
  console.log('---------------------------')
}

function profileQuadtreeFind() {
  const ELEMENT_COUNT = 100_000
  const BOUNDS_SIZE = 100_000
  const RUNS = 10_000

  const elements = generateRandomElements(ELEMENT_COUNT, BOUNDS_SIZE)
  const quadtree = new Quadtree(elements)

  let pointTotalResults = 0
  const pointQueryStartTime = performance.now()
  for (let i = 0; i < RUNS; i++) {
    const x = Math.random() * BOUNDS_SIZE
    const y = Math.random() * BOUNDS_SIZE
    const results = quadtree.find(x, y)
    pointTotalResults += results.length
  }
  const pointQueryEndTime = performance.now()

  const pointQueryTotalTime = pointQueryEndTime - pointQueryStartTime
  const pointQueryAvgTime = pointQueryTotalTime / RUNS

  let regionTotalResults = 0
  const regionQueryStartTime = performance.now()
  for (let i = 0; i < RUNS; i++) {
    const x = Math.random() * BOUNDS_SIZE
    const y = Math.random() * BOUNDS_SIZE
    const results = quadtree.find(x, y, 50)
    regionTotalResults += results.length
  }
  const regionQueryEndTime = performance.now()

  const regionQueryTotalTime = regionQueryEndTime - regionQueryStartTime
  const regionQueryAvgTime = regionQueryTotalTime / RUNS

  console.log('\n--- 📊 Find Method Point Queries Profile (radius = 0) ---')
  console.log(`Total Queries:       ${RUNS.toLocaleString()}`)
  console.log(`Avg Result Set Size: ${(pointTotalResults / RUNS).toLocaleString()}`)
  console.log(`Total Time:          ${pointQueryTotalTime.toFixed(2)} ms`)
  console.log(`Avg Time/Query:      ${pointQueryAvgTime.toFixed(4)} ms`)
  console.log('-----------------------------------------------------------')

  console.log('\n--- 📊 Find Method Region Queries Profile (radius = 50) ---')
  console.log(`Total Queries:       ${RUNS.toLocaleString()}`)
  console.log(`Avg Result Set Size: ${(regionTotalResults / RUNS).toLocaleString()}`)
  console.log(`Total Time:          ${regionQueryTotalTime.toFixed(2)} ms`)
  console.log(`Avg Time/Query:      ${regionQueryAvgTime.toFixed(4)} ms`)
  console.log('-------------------------------------------------------------')
}

function profileQuadtreeCollisionResolution(count: number) {
  const RUNS = 10
  const durations: number[] = []
  const BOUNDS_SIZE = 100_000
  let totalCollisionCount = 0

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const quadtree = new Quadtree(elements)

    const startTime = performance.now()
    quadtree.forEachCollision((id1, x1, y1, r1, id2, x2, y2, r2) => {
      const element1Index = id1 * 3,
        element2Index = id2 * 3,
        dx = x2 - x1,
        dy = y2 - y1,
        distSq = dx * dx + dy * dy,
        totalRadius = r1 + r2,
        distance = Math.sqrt(distSq),
        overlap = totalRadius - distance

      // Elements overlap
      if (distance === 0) {
        const randomAngle = Math.random() * 2 * Math.PI
        elements[element1Index] += Math.cos(randomAngle)
        elements[element1Index + 1] += Math.sin(randomAngle)
        return
      }

      // Calculate push-out amount for each circle
      const pushAmount = overlap * 0.5
      const pushX = (dx / distance) * pushAmount
      const pushY = (dy / distance) * pushAmount

      // Reposition elements
      elements[element1Index] -= pushX
      elements[element1Index + 1] -= pushY

      elements[element2Index] += pushX
      elements[element2Index + 1] += pushY

      totalCollisionCount++
    })
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n--- 📊 Collision Resolution Profile ---')
  console.log(`Elements Indexed:          ${count.toLocaleString()}`)
  console.log(`Avg Collision Pairs Found: ${(totalCollisionCount / RUNS).toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Time:              ${averageTime.toFixed(2)} ms`)
  console.log('-----------------------------------------')
}

profileQuadtreeCreation(100_000)
profileQuadtreeCreation(20_000)
profileQuadtreeRebuild(100_000)
profileQuadtreeRebuild(20_000)
profileQuadtreeFind()
profileQuadtreeCollisionResolution(100_000)
