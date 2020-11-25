"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleSprite = void 0;
var PIXI = __importStar(require("pixi.js-legacy"));
var CircleSprite = /** @class */ (function () {
    function CircleSprite(renderer) {
        this.texture = renderer.app.renderer.generateTexture(new PIXI.Graphics()
            .beginFill(0xffffff)
            .drawCircle(0, 0, CircleSprite.radius), PIXI.SCALE_MODES.LINEAR, 2);
    }
    CircleSprite.prototype.create = function () {
        var sprite = new PIXI.Sprite(this.texture);
        sprite.anchor.set(0.5);
        return sprite;
    };
    CircleSprite.prototype.delete = function () {
        this.texture.destroy();
    };
    CircleSprite.radius = 500;
    return CircleSprite;
}());
exports.CircleSprite = CircleSprite;
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
//# sourceMappingURL=circleSprite.js.map