import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { RectangleAnnotation } from '../../..'
import { colorToNumber } from '../utils'


export class RectangleAnnotationRenderer {

  private rectangle: RectangleAnnotation
  private renderer: InternalRenderer<any, any>
  private rectangleGraphic = new PIXI.Graphics()

  constructor(renderer: InternalRenderer<any, any>, rectangle: RectangleAnnotation) {
    this.renderer = renderer
    this.rectangle = rectangle

    this.renderer.annotationsBottomLayer.addChild(this.rectangleGraphic)
    this.update(rectangle)
  }

  update(rectangle: RectangleAnnotation) {
    this.rectangle = rectangle

    this.rectangleGraphic
      .clear()
      .beginFill(colorToNumber(this.rectangle.style.color))
      .lineStyle(this.rectangle.style.stroke.width, colorToNumber(this.rectangle.style.stroke.color))
      .drawRect(this.rectangle.x, this.rectangle.y, this.rectangle.width, this.rectangle.height)
      .endFill()

    return this
  }

  delete() {
    this.rectangleGraphic.destroy()
  }
}


// export const RectangleAnnotationRenderer: AnnotationRendererConstructor<RectangleAnnotation> = (renderer: InternalRenderer<any, any>, annotation: RectangleAnnotation) => {
//   return new RectangleAnnotationRenderer(renderer, annotation)
// }
