import { InternalRenderer, type RendererOptions } from './internal'
import type { Node, Edge, Annotation } from '../../api'

export const Renderer = (options: { container: HTMLDivElement; debug?: { logPerformance?: boolean; stats?: Stats } }) => {
  const pixiRenderer = new InternalRenderer(options)

  const render = <N extends Node, E extends Edge>(graph: {
    nodes: N[]
    edges: E[]
    options?: RendererOptions<N, E>
    annotations?: Annotation[]
  }) => {
    ;(pixiRenderer as unknown as InternalRenderer<N, E>).update(graph)
  }

  render.delete = pixiRenderer.delete

  return render
}

export type {
  RendererOptions,
  NodePointerEvent,
  NodeDragEvent,
  EdgePointerEvent,
  AnnotationPointerEvent,
  AnnotationResizeEvent,
  AnnotationDragEvent,
  AnnotationResizePointerEvent,
  ViewportPointerEvent,
  ViewportDragEvent,
  ViewportDragDecelerateEvent,
  ViewportWheelEvent
} from './internal'
