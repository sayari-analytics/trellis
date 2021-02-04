const trellis = window.trellis
const container = document.querySelector('#graph')

const force = trellis.layout.Force.Layout()
const hierarchy = trellis.layout.Hierarchy.Layout()

const render = trellis.renderers.WebGL.Renderer({ container })

const width = document.querySelector('#graph-container').getBoundingClientRect().width
const height = document.querySelector('#graph-container').getBoundingClientRect().height

let pages = ['simple', 'hierarchy']
let page = 0

let data = window.trellisData

setInterval(() => {
  if (page === pages.length - 1) page = 0
  else page++
  App(pages[page])
}, 10000)

function App (selected) {
  if (selected === 'hierarchy') {
    data = hierarchy('jeff.skilling@enron.com', { nodes: data.nodes, edges: data.edges })

    const { x, y, zoom } = trellis.boundsToViewport(
      trellis.getSelectionBounds(data.nodes, 40),
      { width, height }
    )

    let options = {
      x,
      y,
      zoom,
      width,
      height,
      onViewportDrag: function ({ viewportX, viewportY }) {
        options.x = viewportX
        options.y = viewportY
        render({ nodes: data.nodes, edges: data.edges, options })
      },
      onViewportWheel: function ({ viewportX, viewportY, viewportZoom }) {
        options.x = viewportX
        options.y = viewportY
        options.zoom = viewportZoom
        render({ nodes: data.nodes, edges: data.edges, options })
      },
      onNodePointerUp: ({ target: { id } }) => {
        data = hierarchy(id, { nodes: data.nodes, edges: data.edges })
        const { x, y, zoom } = trellis.boundsToViewport(
          trellis.getSelectionBounds(data.nodes, 40),
          { width, height }
        )
        options.x = x
        options.y = y
        options.zoom = zoom
        render({ nodes: data.nodes, edges: data.edges, options })
      }
    }

    render({ nodes: data.nodes, edges: data.edges, options })
  } else {
    force({ nodes: data.nodes, edges: data.edges }).then(({ nodes, edges }) => {
      const { x, y, zoom } = trellis.boundsToViewport(
        trellis.getSelectionBounds(nodes, 40),
        { width, height }
      )

      const options = {
        x,
        y,
        zoom,
        width,
        height,
        onViewportDrag: function ({ viewportX, viewportY }) {
          options.x = viewportX
          options.y = viewportY
          render({ nodes, edges, options })
        },
        onViewportWheel: function ({ viewportX, viewportY, viewportZoom }) {
          options.x = viewportX
          options.y = viewportY
          options.zoom = viewportZoom
          render({ nodes, edges, options })
        },
      }

      render({ nodes, edges, options })
    })
  }
}

App(pages[page])