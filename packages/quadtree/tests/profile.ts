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
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)

    const startTime = performance.now()
    new Quadtree(elements)
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

function profileQuadtreeRebuild(count: number) {
  const RUNS = 10
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []
  const elements = generateRandomElements(count, BOUNDS_SIZE)
  const quadtree = new Quadtree(elements)

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

function profileQuadtreeCollisions(count: number) {
  const RUNS = 10
  const durations: number[] = []
  const BOUNDS_SIZE = count * 1.5
  let totalCollisionCount = 0

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const quadtree = new Quadtree(elements)

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
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- Collision Resolution Profile ---\x1b[0m')
  console.log(`Elements Indexed:          ${count.toLocaleString()}`)
  console.log(`Avg Collision Pairs Found: ${(totalCollisionCount / RUNS).toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Time:              ${averageTime.toFixed(2)} ms`)
  console.log('-----------------------------------------')
  return averageTime
}

function profileQuadtreeNBody(count: number, theta: number = 0.9) {
  const RUNS = 10
  const durations: number[] = []
  const BOUNDS_SIZE = count * 1.5
  let totalInteractions = 0

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const quadtree = new Quadtree(elements)
    const forces = new Float32Array(count * 2) // To store [fx, fy] for each element

    const startTime = performance.now()
    quadtree.forEachBody((elementId, bodyX, bodyY, mass, distanceSq) => {
      const elementPtr = elementId * 3
      const x = elements[elementPtr]
      const y = elements[elementPtr + 1]

      // Use simplified constants for the physics calculation
      const G = 1
      // A softening factor prevents extreme forces at very small distances
      const softeningSq = 100

      const dx = bodyX - x
      const dy = bodyY - y

      const effectiveDistanceSq = distanceSq + softeningSq

      // Calculate force magnitude: F = G * m1 * m2 / r^2
      // Assume mass is 1 for each base particle
      const myMass = 1
      const bodyMass = mass
      const forceMagnitude = (G * myMass * bodyMass) / effectiveDistanceSq

      // Normalize the force vector, requiring a sqrt only when an interaction occurs
      const distance = Math.sqrt(effectiveDistanceSq)

      // Accumulate the force vector components
      const forceX = forceMagnitude * (dx / distance)
      const forceY = forceMagnitude * (dy / distance)

      forces[elementId * 2] += forceX
      forces[elementId * 2 + 1] += forceY

      totalInteractions++
    }, theta)

    const duration = performance.now() - startTime
    durations.push(duration)
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

profileQuadtreeCreation(100_000)
const rebuildTime = profileQuadtreeRebuild(100_000)
const collisionTime = profileQuadtreeCollisions(100_000)
const nBodyTime = profileQuadtreeNBody(100_000, 4)
console.log('\n\x1b[1m\x1b[38;5;208m--- Total Time ---\x1b[0m')
console.log(`Rebuild:          ${rebuildTime.toFixed(2)} ms`)
console.log(`Collisions:       ${collisionTime.toFixed(2)} ms`)
console.log(`Many Bodies:      ${nBodyTime.toFixed(2)} ms`)
console.log(`Total:            ${(rebuildTime + collisionTime + nBodyTime).toFixed(2)} ms`)
console.log('------------------------------------')
