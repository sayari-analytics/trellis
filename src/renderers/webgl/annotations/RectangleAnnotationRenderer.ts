import { InterpolateFn, RectangleAnnotation, TextAnnotation } from '../../../types'
import { DEFAULT_ANIMATE_RESIZE, MIN_ANNOTATION_ZOOM, MIN_STROKE_ZOOM } from '../../../utils/constants'
import { interpolate } from '../../../utils/helpers'
import { Renderer } from '..'
import RectangleStrokes from '../objects/rectangle/RectangleStrokes'
import Rectangle from '../objects/rectangle/Rectangle'
import Text from '../objects/text/Text'

export default class RectangleAnnotationRenderer {
  annotation: TextAnnotation | RectangleAnnotation

  private x = 0
  private y = 0
  private width = 0
  private height = 0

  private fill: Rectangle
  private strokes: RectangleStrokes
  private text?: Text

  private interpolateX?: InterpolateFn
  private interpolateY?: InterpolateFn
  private interpolateWidth?: InterpolateFn
  private interpolateHeight?: InterpolateFn

  constructor(
    private renderer: Renderer,
    annotation: TextAnnotation | RectangleAnnotation
  ) {
    this.renderer = renderer
    this.fill = new Rectangle(renderer.annotationsContainer, renderer.rectangle, annotation.style)
    this.strokes = new RectangleStrokes(renderer.annotationsContainer, renderer.rectangle, this.fill, annotation.style.stroke)
    this.resize(annotation.width, annotation.height).moveTo(annotation.x, annotation.y)
    this.annotation = annotation
  }

  update(annotation: TextAnnotation | RectangleAnnotation) {
    this.annotation = annotation
    this.fill.update(annotation.style.color, annotation.style.opacity)
    this.strokes.update(annotation.style.stroke)

    if (annotation.type === 'text' && this.text) {
      this.text.update(annotation.content, annotation.style.text)
    } else if (annotation.type !== 'text' && this.text) {
      this.managers.text.delete(this.text)
      this.text = undefined
    }

    const x = annotation.x
    const y = annotation.y
    const width = annotation.width
    const height = annotation.height
    const xChanged = x !== this.x
    const yChanged = y !== this.y
    const widthChanged = width !== this.width
    const heightChanged = height !== this.height

    if (xChanged || yChanged || widthChanged || heightChanged) {
      // TODO -> enable in renderer options
      if (xChanged) {
        this.interpolateX = interpolate(this.x, x, DEFAULT_ANIMATE_RESIZE)
      }
      if (yChanged) {
        this.interpolateY = interpolate(this.y, y, DEFAULT_ANIMATE_RESIZE)
      }
      if (widthChanged) {
        this.interpolateWidth = interpolate(this.width, width, DEFAULT_ANIMATE_RESIZE)
      }
      if (heightChanged) {
        this.interpolateHeight = interpolate(this.height, height, DEFAULT_ANIMATE_RESIZE)
      }
    } else {
      this.resize(width, height).moveTo(x, y)
      this.interpolateX = undefined
      this.interpolateY = undefined
      this.interpolateWidth = undefined
      this.interpolateHeight = undefined
    }

    return this
  }

  render(dt: number) {
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

    if (this.interpolateWidth || this.interpolateHeight) {
      let width = this.width
      let height = this.height

      if (this.interpolateWidth) {
        const { value, done } = this.interpolateWidth(dt)
        width = value

        if (done) {
          this.interpolateWidth = undefined
        }
      }

      if (this.interpolateHeight) {
        const { value, done } = this.interpolateHeight(dt)
        height = value

        if (done) {
          this.interpolateHeight = undefined
        }
      }

      this.resize(width, height)
    }

    const isVisible = this.visible()

    if (isVisible && this.annotation.type === 'text' && !this.text) {
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

  resize(width: number, height: number) {
    if (this.width !== width || this.height !== height) {
      this.width = width
      this.height = height
      this.fill.resize({ width, height })
      this.strokes.resize({ width, height })
    }

    return this
  }

  moveTo(x: number, y: number) {
    if (x !== this.x || y !== this.y) {
      this.x = x
      this.y = y
      this.fill.moveTo(x, y)
      this.strokes.moveTo(x, y)
      this.text?.moveTo(x, y)
    }
    console.log('anno', this.x, this.y, this.x + this.width / 2, this.y + this.height / 2)
    return this
  }

  private visible() {
    const [left, right, top, bottom] = [this.x, this.x + this.width, this.y, this.y + this.height]
    return (
      this.renderer.zoom > MIN_ANNOTATION_ZOOM &&
      right >= this.renderer.minX &&
      left <= this.renderer.maxX &&
      bottom >= this.renderer.minY &&
      top <= this.renderer.maxY
    )
  }

  private get managers() {
    return this.renderer.managers
  }
}
