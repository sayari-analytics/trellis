import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { CircleAnnotation } from '../../..'
import { colorToNumber } from '../utils'


export class CircleAnnotationRenderer {

  private circle: CircleAnnotation
  private renderer: InternalRenderer<any, any>
  private circleGraphic = new PIXI.Graphics()

  constructor(renderer: InternalRenderer<any, any>, circle: CircleAnnotation) {
    this.renderer = renderer
    this.circle = circle

    this.renderer.annotationsBottomLayer.addChild(this.circleGraphic)
    this.update(circle)
  }

  update(circle: CircleAnnotation) {
    this.circle = circle

    this.circleGraphic
      .clear()
      .beginFill(colorToNumber(this.circle.style.backgroundColor))
      .lineStyle(this.circle.style.stroke.width, colorToNumber(this.circle.style.stroke.color))
      .drawCircle(this.circle.x, this.circle.y, this.circle.radius)
      .endFill()

    return this
  }

  delete() {
    this.circleGraphic.destroy()
  }
}


// export const CircleAnnotationRenderer: AnnotationRendererConstructor<CircleAnnotation> = (renderer: InternalRenderer<any, any>, annotation: CircleAnnotation) => {
//   return new InternalCircleAnnotationRenderer(renderer, annotation)
// }
