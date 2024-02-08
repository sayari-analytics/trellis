import * as WebGL from '../webgl'
import { Node, Edge, Annotation } from '../../types'

export type Options = {
  width: number
  height: number
  x?: number
  y?: number
  zoom?: number
  resolution?: number
  mimetype?: string
}

export const Renderer = <N extends Node, E extends Edge>() => {
  return (graph: { nodes: N[]; edges: E[]; annotations?: Annotation[]; options: Options }) => {
    const container = document.createElement('div')

    const renderer = new WebGL.Renderer({ container, width: graph.options.width, height: graph.options.height })

    return renderer
      .update({
        nodes: graph.nodes,
        edges: graph.edges,
        options: {
          ...graph.options,
          animateNodePosition: false,
          animateNodeRadius: false,
          animateViewport: false
        }
      })
      .image()
      .then((blob) => {
        renderer.delete()
        return blob
      })
  }
}
