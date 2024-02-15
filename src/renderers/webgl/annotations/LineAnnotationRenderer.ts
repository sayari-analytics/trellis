import { PointTuple, LineAnnotation, Coordinates, LinePoints } from '../../../types'
import { DEFAULT_LABEL_STYLE, MIN_ANNOTATION_ZOOM, MIN_STROKE_ZOOM } from '../../../utils/constants'
import { angle, distance } from '../../../utils/api'
import { midPoint } from '../../../utils/webgl'
import { Renderer } from '..'
import LineSegment from '../objects/line/LineSegment'
import LineStrokes from '../objects/line/LineStrokes'
import Text from '../objects/text/Text'

export default class LineAnnotationRenderer {
  annotation: LineAnnotation

  private _points: LinePoints = [0, 0, 0, 0]
  private center: PointTuple = [0, 0]
  private length = 0
  private theta = 0

  private fill: LineSegment
  private strokes: LineStrokes
  private text?: Text

  constructor(
    private renderer: Renderer,
    annotation: LineAnnotation
  ) {
    this.renderer = renderer
    this.fill = new LineSegment(renderer.annotationsContainer, annotation.style)
    this.strokes = new LineStrokes(renderer.annotationsContainer, this.fill, annotation.style.stroke)
    this.annotation = annotation
    this.setPoints(annotation.points)
  }

  update(annotation: LineAnnotation) {
    this.annotation = annotation

    this.fill.update(annotation.style.color, annotation.style.width, annotation.style.opacity)
    this.strokes.update(annotation.style.stroke)

    if (this.text) {
      if (annotation.content) {
        this.text.update(annotation.content, annotation.style.text)
      } else {
        this.text = this.managers.text.delete(this.text)
      }
    }

    if (
      this._points[0] !== annotation.points[0].x ||
      this._points[1] !== annotation.points[0].y ||
      this._points[2] !== annotation.points[1].x ||
      this._points[3] !== annotation.points[1].y
    ) {
      this.setPoints(annotation.points)
    }

    return this
  }

  render() {
    const isVisible = this.visible()

    if (isVisible && this.annotation.content && !this.text) {
      this.text = new Text(
        this.renderer.assets,
        this.renderer.annotationsContainer,
        this.annotation.content,
        this.annotation.style.text,
        DEFAULT_LABEL_STYLE
      )
      this.text.offset = this.width
      this.text.rotate(this.theta).moveTo(...this.center)
    }

    const fillMounted = this.managers.annotations.isMounted(this.fill)

    if (isVisible && !fillMounted) {
      this.managers.annotations.mount(this.fill)
    } else if (!isVisible && fillMounted) {
      this.managers.annotations.unmount(this.fill)
    }

    const shouldStrokesMount = isVisible && this.renderer.zoom > MIN_STROKE_ZOOM
    const strokesMounted = this.managers.annotations.isMounted(this.strokes)

    if (shouldStrokesMount && !strokesMounted) {
      this.managers.annotations.mount(this.strokes)
    } else if (!shouldStrokesMount && strokesMounted) {
      this.managers.annotations.unmount(this.strokes)
    }

    if (this.text) {
      const textMounted = this.managers.text.isMounted(this.text)

      if (isVisible && !textMounted) {
        this.managers.text.mount(this.text)
      } else if (!isVisible && textMounted) {
        this.managers.text.unmount(this.text)
      }
    }

    return this
  }

  delete() {
    this.managers.annotations.delete(this.fill)
    this.managers.annotations.delete(this.strokes)
    if (this.text) {
      this.managers.text.delete(this.text)
      this.text = undefined
    }
  }

  get x() {
    return this._points[0]
  }

  get y() {
    return this._points[1]
  }

  get width() {
    return this.strokes.width
  }

  private setPoints([a, b]: [Coordinates, Coordinates]) {
    const points = a.x > b.x ? [a, b] : [b, a]
    this._points = [points[0].x, points[0].y, points[1].x, points[1].y]
    this.theta = angle(...this._points)
    this.center = midPoint(...this._points)
    this.length = distance(...this._points)

    this.fill.rotate(this.theta).resize(this.length).moveTo(this.x, this.y)
    this.strokes.rotate(this.theta).resize(this.length).moveTo(this.x, this.y)

    if (this.text) {
      this.text.offset = this.width
      this.text.rotate(this.theta).moveTo(...this.center)
    }

    return this
  }

  private visible() {
    const [x0, y0, x1, y1] = this._points
    const [minX, minY, maxX, maxY] = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]
    return (
      this.renderer.zoom > MIN_ANNOTATION_ZOOM &&
      maxX >= this.renderer.minX &&
      minX <= this.renderer.maxX &&
      maxY >= this.renderer.minY &&
      minY <= this.renderer.maxY
    )
  }

  private get managers() {
    return this.renderer.managers
  }
}
