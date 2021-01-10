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
exports.RectangleAnnotationRenderer = void 0;
var PIXI = __importStar(require("pixi.js-legacy"));
var utils_1 = require("../utils");
var RectangleAnnotationRenderer = /** @class */ (function () {
    function RectangleAnnotationRenderer(renderer, rectangle) {
        this.rectangleGraphic = new PIXI.Graphics();
        this.renderer = renderer;
        this.rectangle = rectangle;
        this.renderer.annotationsBottomLayer.addChild(this.rectangleGraphic);
        this.update(rectangle);
    }
    RectangleAnnotationRenderer.prototype.update = function (rectangle) {
        this.rectangle = rectangle;
        this.rectangleGraphic
            .clear()
            .beginFill(utils_1.colorToNumber(this.rectangle.style.color))
            .lineStyle(this.rectangle.style.stroke.width, utils_1.colorToNumber(this.rectangle.style.stroke.color))
            .drawRect(this.rectangle.x, this.rectangle.y, this.rectangle.width, this.rectangle.height)
            .endFill();
        return this;
    };
    RectangleAnnotationRenderer.prototype.delete = function () {
        this.rectangleGraphic.destroy();
    };
    return RectangleAnnotationRenderer;
}());
exports.RectangleAnnotationRenderer = RectangleAnnotationRenderer;
// export const RectangleAnnotationRenderer: AnnotationRendererConstructor<RectangleAnnotation> = (renderer: InternalRenderer<any, any>, annotation: RectangleAnnotation) => {
//   return new RectangleAnnotationRenderer(renderer, annotation)
// }
//# sourceMappingURL=rectangle.js.map