import * as WebGL from '../webgl'
import { Node, Edge } from '../../'


export type TextIcon = WebGL.TextIcon

export type ImageIcon = WebGL.ImageIcon

export type NodeStyle = WebGL.NodeStyle

export type EdgeStyle = WebGL.EdgeStyle

export type Options = {
  width?: number
  height?: number
  x?: number
  y?: number
  zoom?: number
  scale?: number
}


export const Renderer = <N extends Node, E extends Edge>() => {
  const pixiRenderer = new WebGL.InternalRenderer({ container: document.createElement('div') })

  const render = (graph: { nodes: N[], edges: E[], options?: Options }) => {
    pixiRenderer.update({ ...graph, options: { ...graph.options, animateGraph: false, animateViewport: false } })
    return pixiRenderer.base64(graph.options?.scale)
  }

  render.delete = pixiRenderer.delete

  return render
}
