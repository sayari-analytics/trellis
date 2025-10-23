/* eslint-disable no-console */
import { quadtree } from 'd3-quadtree'
import { forceCollide, forceManyBody } from 'd3-force'

type Element = { x: number; y: number; r: number; vx: number; vy: number }

const RUNS = 10

function generateRandomElements(count: number, bounds: number): Element[] {
  const elements = new Array<Element>(count)
  for (let i = 0; i < count; i++) {
    elements[i] = { x: Math.random() * bounds, y: Math.random() * bounds, r: Math.random() * 5 + 1, vx: 0, vy: 0 }
  }
  return elements
}

// https://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use
const a = 1664525
const c = 1013904223
const m = 4294967296 // 2^32

function lcg() {
  let s = 1
  return () => (s = (a * s + c) % m) / m
}

function profileCreate(count: number) {
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)

    const startTime = performance.now()
    quadtree(
      elements,
      (d) => d.x,
      (d) => d.y
    )
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- D3 Quadtree Creation Profile ---\x1b[0m')
  console.log(`Total Elements Indexed: ${count.toLocaleString()}`)
  console.log(`Number of Runs:         ${RUNS}`)
  console.log(`Average Creation Time:  ${averageTime.toFixed(2)} ms`)
  console.log('--------------------------')
  return averageTime
}

function profileCollide(count: number) {
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const collide = forceCollide<Element>((element) => element.r)
    collide.initialize(elements, lcg())

    const startTime = performance.now()
    collide(1)
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- D3 Collision Profile ---\x1b[0m')
  console.log(`Elements Indexed:          ${count.toLocaleString()}`)
  // console.log(`Avg Collision Pairs Found: ${(totalCollisionCount / RUNS).toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Time:              ${averageTime.toFixed(2)} ms`)
  console.log('-----------------------------------------')
  return averageTime
}

function profileNBody(count: number, theta: number = 0.9) {
  const BOUNDS_SIZE = count * 1.5
  const durations: number[] = []

  for (let run = 0; run < RUNS; run++) {
    const elements = generateRandomElements(count, BOUNDS_SIZE)
    const manyBody = forceManyBody<Element>()
    manyBody.initialize(elements, lcg())
    manyBody.theta(theta)

    const startTime = performance.now()
    manyBody(1)
    const duration = performance.now() - startTime
    durations.push(duration)
  }

  // Calculate the average time
  const totalTime = durations.reduce((sum, time) => sum + time, 0)
  const averageTime = totalTime / RUNS

  console.log('\n\x1b[1m\x1b[38;5;208m--- N-Body Simulation Profile ---\x1b[0m')
  console.log(`Elements Indexed:          ${count.toLocaleString()}`)
  console.log(`Theta (Approximation):     ${theta}`)
  // console.log(`Avg Interactions Found:    ${(totalInteractions / RUNS).toLocaleString()}`)
  console.log(`Number of Runs:            ${RUNS}`)
  console.log(`Average Time:              ${averageTime.toFixed(2)} ms`)
  console.log('------------------------------------')
  return averageTime
}

const createTime = profileCreate(100_000)
const collisionTime = profileCollide(100_000)
const nBodyTime = profileNBody(100_000, 4)

console.log('\n\x1b[1m\x1b[38;5;208m--- Simulation Total Time ---\x1b[0m')
console.log(`Rebuild:          ${createTime.toFixed(2)} ms`)
console.log(`Collisions:       ${collisionTime.toFixed(2)} ms`)
console.log(`Many Bodies:      ${nBodyTime.toFixed(2)} ms`)
console.log(`Total:            ${(createTime + collisionTime + nBodyTime).toFixed(2)} ms`)
console.log('------------------------------------')
