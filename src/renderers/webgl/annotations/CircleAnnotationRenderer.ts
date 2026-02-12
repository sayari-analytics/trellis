import { DEFAULT_ANIMATE_RESIZE, MIN_ANNOTATION_ZOOM, MIN_STROKE_ZOOM } from '../../../utils/constants'
import { CircleAnnotation, InterpolateFn } from '../../../types'
import { interpolate } from '../../../utils/helpers'
import { Renderer } from '..'
import CircleStrokes from '../objects/circle/CircleStrokes'
import Circle from '../objects/circle/Circle'
import Text from '../objects/text/Text'

export default class CircleAnnotationRenderer {
  annotation: CircleAnnotation

  private x = 0
  private y = 0
  private _radius = 0

  private fill: Circle
  private strokes?: CircleStrokes
  private text?: Text

  private interpolateX?: InterpolateFn
  private interpolateY?: InterpolateFn
  private interpolateRadius?: InterpolateFn

  constructor(
    private renderer: Renderer,
    annotation: CircleAnnotation
  ) {
    this.renderer = renderer
    this.fill = new Circle(renderer.annotationsContainer, renderer.circle, annotation.style)
    this.resize(annotation.radius).moveTo(annotation.x, annotation.y)
    this.annotation = annotation
  }

  update(annotation: CircleAnnotation) {
    this.annotation = annotation

    this.fill.update(annotation.style.color, annotation.style.opacity)
    this.strokes?.update(annotation.style.stroke)

    if (annotation.content && this.text) {
      this.text.update(annotation.content, annotation.style.text)
    } else if (!annotation.content && this.text) {
      this.text = this.managers.text.delete(this.text)
    }

    const x = annotation.x
    const y = annotation.y
    const radius = annotation.radius
    const xChanged = x !== this.x
    const yChanged = y !== this.y
    const radiusChanged = radius !== this._radius

    if (xChanged || yChanged || radiusChanged) {
      if (xChanged) {
        this.interpolateX = interpolate(this.x, x, DEFAULT_ANIMATE_RESIZE)
      }
      if (yChanged) {
        this.interpolateY = interpolate(this.y, y, DEFAULT_ANIMATE_RESIZE)
      }
      if (radiusChanged) {
        this.interpolateRadius = interpolate(this._radius, radius, DEFAULT_ANIMATE_RESIZE)
      }
    } else {
      this.resize(radius).moveTo(x, y)
      this.interpolateX = undefined
      this.interpolateY = undefined
      this.interpolateRadius = undefined
    }

    return this
  }

  render(dt: number) {
    if (this.interpolateRadius) {
      const { value, done } = this.interpolateRadius(dt)

      this.resize(value)

      if (done) {
        this.interpolateRadius = undefined
      }
    }

    if (this.interpolateX || this.interpolateY) {
      let x = this.x
      let y = this.y

      if (this.interpolateX) {
        const { value, done } = this.interpolateX(dt)
        x = value

        if (done) {
          this.interpolateX = undefined
        }
      }

      if (this.interpolateY) {
        const { value, done } = this.interpolateY(dt)
        y = value

        if (done) {
          this.interpolateY = undefined
        }
      }

      this.moveTo(x, y)
    }

    const isVisible = this.visible()

    if (isVisible && this.annotation.content && !this.text) {
      this.text = new Text(
        this.renderer.assets,
        this.renderer.annotationsContainer,
        this.annotation.content,
        this.annotation.style.text
      ).moveTo(this.x, this.y)
    }

    const fillMounted = this.managers.annotations.isMounted(this.fill)

    if (isVisible && !fillMounted) {
      this.managers.annotations.mount(this.fill)
    } else if (!isVisible && fillMounted) {
      this.managers.annotations.unmount(this.fill)
    }

    const shouldStrokesMount = isVisible && this.renderer.zoom > MIN_STROKE_ZOOM
    if (shouldStrokesMount && !this.strokes && this.annotation.style.stroke) {
      this.strokes = new CircleStrokes(
        this.renderer.annotationsContainer,
        this.renderer.circle,
        this.fill,
        this.annotation.style.stroke
      ).moveTo(this.x, this.y)
    }

    if (this.strokes) {
      const strokesMounted = this.managers.annotations.isMounted(this.strokes)

      if (shouldStrokesMount && !strokesMounted) {
        this.managers.annotations.mount(this.strokes)
      } else if (!shouldStrokesMount && strokesMounted) {
        this.managers.annotations.unmount(this.strokes)
      }
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

    if (this.strokes) {
      this.strokes = this.managers.annotations.delete(this.strokes)
    }

    if (this.text) {
      this.text = this.managers.text.delete(this.text)
    }
    return undefined
  }

  private get radius() {
    return this.strokes?.radius ?? this._radius
  }

  private get managers() {
    return this.renderer.managers
  }

  private resize(radius: number) {
    if (radius !== this._radius) {
      this._radius = radius
      this.fill.resize(radius)
      this.strokes?.resize(radius)
    }

    return this
  }

  private moveTo(x: number, y: number) {
    if (x !== this.x || y !== this.y) {
      this.x = x
      this.y = y
      this.fill.moveTo(x, y)
      this.strokes?.moveTo(x, y)
      this.text?.moveTo(x, y)
    }

    return this
  }

  private visible() {
    const [left, right, top, bottom] = [this.x - this.radius, this.x + this.radius, this.y - this.radius, this.y + this.radius]

    return (
      this.renderer.zoom > MIN_ANNOTATION_ZOOM &&
      right >= this.renderer.minX &&
      left <= this.renderer.maxX &&
      bottom >= this.renderer.minY &&
      top <= this.renderer.maxY
    )
  }
}
