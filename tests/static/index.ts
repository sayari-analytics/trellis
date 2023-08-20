import * as Static from '../../src/renderers/static'


// try { document.createElement('canvas').getContext('webgl'); console.log('browser supports webgl') } catch (err) { console.warn(err) }
const container = document.querySelector('#graph') as HTMLDivElement
const options = {
  x: 200,
  y: 0,
  zoom: 2,
  width: 1200,
  height: 1000,
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
const render = new Static.StaticRenderer({ container, debug: true, options })
