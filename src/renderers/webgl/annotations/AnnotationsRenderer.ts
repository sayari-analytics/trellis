import { Renderer } from '..'
import { Annotation } from '../../../types'
import CircleAnnotationRenderer from './CircleAnnotationRenderer'
import LineAnnotationRenderer from './LineAnnotationRenderer'
import RectangleAnnotationRenderer from './RectangleAnnotationRenderer'

type AnnotationRendererLookup = Record<string, CircleAnnotationRenderer | RectangleAnnotationRenderer | LineAnnotationRenderer>

export default class AnnotationsRenderer {
  private annotations: Annotation[] = []
  private lookup: AnnotationRendererLookup = {}

  constructor(private renderer: Renderer) {
    this.renderer = renderer
  }

  update(annotations: Annotation[] = []) {
    if (this.annotations === annotations || (this.annotations.length === 0 && annotations.length === 0)) {
      return this
    }

    const lookup: AnnotationRendererLookup = {}

    for (const annotation of annotations) {
      const renderer = this.lookup[annotation.id]

      if (annotation.type === 'circle' && renderer instanceof CircleAnnotationRenderer) {
        renderer.update(annotation)
      } else if (annotation.type === 'circle') {
        renderer?.delete()
        lookup[annotation.id] = new CircleAnnotationRenderer(this.renderer, annotation)
      } else if (annotation.type === 'rectangle' && renderer instanceof RectangleAnnotationRenderer) {
        renderer.update(annotation)
      } else if (annotation.type === 'rectangle') {
        renderer?.delete()
        lookup[annotation.id] = new RectangleAnnotationRenderer(this.renderer, annotation)
      } else if (annotation.type === 'line' && renderer instanceof LineAnnotationRenderer) {
        renderer.update(annotation)
      } else if (annotation.type === 'line') {
        renderer?.delete()
        lookup[annotation.id] = new LineAnnotationRenderer(this.renderer, annotation)
      }
    }

    for (const annotation of this.annotations) {
      if (lookup[annotation.id] === undefined && this.lookup[annotation.id]) {
        // exit
        this.lookup[annotation.id].delete()
      }
    }

    this.lookup = lookup
    this.annotations = annotations

    return this
  }

  render(dt: number) {
    for (const id in this.lookup) {
      this.lookup[id].render(dt)
    }

    return this
  }
}
