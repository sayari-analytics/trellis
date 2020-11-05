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
exports.ImageSprite = void 0;
var PIXI = __importStar(require("pixi.js"));
var ImageSprite = /** @class */ (function () {
    function ImageSprite() {
        this.cache = {};
    }
    ImageSprite.prototype.create = function (url, scale, offsetX, offsetY) {
        if (scale === void 0) { scale = 1; }
        if (offsetX === void 0) { offsetX = 0; }
        if (offsetY === void 0) { offsetY = 0; }
        if (this.cache[url] === undefined) {
            this.cache[url] = PIXI.Sprite.from(url).texture;
        }
        var sprite = new PIXI.Sprite(this.cache[url]);
        sprite.position.set(offsetX, offsetY);
        sprite.anchor.set(0.5);
        sprite.scale.set(scale);
        return sprite;
    };
    ImageSprite.prototype.delete = function () {
        Object.values(this.cache).forEach(function (texture) { return texture.destroy(); });
        this.cache = {};
    };
    return ImageSprite;
}());
exports.ImageSprite = ImageSprite;
//# sourceMappingURL=ImageSprite.js.map