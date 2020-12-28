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
exports.CircleAnnotationRenderer = void 0;
var PIXI = __importStar(require("pixi.js-legacy"));
var utils_1 = require("../utils");
var CircleAnnotationRenderer = /** @class */ (function () {
    function CircleAnnotationRenderer(renderer, circle) {
        this.circleGraphic = new PIXI.Graphics();
        this.renderer = renderer;
        this.circle = circle;
        this.renderer.annotationsBottomLayer.addChild(this.circleGraphic);
        this.update(circle);
    }
    CircleAnnotationRenderer.prototype.update = function (circle) {
        this.circle = circle;
        this.circleGraphic.clear();
        this.circleGraphic
            .beginFill(utils_1.colorToNumber(this.circle.style.color))
            .lineStyle(this.circle.style.stroke.width, utils_1.colorToNumber(this.circle.style.stroke.color))
            .drawCircle(this.circle.x, this.circle.y, this.circle.radius)
            .endFill();
        return this;
    };
    CircleAnnotationRenderer.prototype.delete = function () {
        this.circleGraphic.destroy();
    };
    return CircleAnnotationRenderer;
}());
exports.CircleAnnotationRenderer = CircleAnnotationRenderer;
//# sourceMappingURL=circle.js.map