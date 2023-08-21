import * as Static from '../../src/renderers/static'
import * as Graph from '../../src'


// try { document.createElement('canvas').getContext('webgl'); console.log('browser supports webgl') } catch (err) { console.warn(err) }


const sampleCoordinatePlane = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample) * step
  let i = 0

  for (let x = -(side / 2); x < (side / 2); x += step) {
    for (let y = -(side / 2); y < (side / 2); y += step) {
      if (i >= count) {
        return
      }

      if (Math.random() > sample) {
        i++
        yield [x, y]
      }
    }
  }
}


const nodes: Graph.Node[] = []
const edges: Graph.Edge[] = []


const step = 50
const coordinates: Record<number, Set<number>> = {}
for (const [x, y] of sampleCoordinatePlane(100000, step, 0.5)) {
  nodes.push({ id: `${x}|${y}`, x, y, radius: 10 })

  if (coordinates[x] === undefined) {
    coordinates[x] = new Set()
  }
  coordinates[x].add(y)

  for (const adjacentX of [x - step, x]) {
    for (const adjacentY of [y - step, y, y + step]) {
      if (coordinates[adjacentX]?.has(adjacentY) && !(adjacentX === x && adjacentY === y)) {
        edges.push({ id: `${x}|${y}|${adjacentX}|${adjacentY}`, source: `${x}|${y}`, target: `${adjacentX}|${adjacentY}` })
      }
    }
  }
}


const container = document.querySelector('#graph') as HTMLDivElement
const options = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.05,
  width: 1800,
  height: 1200,
  onViewportDrag: ({ dx, dy }) => {
    options.x += dx
    options.y += dy
    render.update({ options })
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x += dx
    options.y += dy
    options.zoom += dz
    render.update({ options })
  },
}
const render = new Static.StaticRenderer({ container, nodes, edges, options, debug: true })
;(window as any).render = render
