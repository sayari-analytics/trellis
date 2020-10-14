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
exports.CircleRenderer = void 0;
var PIXI = __importStar(require("pixi.js"));
var CircleRenderer = /** @class */ (function () {
    function CircleRenderer(renderer) {
        this.texture = renderer.app.renderer.generateTexture(new PIXI.Graphics()
            .beginFill(0xffffff)
            .drawCircle(0, 0, 1000), PIXI.SCALE_MODES.LINEAR, 2);
    }
    CircleRenderer.prototype.create = function () {
        var sprite = new PIXI.Sprite(this.texture);
        sprite.anchor.set(0.5);
        return sprite;
    };
    CircleRenderer.prototype.delete = function () {
        this.texture.destroy();
    };
    return CircleRenderer;
}());
exports.CircleRenderer = CircleRenderer;
//# sourceMappingURL=circle.js.map