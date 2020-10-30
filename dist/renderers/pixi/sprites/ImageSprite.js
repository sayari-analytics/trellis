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
    ImageSprite.prototype.create = function (url, scale, offset) {
        var _a, _b, _c, _d;
        if (this.cache[url] === undefined) {
            var iconSprite = PIXI.Sprite.from(url);
            this.cache[url] = iconSprite.texture;
            iconSprite.name = 'icon';
            iconSprite.position.set((_a = offset === null || offset === void 0 ? void 0 : offset.x) !== null && _a !== void 0 ? _a : 0, (_b = offset === null || offset === void 0 ? void 0 : offset.y) !== null && _b !== void 0 ? _b : 0);
            iconSprite.anchor.set(0.5);
            iconSprite.scale.set(scale !== null && scale !== void 0 ? scale : 1);
            return iconSprite;
        }
        var sprite = new PIXI.Sprite(this.cache[url]);
        sprite.name = 'icon';
        sprite.position.set((_c = offset === null || offset === void 0 ? void 0 : offset.x) !== null && _c !== void 0 ? _c : 0, (_d = offset === null || offset === void 0 ? void 0 : offset.y) !== null && _d !== void 0 ? _d : 0);
        sprite.anchor.set(0.5);
        sprite.scale.set(scale !== null && scale !== void 0 ? scale : 1);
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