import { Application, Renderer, Container, Matrix, RenderTexture, IBaseTextureOptions, MSAA_QUALITY, SCALE_MODES } from 'pixi.js'
import { DEFAULT_RESOLUTION } from './constants'
import { Node, PointTuple } from '../types'

export const logUnknownEdgeError = (source: Node | undefined, target: Node | undefined) => {
  if (source === undefined && target === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Error: Cannot render edge between unknown nodes ${source} and ${target}`)
  } else if (source === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Error: Cannot render edge from unknown node ${source}`)
  } else if (target === undefined) {
    // eslint-disable-next-line no-console
    console.error(`Error: Cannot render edge to unknown node ${target}`)
  }
}

export const movePoint = (x: number, y: number, angle: number, distance: number): PointTuple => [
  x + Math.cos(angle) * distance,
  y + Math.sin(angle) * distance
]

export const midPoint = (x0: number, y0: number, x1: number, y1: number): PointTuple => [(x0 + x1) / 2, (y0 + y1) / 2]

export const length = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0)

export const createRenderTexture = <A extends Application, G extends Container>(
  app: A,
  graphic: G,
  transform = new Matrix(),
  options: IBaseTextureOptions = {}
) => {
  const renderTexture = RenderTexture.create({
    width: graphic.width,
    height: graphic.height,
    resolution: DEFAULT_RESOLUTION,
    multisample: MSAA_QUALITY.HIGH,
    scaleMode: SCALE_MODES.LINEAR,
    ...options
  })

  app.renderer.render(graphic, { renderTexture, transform })

  if (app.renderer instanceof Renderer) {
    app.renderer.framebuffer.blit()
  }

  graphic.destroy(true)

  return renderTexture
}
