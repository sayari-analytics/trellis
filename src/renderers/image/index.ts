import { Node, Edge, Annotation } from '../../api'
import { InternalRenderer } from '../webgl/internal'

export type ImageOptions = {
  width?: number
  height?: number
  x?: number
  y?: number
  zoom?: number
  resolution?: number
  mimetype?: string
}

export const ImageRenderer = <N extends Node, E extends Edge>() => {
  return (graph: { nodes: N[]; edges: E[]; annotations?: Annotation[]; options?: ImageOptions }) => {
    const pixiRenderer = new InternalRenderer({
      container: document.createElement('div')
    })
    pixiRenderer.update({
      ...graph,
      options: {
        ...graph.options,
        animateNodePosition: false,
        animateNodeRadius: false,
        animateViewportPosition: false,
        animateViewportZoom: false
      }
    })

    return pixiRenderer.base64(graph.options?.resolution, graph.options?.mimetype).then((dataURL) => {
      pixiRenderer.delete()
      return dataURL
    })
  }
}

export const BlobRenderer = <N extends Node, E extends Edge>() => {
  return (graph: { nodes: N[]; edges: E[]; annotations?: Annotation[]; options?: Exclude<ImageOptions, 'mimetype'> }) => {
    const pixiRenderer = new InternalRenderer({
      container: document.createElement('div')
    })
    pixiRenderer.update({
      ...graph,
      options: {
        ...graph.options,
        animateNodePosition: false,
        animateNodeRadius: false,
        animateViewportPosition: false,
        animateViewportZoom: false
      }
    })

    return pixiRenderer.blob(graph.options?.resolution).then((dataURL) => {
      pixiRenderer.delete()
      return dataURL
    })
  }
}

export default ImageRenderer
