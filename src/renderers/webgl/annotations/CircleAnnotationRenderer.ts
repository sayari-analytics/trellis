/* eslint-disable @typescript-eslint/no-unused-vars */
import { Renderer } from '..'
import { CircleAnnotation } from '../../../types'

export default class CircleAnnotationRenderer {
  annotation: CircleAnnotation

  private x = 0
  private y = 0
  private radius = 0

  constructor(
    private renderer: Renderer,
    annotation: CircleAnnotation
  ) {
    this.renderer = renderer
    this.annotation = annotation
    this.resize(annotation.radius).moveTo(annotation.x, annotation.y)
  }

  update(annotation: CircleAnnotation) {
    this.annotation = annotation
    return this
  }

  resize(radius: number) {
    this.radius = radius
    return this
  }

  moveTo(x: number, y: number) {
    this.x = x
    this.y = y
    return this
  }

  render(dt: number) {
    return this
  }

  delete() {
    return undefined
  }

  private visible() {
    return false
  }
}
