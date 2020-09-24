import * as PIXI from 'pixi.js'
import { PIXIRenderer as Renderer } from '.'
import { Node, Edge } from '../../types'


export class CircleRenderer<N extends Node, E extends Edge>{

  texture: PIXI.RenderTexture

  constructor(renderer: Renderer<N, E>) {
    this.texture = renderer.app.renderer.generateTexture(
      new PIXI.Graphics()
        .beginFill(0xffffff)
        .drawCircle(0, 0, 1000),
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
