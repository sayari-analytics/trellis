import { Quadtree } from '../src'
import { Quad, recordQuadProperties } from '../tests/utils'

const RADIUS = 1
const MAX_DEPTH = 8
const MAX_CAPACITY = 6

/**
 * create canvas
 */
const canvas = document.getElementById('quadtree-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
const dpr = window.devicePixelRatio || 1
const width = window.innerWidth - 100
const height = window.innerHeight - 100
canvas.width = width * dpr
canvas.height = height * dpr
canvas.style.width = `${width}px`
canvas.style.height = `${height}px`
ctx.scale(dpr, dpr)

/**
 * create quadtree and elements
 */
let elements = new Float32Array(0)
let quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })

/**
 * dom elements
 */
document.getElementById('add-5k-btn')!.addEventListener('click', () => addElements(5_000))
document.getElementById('add-25k-btn')!.addEventListener('click', () => addElements(25_000))
document.getElementById('add-100k-btn')!.addEventListener('click', () => addElements(100_000))
document.getElementById('clear-btn')!.addEventListener('click', clearButtonClick)
document.getElementById('highlight-collisions-btn')!.addEventListener('click', highlightCollisionsButtonClick)
document.getElementById('simulate-btn')!.addEventListener('click', simulateRandomBodyButtonClick)
const statsContainer = document.getElementById('stats-container') as HTMLDivElement

/**
 * button event handlers
 */
const collisions = new Set<number>()
let collisionDetectionCount = 0
function highlightCollisionsButtonClick() {
  if (collisions.size > 0) {
    collisions.clear()
    collisionDetectionCount = 0
  } else {
    quadtree.forEachCollision((a, b) => {
      collisions.add(a)
      collisions.add(b)
      collisionDetectionCount++
    })
  }

  draw()
}

let simulatedBody: number | null = null
const centersOfMass: { x: number; y: number }[] = []
function simulateRandomBodyButtonClick() {
  if (simulatedBody !== null) {
    simulatedBody = null
    centersOfMass.length = 0
  } else {
    if (elements.length === 0) return
    simulatedBody = Math.floor(Math.random() * (elements.length / 3))
    quadtree.forEachBody((elementId, bodyX, bodyY) => {
      if (elementId === simulatedBody) {
        centersOfMass.push({ x: bodyX, y: bodyY })
      }
    })
  }

  draw()
}

function clearButtonClick() {
  elements = new Float32Array(0)
  quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })
  collisions.clear()
  collisionDetectionCount = 0
  simulatedBody = null
  centersOfMass.length = 0
  draw()
}

/**
 * update elements
 */

function addElements(count: number) {
  const newElements = new Float32Array(elements.length + count * 3)
  const centerX = canvas.width / dpr / 2
  const stdDevX = canvas.width / dpr / 6
  const centerY = canvas.height / dpr / 2
  const stdDevY = canvas.height / dpr / 6
  newElements.set(elements)

  for (let i = 0; i < count; i++) {
    const x = Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random()) * stdDevX + centerX
    const y = Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random()) * stdDevY + centerY
    newElements.set([x, y, RADIUS], elements.length + i * 3)
  }
  elements = newElements
  quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })
  draw()
}

canvas.addEventListener('click', (event: MouseEvent) => {
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const newElements = new Float32Array(elements.length + 3)
  newElements.set(elements)
  newElements.set([x, y, RADIUS], elements.length)
  elements = newElements

  quadtree = new Quadtree(elements, { maxDepth: MAX_DEPTH, maxCapacity: MAX_CAPACITY })
  draw()
})

/**
 * draw functions
 */
function draw(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const quads: { [quadId: number]: Quad } = {}
  quadtree.forEachQuad(recordQuadProperties(quadtree, quads))

  for (const quad of Object.values(quads)) drawQuad(quad)

  drawElements()
  drawCentersOfMass()
  updateStats()
}

function drawQuad(quad: Quad): void {
  ctx.strokeStyle = '#000'
  ctx.lineWidth = Math.max(0.5, 2.5 - quad.depth / 2)
  ctx.strokeRect(quad.minX, quad.minY, quad.maxX - quad.minX, quad.maxY - quad.minY)
}

function drawElements(): void {
  for (let i = 0; i < elements.length; i += 3) {
    const elementIndex = i / 3
    const x = elements[i]
    const y = elements[i + 1]
    const radius = elements[i + 2]

    ctx.beginPath()

    if (simulatedBody === elementIndex) {
      ctx.arc(x, y, radius * 4, 0, 2 * Math.PI)
      ctx.fillStyle = 'blue'
      ctx.fill()
    } else if (collisions.has(elementIndex)) {
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = 'red'
      ctx.fill()
    } else {
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}

function drawCentersOfMass() {
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 2
  for (const { x, y } of centersOfMass) {
    ctx.beginPath()
    ctx.moveTo(x - RADIUS * 2, y - RADIUS * 2)
    ctx.lineTo(x + RADIUS * 2, y + RADIUS * 2)
    ctx.moveTo(x + RADIUS * 2, y - RADIUS * 2)
    ctx.lineTo(x - RADIUS * 2, y + RADIUS * 2)
    ctx.stroke()
  }
}

function updateStats() {
  const elementCount = elements.length / 3
  const collisionCount = collisions.size
  const bodyCount = centersOfMass.length

  statsContainer.innerHTML = `
    Elements: ${elementCount}<br>
    Collisions: ${collisionCount} (collision comparison count ${collisionDetectionCount})<br>
    Bodies: ${bodyCount}
  `
}

draw()
