import * as Renderer from '@trellis/renderers/webgl'
import * as Graph from '@trellis/index'

const WHITE = '#FFF'
const GREEN = '#91AD49'
const GREEN_LIGHT = '#C6D336'
const DARK_GREEN = '#607330'

const edges: Graph.Edge[] = []
const nodes: Graph.Node[] = []
const annotations: Graph.Annotation[] = [
  {
    id: 'rect-anno-0',
    type: 'rectangle',
    width: 200,
    height: 200,
    x: -100,
    y: -100,
    style: { color: GREEN }
  },
  {
    id: 'rect-anno-2',
    type: 'rectangle',
    width: 200,
    height: 200,
    x: 0,
    y: -100,
    style: {
      color: GREEN_LIGHT
    }
  },
  {
    id: 'rect-anno-3',
    type: 'rectangle',
    width: 200,
    height: 200,
    x: -100,
    y: 0,
    style: {
      color: GREEN_LIGHT
    }
  },
  {
    id: 'rect-anno-4',
    type: 'rectangle',
    width: 200,
    height: 200,
    x: 0,
    y: 0,
    style: {
      color: GREEN
    }
  },
  {
    id: 'text-anno-2',
    type: 'rectangle',
    content: 'Hello, World!',
    width: 200,
    height: 100,
    x: -300,
    y: -200,
    style: {
      color: DARK_GREEN,
      stroke: [
        { width: 1, color: WHITE },
        { width: 2, color: GREEN_LIGHT }
      ],
      text: {
        fontSize: 14,
        fontWeight: '400',
        color: WHITE
      }
    }
  },
  {
    id: 'circle-anno-0',
    type: 'circle',
    radius: 50,
    x: 250,
    y: 250,
    style: {
      color: GREEN,
      stroke: [
        { width: 1, color: WHITE },
        { width: 2, color: GREEN_LIGHT }
      ]
    }
  },
  {
    id: 'circle-anno-1',
    type: 'circle',
    radius: 50,
    content: 'CIRCLE!',
    x: -250,
    y: 250,
    style: {
      color: GREEN,
      stroke: [
        { width: 1, color: WHITE },
        { width: 2, color: GREEN_LIGHT }
      ],
      text: {
        fontSize: 14,
        fontWeight: '400',
        color: WHITE,
        highlight: {
          color: DARK_GREEN,
          padding: 0
        }
      }
    }
  },
  {
    id: 'line-anno-0',
    type: 'line',
    points: [
      { x: 0, y: -400 },
      { x: 0, y: 400 }
    ],
    style: {
      color: DARK_GREEN,
      width: 2
    }
  },
  {
    id: 'line-anno-1',
    type: 'line',
    content: 'LINE!',
    points: [
      { x: -400, y: 0 },
      { x: 400, y: 0 }
    ],
    style: {
      color: GREEN_LIGHT,
      width: 2
    }
  }
]

const container = document.querySelector('#graph') as HTMLDivElement

const options: Renderer.Options = {
  width: 1250,
  height: 650,
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.025,
  onViewportDrag: (event: Renderer.ViewportDragEvent | Renderer.ViewportDragDecelerateEvent) => {
    // console.log('viewport drag', `x: ${event.dx}, y: ${event.dy}`)
    options.x! += event.dx
    options.y! += event.dy
    renderer.update({ nodes, edges, annotations, options })
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x! += dx
    options.y! += dy
    options.zoom! += dz
    renderer.update({ nodes, edges, annotations, options })
  }
}

const renderer = new Renderer.Renderer({ container, width: options.width, height: options.height, debug: true }).update({
  nodes,
  edges,
  annotations,
  options
})
;(window as any).renderer = renderer
