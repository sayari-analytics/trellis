import * as Static from '../../src/renderers/static'


// try { document.createElement('canvas').getContext('webgl'); console.log('browser supports webgl') } catch (err) { console.warn(err) }
const container = document.querySelector('#graph') as HTMLDivElement
const options: Static.Options = {
  x: 0,
  y: 0,
  zoom: 1,
  width: 1400,
  height: 1200,
  onViewportDrag: (event) => {
    options.x += event.dx
    options.y += event.dy
    render.update({ options })
  },
  onViewportWheel: ({ dx, dy, dz }) => {
    options.x += dx
    options.y += dy
    options.zoom += dz
    render.update({ options })
  },
}
const render = new Static.StaticRenderer({ container, debug: true, options })
