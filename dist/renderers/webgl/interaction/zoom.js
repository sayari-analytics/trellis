"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zoom = void 0;
var __1 = require("..");
/**
 * deceleration logic is based largely on the excellent [pixi-viewport](https://github.com/davidfig/pixi-viewport)
 * specificially, the [Wheel Plugin](https://github.com/davidfig/pixi-viewport/blob/eb00aafebca6f9d9233a6b537d7d418616bb866e/src/plugins/wheel.js)
 */
var Zoom = /** @class */ (function () {
    function Zoom(renderer, onContainerWheel) {
        var _this = this;
        this.paused = false;
        this.minZoom = __1.RENDERER_OPTIONS.minZoom;
        this.maxZoom = __1.RENDERER_OPTIONS.maxZoom;
        this.wheel = function (e) {
            e.preventDefault();
            if (_this.paused) {
                return;
            }
            // let point = new PIXI.Point()
            // ;(this.renderer.app.renderer.plugins.interaction as PIXI.InteractionManager).mapPositionToPoint(
            //   point,
            //   // account for x/y pivot
            //   e.clientX - (this.renderer.width / 2),
            //   e.clientY - (this.renderer.height / 2)
            // )
            var step = -e.deltaY * (e.deltaMode ? 20 : 1) / 500;
            var change = Math.pow(2, 1.1 * step);
            var zoom = _this.renderer.zoom;
            if (step > 0 && zoom >= _this.maxZoom) {
                return;
            }
            else if (step < 0 && zoom <= _this.minZoom) {
                return;
            }
            var newZoom = Math.max(_this.minZoom, Math.min(_this.maxZoom, zoom * change));
            // let oldPoint = this.renderer.root.toLocal(point)
            // this.renderer.root.scale.set(newZoom)
            // const newPoint = this.renderer.root.toGlobal(oldPoint)
            // this.renderer.root.scale.set(zoom)
            _this.onContainerWheel(e, _this.renderer.x, _this.renderer.y, newZoom
            // this.renderer.x + point.x - newPoint.x,
            // this.renderer.y + point.y - newPoint.y,
            // newZoom
            );
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