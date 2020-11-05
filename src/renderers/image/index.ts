import * as WebGL from '../pixi'
import { Node, Edge } from '../../'


export type TextIcon = WebGL.TextIcon

export type ImageIcon = WebGL.ImageIcon

export type NodeStyle = WebGL.NodeStyle

export type EdgeStyle = WebGL.EdgeStyle

export type Options = {
  width: number
  height: number
  x: number
  y: number
  zoom: number
}


export const Renderer = <N extends Node, E extends Edge>() => {
  const pixiRenderer = new WebGL.PIXIRenderer({ container: document.createElement('div'), preserveDrawingBuffer: true })

  const render = (graph: { nodes: N[], edges: E[], options?: Partial<Options> }) => {
    pixiRenderer.update({ ...graph, options: { ...graph.options, animate: false } })
    return pixiRenderer.base64()
  }

  render.delete = pixiRenderer.delete

  return render
}
