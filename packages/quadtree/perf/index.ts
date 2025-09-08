/* eslint-disable no-console */
import { Quadtree } from '..'

const MAX_DEPTH = 7
const MAX_CAPACITY = 8

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

function profileCreate(count: number) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)

    const startTime = performance.now()
    new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- Quadtree Creation Profile ---\x1b[0m')
  console.log(`Total Elements Indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:         ${RUNS}`)
  console.log(`Average Creation Time:  ${averageTime.toFixed(2)} ms`)
  console.log('--------------------------')
  return averageTime
}

function profileRebuild(count: number) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []
  const elements = generateRandomElements(count, BOUNDS_SIZE)
  const quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })

  for (let run = 0; run < RUNS; run++) {
    const startTime = performance.now()
    quadtree.rebuild()
    const duration = performance.now() - startTime
    durations.push(duration)

    // Simulate changes
    for (let i = 0; i < count; i++) {
      const elementPtr = i * 3
      elements[elementPtr] += Math.random() * 2
      elements[elementPtr + 1] += Math.random() * 2
    }
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- Rebuild Profile ---\x1b[0m')
  console.log(`Total Elements Re-indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Rebuild Time:      ${averageTime.toFixed(2)} ms`)
  console.log('---------------------------')
  return averageTime
}

function profileCollide(count: number) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []
  let totalCollisionCount = 0
  const elements = generateRandomElements(count, BOUNDS_SIZE)
  const quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })

  for (let run = 0; run < RUNS; run++) {
    const startTime = performance.now()
    quadtree.forEachCollision((id1, id2) => {
      const element1Index = id1 * 3,
        element2Index = id2 * 3,
        x1 = elements[element1Index],
        y1 = elements[element1Index + 1],
        r1 = elements[element1Index + 2],
        x2 = elements[element2Index],
        y2 = elements[element2Index + 1],
        r2 = elements[element2Index + 2],
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

    // Simulate changes
    for (let i = 0; i < count; i++) {
      const elementPtr = i * 3
      elements[elementPtr] += Math.random() * 2
      elements[elementPtr + 1] += Math.random() * 2
    }
    quadtree.rebuild()
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- Collision Profile ---\x1b[0m')
  console.log(`Elements Indexed:          ${count.toLocaleString()}`)
  console.log(`Avg Collision Pairs Found: ${(totalCollisionCount / RUNS).toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Time:              ${averageTime.toFixed(2)} ms`)
  console.log('-----------------------------------------')
  return averageTime
}

function profileManyBody(count: number, theta: number = 0.9) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []
  let totalInteractions = 0
  const elements = generateRandomElements(count, BOUNDS_SIZE)
  const quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })
  const forces = new Float32Array(count * 2) // To store [fx, fy] for each element

  for (let run = 0; run < RUNS; run++) {
    forces.fill(0)
    const startTime = performance.now()
    quadtree.forEachBody((elementId, bodyX, bodyY, mass, distanceSq) => {
      const elementPtr = elementId * 3
      const x = elements[elementPtr]
      const y = elements[elementPtr + 1]
      const dx = bodyX - x
      const dy = bodyY - y
      const softeningSq = 10 // A softening factor prevents extreme forces at very small distances
      const effectiveDistanceSq = distanceSq + softeningSq

      // Calculate force magnitude: F = G * m1 * m2 / r^2
      const forceMagnitude = mass / effectiveDistanceSq
      const distance = Math.sqrt(effectiveDistanceSq)

      forces[elementId * 2] += forceMagnitude * (dx / distance)
      forces[elementId * 2 + 1] += forceMagnitude * (dy / distance)

      totalInteractions++
    }, theta)

    const duration = performance.now() - startTime
    durations.push(duration)

    // Simulate changes
    for (let i = 0; i < count; i++) {
      const elementPtr = i * 3
      elements[elementPtr] += Math.random() * 2
      elements[elementPtr + 1] += Math.random() * 2
    }
    quadtree.rebuild()
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- N-Body Simulation Profile ---\x1b[0m')
  console.log(`Elements Indexed:          ${count.toLocaleString()}`)
  console.log(`Theta (Approximation):     ${theta}`)
  console.log(`Avg Interactions Found:    ${(totalInteractions / RUNS).toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Time:              ${averageTime.toFixed(2)} ms`)
  console.log('------------------------------------')
  return averageTime
}

function profileForEachQuad(count: number) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })

    const startTime = performance.now()
    quadtree.forEachQuad(() => true)
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- Quadtree forEachQuad Profile ---\x1b[0m')
  console.log(`Total Elements Indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:         ${RUNS}`)
  console.log(`Average forEachQuad Time:  ${averageTime.toFixed(2)} ms`)
  console.log('--------------------------')
  return averageTime
}

function profileGetQuadElements(count: number) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })

    const startTime = performance.now()
    quadtree.forEachQuad((quadId) => {
      for (const _el of quadtree.getQuadElements(quadId)) {
        /***/
      }
      return true
    })
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- Quadtree getQuadElements Profile ---\x1b[0m')
  console.log(`Total Elements Indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:         ${RUNS}`)
  console.log(`Average getQuadElements Time:  ${averageTime.toFixed(2)} ms`)
  console.log('--------------------------')
  return averageTime
}

profileCreate(100_000)
const rebuildTime = profileRebuild(100_000)
const collisionTime = profileCollide(100_000)
const nBodyTime = profileManyBody(100_000, 3)
profileForEachQuad(100_000)
profileGetQuadElements(100_000)

console.log('\n\x1b[1m\x1b[38;5;208m--- Simulation Total Time ---\x1b[0m')
console.log(`Rebuild:          ${rebuildTime.toFixed(2)} ms`)
console.log(`Collisions:       ${collisionTime.toFixed(2)} ms`)
console.log(`Many Bodies:      ${nBodyTime.toFixed(2)} ms`)
console.log(`Total:            ${(rebuildTime + collisionTime + nBodyTime).toFixed(2)} ms`)
console.log('------------------------------------')
