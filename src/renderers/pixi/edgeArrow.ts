import * as PIXI from 'pixi.js'
import { PIXIRenderer as Renderer } from '.'
import { Node, Edge } from '../../types'


export class EdgeArrowRenderer<N extends Node, E extends Edge>{

  static ARROW_HEIGHT = 16
  static ARROW_WIDTH = 8

  texture: PIXI.RenderTexture

  constructor(renderer: Renderer<N, E>) {
    this.texture = renderer.app.renderer.generateTexture(
      new PIXI.Graphics()
        .beginFill(0xffffff)
        .lineTo(EdgeArrowRenderer.ARROW_HEIGHT * 2, EdgeArrowRenderer.ARROW_WIDTH)
        .lineTo(EdgeArrowRenderer.ARROW_HEIGHT * 2, - EdgeArrowRenderer.ARROW_WIDTH),
      PIXI.SCALE_MODES.LINEAR,
      window.devicePixelRatio
    )
  }

  createSprite() {
    const sprite = new PIXI.Sprite(this.texture)
    sprite.anchor.set(0, 0.5)
    sprite.scale.set(0.5)

    return sprite
  }
}
