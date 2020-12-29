import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { CircleAnnotation, Node, Edge } from '../../..'
import { colorToNumber } from '../utils'


export class CircleAnnotationRenderer<N extends Node, E extends Edge>{

  private circle: CircleAnnotation
  private renderer: InternalRenderer<N, E>
  private circleGraphic = new PIXI.Graphics()

  constructor(renderer: InternalRenderer<N, E>, circle: CircleAnnotation) {
    this.renderer = renderer
    this.circle = circle

    this.renderer.annotationsBottomLayer.addChild(this.circleGraphic)
    this.update(circle)
  }

  update(circle: CircleAnnotation) {
    this.circle = circle

    this.circleGraphic
      .clear()
      .beginFill(colorToNumber(this.circle.style.color))
      .lineStyle(this.circle.style.stroke.width, colorToNumber(this.circle.style.stroke.color))
      .drawCircle(this.circle.x, this.circle.y, this.circle.radius)
      .endFill()
    return this
  }

  delete() {
    this.circleGraphic.destroy()
  }
}
