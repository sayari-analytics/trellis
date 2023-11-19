import { Renderer } from './../webgl'
import { Node, Edge, Annotation } from './../types'

export type ImageOptions = {
  width: number
  height: number
  x?: number
  y?: number
  zoom?: number
  resolution?: number
  mimetype?: string
}

export const Image = {
  Renderer: () => {
    return <N extends Node, E extends Edge>(graph: { nodes: N[]; edges: E[]; annotations?: Annotation[]; options: ImageOptions }) => {
      const container = document.createElement('div')

      const renderer = new Renderer({ container, width: graph.options.width, height: graph.options.height })

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
}

export default Image
