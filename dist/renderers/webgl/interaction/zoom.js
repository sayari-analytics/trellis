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
exports.Zoom = void 0;
var PIXI = __importStar(require("pixi.js"));
/**
 * zoom logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
var Zoom = /** @class */ (function () {
    function Zoom(renderer, onContainerWheel) {
        var _this = this;
        this.paused = false;
        this.wheel = function (e) {
            e.preventDefault();
            if (_this.paused) {
                return;
            }
            var step = -e.deltaY * (e.deltaMode ? 20 : 1) / 500;
            var change = Math.pow(2, 1.1 * step);
            var zoomStart = _this.renderer.zoom;
            var zoomEnd = Math.max(_this.renderer.minZoom, Math.min(_this.renderer.maxZoom, zoomStart * change));
            if ((step > 0 && zoomStart >= _this.renderer.maxZoom) ||
                (step < 0 && zoomStart <= _this.renderer.minZoom)) {
                return;
            }
            var globalStart = new PIXI.Point();
            _this.renderer.app.renderer.plugins.interaction.mapPositionToPoint(globalStart, e.clientX, e.clientY);
            var localStart = _this.renderer.root.toLocal(globalStart);
            _this.renderer.root.scale.set(zoomEnd);
            var globalEnd = _this.renderer.root.toGlobal(localStart);
            var rootX = _this.renderer.root.x + globalStart.x - globalEnd.x;
            var rootY = _this.renderer.root.y + globalStart.y - globalEnd.y;
            _this.renderer.root.scale.set(zoomStart);
            _this.renderer.wheelZoom = zoomEnd;
            _this.onContainerWheel(e, (rootX - (_this.renderer.width / 2)) / zoomEnd, (rootY - (_this.renderer.height / 2)) / zoomEnd, zoomEnd);
        };
        this.renderer = renderer;
        this.onContainerWheel = onContainerWheel;
    }
    Zoom.prototype.pause = function () {
        this.paused = true;
    };
    Zoom.prototype.resume = function () {
        this.paused = false;
    };
    return Zoom;
}());
exports.Zoom = Zoom;
//# sourceMappingURL=zoom.js.map