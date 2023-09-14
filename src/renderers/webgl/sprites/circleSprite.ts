import * as PIXI from 'pixi.js-legacy'
import { InternalRenderer } from '..'
import { Node, Edge } from '../../../trellis'

export class CircleSprite<N extends Node, E extends Edge> {
  static radius = 500

  private texture: PIXI.RenderTexture

  constructor(renderer: InternalRenderer<N, E>) {
    this.texture = renderer.app.renderer.generateTexture(
      new PIXI.Graphics().beginFill(0xffffff).drawCircle(0, 0, CircleSprite.radius),
      PIXI.SCALE_MODES.LINEAR,
      2
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

/**
 * TODO - generate circle sprites on the fly scaled to the max scale they can be rendered at
 */
// export class CircleSprite extends PIXI.Sprite {
//   private _maxRadius: number

//   constructor(texture: PIXI.Texture, maxRadius: number) {
//     super(texture)
//     this._maxRadius = maxRadius
//   }

//   scaleToRadius(radius: number) {
//     this.scale.set(radius / this._maxRadius)
//   }
// }

// export class CircleSpriteFactory<N extends Node, E extends Edge> {

//   private textures: { [radius: number]: PIXI.Texture } = {}
//   private renderer: Renderer<N, E>

//   constructor(renderer: Renderer<N, E>) {
//     this.renderer = renderer
//   }

//   create(radius: number, maxZoom: number) {
//     const maxRadius = Math.ceil((radius * maxZoom) / 10) * 10

//     if (this.textures[maxRadius] === undefined) {
//       this.textures[maxRadius] = this.renderer.app.renderer.generateTexture(
//         new PIXI.Graphics()
//           .beginFill(0xffffff)
//           .drawCircle(0, 0, maxRadius),
//         PIXI.SCALE_MODES.LINEAR,
//         2,
//       )
//     }

//     const sprite = new CircleSprite(this.textures[maxRadius], maxRadius)
//     sprite.anchor.set(0.5)

//     return sprite
//   }

//   delete() {
//     for (const texture of Object.values(this.textures)) {
//       texture.destroy()
//     }
//   }
// }
