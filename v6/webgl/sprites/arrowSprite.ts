import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { Node, Edge } from '../../../src'

export class ArrowSprite<N extends Node, E extends Edge> {
  static ARROW_HEIGHT = 12
  static ARROW_WIDTH = 6

  texture: PIXI.RenderTexture

  constructor(renderer: InternalRenderer<N, E>) {
    this.texture = renderer.app.renderer.generateTexture(
      new PIXI.Graphics()
        .beginFill(0xffffff)
        .lineTo(ArrowSprite.ARROW_HEIGHT * 2, ArrowSprite.ARROW_WIDTH)
        .lineTo(ArrowSprite.ARROW_HEIGHT * 2, -ArrowSprite.ARROW_WIDTH),
      PIXI.SCALE_MODES.LINEAR,
      2 // window.devicePixelRatio,
    )
  }

  create() {
    const sprite = new PIXI.Sprite(this.texture)
    sprite.anchor.set(0, 0.5)
    sprite.scale.set(0.5)

    return sprite
  }

  delete() {
    this.texture.destroy()
  }
}
