import * as PIXI from 'pixi.js'
import { PIXIRenderer as Renderer } from '../'
import { Node, Edge } from '../../../'


export class CircleSprite<N extends Node, E extends Edge> {

  static radius = 500

  private texture: PIXI.RenderTexture

  constructor(renderer: Renderer<N, E>) {
    this.texture = renderer.app.renderer.generateTexture(
      new PIXI.Graphics()
        .beginFill(0xffffff)
        .drawCircle(0, 0, CircleSprite.radius),
      PIXI.SCALE_MODES.LINEAR,
      2,
    )
  }

  create() {
    const sprite = new PIXI.Sprite(this.texture)
    sprite.anchor.set(0.5)

    return sprite
  }

  delete() {
    this.texture.destroy()
  }
}
