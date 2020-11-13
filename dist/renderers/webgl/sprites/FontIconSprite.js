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
exports.FontIconSprite = void 0;
var PIXI = __importStar(require("pixi.js"));
var FontIconSprite = /** @class */ (function () {
    function FontIconSprite() {
        this.cache = {};
    }
    FontIconSprite.prototype.create = function (text, fontFamily, fontSize, fontWeight, fill) {
        var icon = text + "-" + fontFamily + "-" + fontSize + "-" + fontWeight + "-" + fill;
        if (this.cache[icon] === undefined) {
            var textSprite = new PIXI.Text(text, {
                fontFamily: fontFamily,
                fontSize: fontSize * 4,
                fontWeight: fontWeight,
                fill: fill
            });
            textSprite.updateText(true);
            this.cache[icon] = textSprite.texture;
        }
        var sprite = new PIXI.Sprite(this.cache[icon]);
        sprite.position.set(0, 0);
        sprite.anchor.set(0.5);
        sprite.scale.set(0.25);
        return sprite;
    };
    FontIconSprite.prototype.delete = function () {
        Object.values(this.cache).forEach(function (texture) { return texture.destroy(); });
        this.cache = {};
    };
    return FontIconSprite;
}());
exports.FontIconSprite = FontIconSprite;
//# sourceMappingURL=FontIconSprite.js.map